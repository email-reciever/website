/**
 * Keyless online TTS for environments without macOS `say`.
 *
 * Uses the Google Translate web TTS endpoint (`client=tw-ob`), which is not a
 * documented API and can be rate-limited from datacenter IPs — hence the
 * caller must treat failure as a normal outcome and fall back to the GitHub
 * macOS runner (which has native `say`). Returns concatenated MP3 bytes.
 */
import { logger } from "./logger";

const ENDPOINT = "https://translate.google.com/translate_tts";
const CHUNK_CHARS = 180;
const TIMEOUT_MS = 20_000;

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  Referer: "https://translate.google.com/",
};

function chunkText(text: string): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const part of text.split(/(?<=[。！？.!?\n])/)) {
    if (!part) continue;
    if (current.length + part.length > CHUNK_CHARS && current) {
      pieces.push(current);
      current = part;
    } else {
      current += part;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

function concatMp3(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

/** Synthesize Chinese speech. Throws when the keyless endpoint is unavailable. */
export async function synthesize(text: string, env: Env): Promise<Uint8Array> {
  const clean = text.trim().slice(0, 4000);
  if (!clean) throw new Error("empty TTS input");

  const chunks: Uint8Array[] = [];
  for (const piece of chunkText(clean)) {
    const params = new URLSearchParams({
      ie: "UTF-8",
      q: piece,
      tl: "zh-CN",
      client: "tw-ob",
    });
    const response = await fetch(`${ENDPOINT}?${params}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`online TTS responded ${response.status}`);
    const body = new Uint8Array(await response.arrayBuffer());
    if (!body.length) throw new Error("online TTS returned empty audio");
    chunks.push(body);
  }

  logger(env, `online TTS: ${chunks.length} chunks, ${concatMp3(chunks).length} bytes`);
  return concatMp3(chunks);
}
