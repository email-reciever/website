/**
 * Weekly digest generator.
 *
 * Without BROWSERLESS_TOKEN it builds an extractive digest from manifest.json
 * and writes weekly/<week>.json. With a token it also connects to Browserless
 * free CDP, scans each highlighted post's source page for outbound articles,
 * and saves the down-drilled articles into content/weekly/** + manifest.
 *
 * Browserless free: 1,000 units/month, 2 concurrent browsers, 2 min session.
 * Note: its cloud browsers do not include Chrome's on-device Gemini Nano, so
 * this script uses CDP for scanning only; summaries stay extractive.
 *
 * Usage:
 *   node scripts/weekly-digest.mjs
 *   BROWSERLESS_TOKEN=xxx node scripts/weekly-digest.mjs --drill
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "manifest.json");
const TOKEN = process.env.BROWSERLESS_KEY || process.env.BROWSERLESS_TOKEN || "";
const DRILL = process.argv.includes("--drill") && Boolean(TOKEN);
const pad = (n, len = 2) => String(n).padStart(len, "0");

function weekInfo() {
  const now = new Date();
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const day = (local.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day),
  );
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const year = monday.getUTCFullYear();
  const weekNo = Math.ceil((monday.getTime() - Date.UTC(year, 0, 1)) / (7 * 86400000)) + 1;
  return {
    key: `${year}-W${pad(weekNo)}`,
    label: `${monday.getUTCFullYear()}/${pad(monday.getUTCMonth() + 1)}/${pad(monday.getUTCDate())} — ${sunday.getUTCFullYear()}/${pad(sunday.getUTCMonth() + 1)}/${pad(sunday.getUTCDate())} 20:00`,
    start: new Date(monday.getTime() - 8 * 3600000).toISOString(),
    end: new Date(sunday.getTime() + 12 * 3600000).toISOString(),
  };
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "how",
  "what",
  "why",
  "new",
  "use",
  "guide",
  "about",
]);
function words(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

function connectCdp() {
  const url = `wss://production-sfo.browserless.io/chromium?token=${TOKEN}&timeout=110000`;
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      const timer = setTimeout(() => {
        pending.delete(i);
        reject(new Error(`CDP timeout ${method}`));
      }, 60_000);
      pending.set(i, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      const payload = { id: i, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
  return { ws, send };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const week = weekInfo();
  const inWindow = manifest.posts.filter((post) => {
    const t = new Date(post.date).getTime();
    return t >= new Date(week.start).getTime() && t <= new Date(week.end).getTime();
  });

  const seen = new Set();
  const unique = inWindow.filter((post) => {
    const key = String(post.title).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const stops = new Map();
  const kw = new Map();
  for (const post of unique) {
    stops.set(post.author, (stops.get(post.author) ?? 0) + 1);
    for (const word of words(post.title)) kw.set(word, (kw.get(word) ?? 0) + 1);
  }

  const drilled = [];
  if (DRILL) {
    const targets = unique.slice(0, 4);
    const cdp = connectCdp();
    try {
      await new Promise((resolve, reject) => {
        cdp.ws.onopen = resolve;
        cdp.ws.onerror = reject;
      });
      const created = await cdp.send("Target.createTarget", { url: "about:blank" });
      const attached = await cdp.send("Target.attachToTarget", {
        targetId: created.result.targetId,
        flatten: true,
      });
      const session = attached.result.sessionId;
      await cdp.send("Page.enable", {}, session);

      for (const post of targets) {
        if (!post.origin_url || !post.origin_url.startsWith("http")) continue;
        await cdp.send("Page.navigate", { url: post.origin_url }, session);
        await new Promise((r) => setTimeout(r, 2500));
        const result = await cdp.send(
          "Runtime.evaluate",
          {
            expression: `JSON.stringify({
              text: document.body.innerText.slice(0, 12000),
              links: [...document.querySelectorAll('a[href^="http"]')]
                .map(a => ({ href: a.href, text: (a.innerText||'').trim() }))
                .filter(x => x.text.length > 12 && !x.href.includes(location.hostname))
                .slice(0, 3)
            })`,
            returnByValue: true,
          },
          session,
        );
        if (result.result?.exceptionDetails) continue;
        const data = JSON.parse(result.result.result.value || "{}");
        for (const link of data.links || []) {
          const slug = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
          const file = path.join(ROOT, "content", "weekly", `${slug}.md`);
          const fm = {
            title: link.text.slice(0, 160),
            description: link.text.slice(0, 160),
            author: "weekly",
            date: new Date().toISOString(),
            origin_url: link.href,
            translated: true,
            avatar: "/media-source/others-ico.png",
          };
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(
            file,
            `---\n${yaml.dump(fm, { lineWidth: -1, noRefs: true }).trimEnd()}\n---\n\n${String(data.text).slice(0, 4000)}\n`,
            "utf8",
          );
          drilled.push({
            title: fm.title,
            url: link.href,
            excerpt: String(data.text).slice(0, 200),
          });
          manifest.posts.push({ ...fm, slug });
          if (drilled.length >= 8) break;
        }
        if (drilled.length >= 8) break;
      }
    } finally {
      cdp.ws.close();
    }
  }

  const digest = {
    week,
    generatedAt: new Date().toISOString(),
    total: unique.length,
    sources: [...stops.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([author, count]) => ({ author, count })),
    keywords: [...kw.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([word, count]) => ({ word, count })),
    highlights: unique.slice(0, 6),
    recommendations: unique.slice(0, 12),
    drilled,
    source: DRILL ? "browserless" : "archive",
  };

  const outDir = path.join(ROOT, "weekly");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, `${week.key}.json`),
    `${JSON.stringify(digest, null, 2)}\n`,
    "utf8",
  );
  if (DRILL && drilled.length) {
    manifest.posts.sort((a, b) => (a.date < b.date ? 1 : -1));
    await writeFile(MANIFEST, `${JSON.stringify(manifest)}\n`, "utf8");
  }
  console.log(
    `week ${week.key}: ${unique.length} posts, ${drilled.length} drilled (${digest.source})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
