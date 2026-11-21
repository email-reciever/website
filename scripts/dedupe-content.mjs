/**
 * Remove duplicate posts created when a backfill run and a cron run both
 * ingested the same source URL. Keeps the entry whose Markdown body is longer.
 *
 * Usage: node scripts/dedupe-content.mjs [--dry-run]
 */

import { readFile, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "manifest.json");
const dryRun = process.argv.includes("--dry-run");

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const groups = new Map();
for (const post of manifest.posts) {
  const url = String(post.origin_url || "")
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "");
  if (!url || url === "javascript:;") continue;
  const title = String(post.title || "")
    .trim()
    .toLowerCase();
  const key = `${post.author}::${url}::${title}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(post);
}

async function bodyLength(post) {
  try {
    const raw = await readFile(path.join(ROOT, "content", post.author, `${post.slug}.md`), "utf8");
    const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
    return (match ? raw.slice(match[0].length) : raw).trim().length;
  } catch {
    return 0;
  }
}

const remove = [];
for (const [key, posts] of groups) {
  if (posts.length < 2) continue;
  const scored = [];
  for (const post of posts) scored.push({ post, len: await bodyLength(post) });
  // Prefer a translated copy, then the longer body.
  scored.sort((a, b) => {
    const ta = a.post.translated === false ? 0 : 1;
    const tb = b.post.translated === false ? 0 : 1;
    return tb - ta || b.len - a.len;
  });
  console.log(`duplicate ${key}: ${scored.map((s) => `${s.post.slug}(${s.len})`).join(", ")}`);
  remove.push(...scored.slice(1).map((s) => s.post));
}

console.log(`removing ${remove.length} duplicates${dryRun ? " (dry run)" : ""}`);
if (!dryRun && remove.length) {
  const doomed = new Set(remove.map((p) => `${p.author}/${p.slug}`));
  for (const post of remove) {
    await unlink(path.join(ROOT, "content", post.author, `${post.slug}.md`)).catch(() => {});
  }
  manifest.posts = manifest.posts.filter((p) => !doomed.has(`${p.author}/${p.slug}`));
  await writeFile(MANIFEST, `${JSON.stringify(manifest)}\n`, "utf8");
}
