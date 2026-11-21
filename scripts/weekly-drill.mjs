/**
 * Run this week's down-drill through the Worker (which holds BROWSERLESS_KEY),
 * save the discovered articles into content/weekly/**, and update the digest.
 *
 * Usage: node scripts/weekly-drill.mjs [2026-W47]
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const WEEK = process.argv[2] || "2026-W47";
const WORKER = process.env.WORKER_RSS_URL
  ? new URL(process.env.WORKER_RSS_URL).origin
  : "https://subscribe-email.jiangjiangjiangxi.workers.dev";

const digestPath = path.join(ROOT, "weekly", `${WEEK}.json`);
const manifestPath = path.join(ROOT, "manifest.json");
const digest = JSON.parse(await readFile(digestPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const urls = [...new Set(digest.highlights.map((post) => post.origin_url).filter(Boolean))].slice(
  0,
  5,
);
console.log(`drilling ${urls.length} source pages via ${WORKER}/weekly/drill`);

const response = await fetch(`${WORKER}/weekly/drill`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ urls }),
  signal: AbortSignal.timeout(300_000),
});
if (!response.ok) throw new Error(`drill endpoint ${response.status}: ${await response.text()}`);
const { items } = await response.json();

const saved = [];
const contentDir = path.join(ROOT, "content", "weekly");
await mkdir(contentDir, { recursive: true });

for (const item of items) {
  console.log(`  ${item.source} → ${item.links.length} links`);
  for (const link of item.links) {
    const slug = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const fm = {
      title: link.text,
      description: link.text,
      author: "weekly",
      date: new Date().toISOString(),
      origin_url: link.url,
      translated: true,
      avatar: "/media-source/others-ico.png",
      digest_week: WEEK,
    };
    const body = item.text.slice(0, 4000);
    await writeFile(
      path.join(contentDir, `${slug}.md`),
      `---\n${yaml.dump(fm, { lineWidth: -1, noRefs: true }).trimEnd()}\n---\n\n${body}\n`,
      "utf8",
    );
    manifest.posts.push({ ...fm, slug });
    saved.push({ title: link.text, url: link.url, excerpt: item.text.slice(0, 200) });
  }
}

digest.drilled = saved;
digest.source = "browserless";
digest.drilledAt = new Date().toISOString();
await writeFile(digestPath, `${JSON.stringify(digest, null, 2)}\n`, "utf8");
manifest.posts.sort((a, b) => (a.date < b.date ? 1 : -1));
await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
console.log(`saved ${saved.length} drilled articles for ${WEEK}`);
