/**
 * Structure-preserving markdown translation with a provider chain.
 *
 * - `mymemory` (default, keyless): api.mymemory.translated.net — 5k chars/day
 *   anonymous, 50k with the `de` email param, ~480 bytes per request. It keeps
 *   markdown links/emphasis and our <P|.../> code placeholders intact.
 * - `ai`: Workers AI instruct LLM (`TR_MODEL`), large chunks but a limited free
 *   neuron allocation.
 * - `google`: the keyless gtx endpoint; often 429 from datacenter IPs.
 *
 * Whichever provider is primary, the others are fallbacks per chunk. Every
 * chunk is validated: the multiset of placeholder tokens must match, otherwise
 * the next provider is tried. If all fail, md() keeps the original with
 * translated=false.
 */
import { logger } from "./logger";

type Provider = "mymemory" | "ai" | "google";

const DEFAULT_PROVIDER: Provider = "mymemory";
/** outer chunk sizes; MyMemory splits its chunks into small HTTP requests */
const CHUNK_CHARS: Record<Provider, number> = { mymemory: 1200, ai: 4000, google: 1200 };
const MYMEMORY_REQUEST_CHARS = 420;
const CHUNK_TIMEOUT_MS = 45_000;
const THROTTLE_MS = 300;
const MYMEMORY_THROTTLE_MS = 200;
/** Workers free plan: 50 subrequests per invocation. Keep translation under it. */
const MAX_TRANSLATE_REQUESTS = 36;

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
  if (markdown.length <= limit) return [markdown];
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
  if (current) chunks.push(current);
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

/** keyless, quota-friendly provider; sends many small GETs per outer chunk */
async function myMemoryTranslate(chunk: string, env: Env, budget: { used: number }) {
  if (MARKER_RE.test(chunk)) {
    // A split could cut a code placeholder — let the LLM providers handle it.
    MARKER_RE.lastIndex = 0;
    throw new Error("mymemory skipped: chunk contains code placeholders");
  }
  MARKER_RE.lastIndex = 0;

  const pieces: string[] = [];
  for (let i = 0; i < chunk.length; i += MYMEMORY_REQUEST_CHARS) {
    pieces.push(chunk.slice(i, i + MYMEMORY_REQUEST_CHARS));
  }

  const translated: string[] = [];
  for (const piece of pieces) {
    if (budget.used >= MAX_TRANSLATE_REQUESTS) {
      throw new Error("translation request budget exhausted");
    }
    budget.used += 1;
    const params = new URLSearchParams({ q: piece, langpair: "en|zh-CN" });
    if (env.MYMEMORY_EMAIL) params.set("de", env.MYMEMORY_EMAIL);
    const data = (await withTimeout(
      fetch(`https://api.mymemory.translated.net/get?${params}`, { headers: GTX_HEADERS }).then(
        (response) => {
          if (!response.ok) throw new Error(`mymemory responded ${response.status}`);
          return response.json();
        },
      ),
      CHUNK_TIMEOUT_MS,
    )) as {
      responseStatus?: number;
      quotaFinished?: boolean;
      responseData?: { translatedText?: string };
      responseDetails?: string;
    };
    const text = data?.responseData?.translatedText?.trim();
    if (
      data?.responseStatus !== 200 ||
      data?.quotaFinished ||
      !text ||
      text.toLowerCase() === piece.toLowerCase()
    ) {
      throw new Error(`mymemory failed: ${data?.responseDetails ?? "empty/quota"}`);
    }
    translated.push(text);
    await sleep(MYMEMORY_THROTTLE_MS);
  }
  return translated.join("");
}

/** keyless google gtx endpoint (often rate-limited from datacenter IPs) */
async function googleTranslate(chunk: string, budget: { used: number }) {
  if (budget.used >= MAX_TRANSLATE_REQUESTS)
    throw new Error("translation request budget exhausted");
  budget.used += 1;
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
async function aiTranslate(chunk: string, env: Env, budget: { used: number }) {
  if (budget.used >= MAX_TRANSLATE_REQUESTS)
    throw new Error("translation request budget exhausted");
  budget.used += 1;
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
  const traceStart = text.indexOf("<think>");
  const traceEnd = text.indexOf("</think>");
  if (traceStart !== -1 && traceEnd > traceStart) {
    text = text.slice(traceEnd + 1);
  }
  if (!text.trim()) throw new Error("workers ai returned empty translation");
  return text.trim();
}

async function providerTranslate(
  provider: Provider,
  chunk: string,
  env: Env,
  budget: { used: number },
): Promise<string> {
  switch (provider) {
    case "mymemory":
      return myMemoryTranslate(chunk, env, budget);
    case "google":
      return googleTranslate(chunk, budget);
    case "ai":
      return aiTranslate(chunk, env, budget);
  }
}

async function translateChunk(
  chunk: string,
  chain: Provider[],
  env: Env,
  budget: { used: number },
): Promise<string> {
  const expected = markersOf(chunk).join("\n");
  for (const provider of chain) {
    try {
      const translated = await providerTranslate(provider, chunk, env, budget);
      if (markersOf(translated).join("\n") === expected) return translated;
      logger(env, `translate marker mismatch (${provider})`);
    } catch (e) {
      logger(env, `translate provider failed (${provider})`, e);
    }
    await sleep(THROTTLE_MS);
  }
  throw new Error(`translation failed on all providers for chunk (${expected.length} markers)`);
}

/** Translate protected markdown into Chinese. Throws on failure — md() keeps
 * the original content with translated=false. */
export async function translate(content: string, env: Env): Promise<string> {
  if (!content.trim()) return content;

  const primary = (env.TR_PROVIDER as Provider | undefined) ?? DEFAULT_PROVIDER;
  const chain: Provider[] =
    primary === "ai"
      ? ["ai", "mymemory", "google"]
      : primary === "google"
        ? ["google", "mymemory", "ai"]
        : ["mymemory", "ai", "google"];

  const chunks = splitIntoChunks(content, CHUNK_CHARS[primary]);
  const budget = { used: 0 };
  const translated: string[] = [];
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, chain, env, budget));
  }
  return translated.join("\n\n");
}
