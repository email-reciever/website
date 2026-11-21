/**
 * Local headful-Chrome translator using Chrome's built-in Translator API.
 *
 * Requires this Mac to stay awake; it cannot run in Cloudflare Workers because
 * headless Chrome does not expose `Translator`. Free and unmetered.
 *
 * Markdown is translated LINE BY LINE: Chrome preserves list markers, headings
 * and URLs when translating a single line, but collapses newlines if given a
 * whole document. Non-prose tokens (code placeholders, inline code, links,
 * images, URLs, HTML tags, leading markers) are swapped for `[N]` tokens, which
 * were verified to survive translation unchanged, then restored.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.TRANSLATOR_PORT || 9361);
const PROFILE =
  process.env.TRANSLATOR_PROFILE ||
  path.join(process.env.TMPDIR || "/tmp", "email-reciever-translator-profile");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.onopen = resolve;
          ws.onerror = reject;
        });
        return ws;
      }
    } catch {
      /* not ready */
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools did not become ready");
}

/** Pattern of fragments that must be kept byte-for-byte. */
const PROTECTED = [
  /<P\|\d+-\d+-\d+\/>/g, // code-block placeholders from the parser
  /`[^`\n]+`/g, // inline code
  /!\[[^\]]*\]\([^)\s]+\)/g, // images
  /\[[^\]]*\]\([^)\s]+\)/g, // links
  /https?:\/\/[^\s)]+/g, // bare URLs
  /<[A-Za-z/][^>]*>/g, // raw HTML tags
];
const LEAD_RE = /^(\s*(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+|>\s*))/;

function protectLine(line) {
  const stash = [];
  let out = line;
  for (const re of PROTECTED) {
    out = out.replace(re, (match) => {
      const token = `[${stash.length}]`;
      stash.push(match);
      return token;
    });
  }
  const lead = LEAD_RE.exec(out);
  if (lead) {
    const token = `[${stash.length}]`;
    stash.push(lead[1]);
    out = token + out.slice(lead[1].length);
  }
  return { out, stash };
}

function restoreLine(text, stash) {
  return text.replace(/\[(\d+)\]/g, (match, digits) => {
    const index = Number(digits);
    return stash[index] ?? match;
  });
}

export async function openLocalTranslator() {
  await mkdir(PROFILE, { recursive: true });
  const proc = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${PROFILE}`,
      "https://example.com",
    ],
    { stdio: "ignore" },
  );

  const ws = await connect();
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      const timer = setTimeout(() => {
        pending.delete(i);
        reject(new Error(`CDP timeout: ${method}`));
      }, 60_000);
      pending.set(i, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: "https://example.com" });
  await sleep(3500);

  // A real click satisfies the user-gesture requirement while the language
  // pack downloads; after the first run the profile keeps it cached. The tab
  // must be frontmost or the synthesized click is not treated as activation.
  await send("Page.bringToFront");
  await sleep(400);
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: 120,
    y: 120,
    button: "left",
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: 120,
    y: 120,
    button: "left",
    clickCount: 1,
  });

  const init = await send("Runtime.evaluate", {
    expression: `(async () => {
        const options = { sourceLanguage: 'en', targetLanguage: 'zh' };
        const availability = await Translator.availability(options);
        window.__tr = await Translator.create(options);
        return { availability };
      })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (init.result?.exceptionDetails) {
    throw new Error(`Translator init failed: ${JSON.stringify(init.result.exceptionDetails)}`);
  }

  /** split a long line at whitespace, never cutting a `[N]` protection token */
  function piecesForTranslation(text, limit = 1400) {
    const raw = text.split(/(\s+)/);
    const pieces = [];
    let current = "";
    for (const part of raw) {
      if (!part) continue;
      if (current && current.length + part.length > limit) {
        pieces.push(current);
        current = part;
      } else {
        current += part;
      }
    }
    if (current) pieces.push(current);
    return pieces;
  }

  async function translateLine(line) {
    if (!line.trim()) return line;
    const { out, stash } = protectLine(line);
    const proseOnly = out.replace(/\[\d+\]/g, "").trim();
    if (!proseOnly) return line;

    const done = [];
    for (const piece of piecesForTranslation(out)) {
      if (!piece.trim()) {
        done.push(piece);
        continue;
      }
      const res = await send("Runtime.evaluate", {
        expression: `window.__tr.translate(${JSON.stringify(piece)})`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (res.result?.exceptionDetails) throw new Error("line translation failed");
      const translated = res.result?.result?.value;
      done.push(typeof translated === "string" ? translated : piece);
    }
    return restoreLine(done.join(""), stash);
  }

  async function translateMarkdown(markdown) {
    const lines = markdown.split("\n");
    const result = [];
    let inFence = false;
    let translatedCount = 0;
    for (const line of lines) {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        result.push(line);
        continue;
      }
      if (inFence) {
        result.push(line);
        continue;
      }
      const done = await translateLine(line);
      if (done !== line) translatedCount += 1;
      result.push(done);
    }
    return { markdown: result.join("\n"), translatedCount };
  }

  return {
    availability: init.result?.result?.value?.availability,
    translateLine,
    translateMarkdown,
    async close() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      proc.kill("SIGTERM");
    },
  };
}
