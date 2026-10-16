/**
 * Structure-preserving markdown translation with a provider chain.
 *
 * Two interchangeable providers, driven by the `TR_PROVIDER` env var:
 *
 * - `google` (default, non-AI): the translate.googleapis.com `gtx` endpoint —
 *   the same engine the old pipeline used, minus the free-proxy detour that
 *   made it unstable. Called directly from the worker, keyless.
 * - `ai`: Workers AI instruct LLM (`TR_MODEL` to override), more faithful at
 *   keeping markdown structure, but depends on the Workers AI service.
 *
 * Whichever provider is chosen, the other one acts as automatic fallback per
 * chunk. Both run behind the same machinery:
 *
 * 1. md() has already replaced every fenced code block with a positional
 *    placeholder token like <P|12-5-99/> (see remarks/remark-code-plugin.ts)
 * 2. this module splits the protected markdown into paragraph-boundary
 *    chunks sized for the active provider
 * 3. every chunk is validated: the multiset of placeholder tokens must be
 *    identical before and after translation; mismatched chunks are retried
 * 4. if all attempts fail, translate() throws and md() keeps the original
 *    content with translated=false
 */
import { logger } from "./logger";

type Provider = "google" | "ai";

const DEFAULT_PROVIDER: Provider = "google";
/** gtx GET URLs must stay short; the AI provider can take bigger chunks */
const GOOGLE_CHUNK_CHARS = 1200;
const AI_CHUNK_CHARS = 4000;
const CHUNK_TIMEOUT_MS = 120_000;
/** attempts per provider: primary first (retry once), then the fallback */
const THROTTLE_MS = 300;

const MARKER_RE = /<P\|\d+-\d+-\d+\/>/g;

const SYSTEM_PROMPT = `You are a professional translator for developer newsletters. Translate the user's markdown from English into Simplified Chinese.

STRICT RULES:
1. Translate ONLY natural-language prose. Keep product names, technical terms, jargon and code identifiers in English where that is the norm in Chinese developer writing.
2. Preserve the markdown structure exactly: headings, lists, tables, emphasis, links, images, blockquotes and raw HTML tags must survive untouched. Never merge or reorder blocks.
3. Fenced blocks that look like <P|12-5-99/> are placeholders standing in for code blocks. Copy each one character-for-character, fenced exactly as given, on its own line. NEVER translate, duplicate, merge or drop them.
4. Do not add commentary, explanations, notes or summaries.
5. Respond with the translated markdown ONLY.`;

const GTX_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
};

function splitIntoChunks(markdown: string, limit: number): string[] {
  if (markdown.length <= limit) {
    return [markdown];
  }
  const blocks = markdown.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (current && `${current}\n\n${block}`.length > limit) {
      chunks.push(current);
      current = block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function markersOf(text: string): string[] {
  return [...text.matchAll(MARKER_RE)].map((m) => m[0]).sort();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("translate chunk timeout")), ms),
    ),
  ]);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** keyless google translate endpoint; returns sentence segments joined back together */
async function googleTranslate(chunk: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(chunk)}`;
  const data = (await withTimeout(
    fetch(url, { headers: GTX_HEADERS }).then((response) => {
      if (!response.ok) throw new Error(`gtx endpoint responded ${response.status}`);
      return response.json();
    }),
    CHUNK_TIMEOUT_MS,
  )) as [Array<[string]> | undefined];
  const translated = data?.[0]?.map((segment) => segment?.[0] ?? "").join("") ?? "";
  if (!translated.trim()) throw new Error("gtx endpoint returned empty translation");
  return translated;
}

/** Workers AI instruct LLM translation */
async function aiTranslate(chunk: string, env: Env): Promise<string> {
  const model = env.TR_MODEL ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const result = (await withTimeout(
    env.AI.run(model, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: chunk },
      ],
      max_tokens: 6144,
    }),
    CHUNK_TIMEOUT_MS,
  )) as { response?: string };

  let text = result?.response ?? "";
  // some reasoning-capable models emit traces inside special blocks — strip them
  const traceStart = text.indexOf("<think>");
  const traceEnd = text.indexOf("</think>");
  if (traceStart !== -1 && traceEnd > traceStart) {
    text = text.slice(traceEnd + 1);
  }
  if (!text.trim()) throw new Error("workers ai returned empty translation");
  return text.trim();
}

async function translateChunk(
  chunk: string,
  chain: [Provider, Provider],
  env: Env,
): Promise<string> {
  const expected = markersOf(chunk).join("\n");
  // primary (retry once) → fallback (retry once)
  const attempts: Provider[] = [chain[0], chain[0], chain[1], chain[1]];

  for (const provider of attempts) {
    try {
      const translated =
        provider === "google" ? await googleTranslate(chunk) : await aiTranslate(chunk, env);
      if (markersOf(translated).join("\n") === expected) {
        return translated;
      }
      logger(env, `translate marker mismatch (${provider})`);
    } catch (e) {
      logger(env, `translate provider failed (${provider})`, e);
    }
    // be polite to the keyless endpoint
    await sleep(THROTTLE_MS);
  }

  throw new Error(`translation failed on all providers for chunk (${expected.length} markers)`);
}

/**
 * Translate protected markdown into Chinese.
 * Throws on failure — md() treats any throw as "translation unavailable"
 * and keeps the original content (translated=false).
 */
export async function translate(content: string, env: Env): Promise<string> {
  if (!content.trim()) {
    return content;
  }

  const primary: Provider = env.TR_PROVIDER === "ai" ? "ai" : DEFAULT_PROVIDER;
  const chain: [Provider, Provider] = primary === "ai" ? ["ai", "google"] : ["google", "ai"];
  const chunkSize = chain.includes("google") ? GOOGLE_CHUNK_CHARS : AI_CHUNK_CHARS;

  const chunks = splitIntoChunks(content, chunkSize);
  const translated: string[] = [];
  // sequential: keeps rate limits happy and memory flat
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, chain, env));
  }
  return translated.join("\n\n");
}
