/**
 * Rename content files to the timestamp encoded in their frontmatter `date`.
 *
 * Historical backfill initially used the execution time as the slug; the
 * project convention is `YYYY-MM-DD_HH-mm-ss_SSS` derived from the article's
 * own publish date. This script renames those files and updates manifest slugs.
 *
 * Usage: node scripts/normalize-slugs.mjs [--dry-run]
 */

import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "manifest.json");
const dryRun = process.argv.includes("--dry-run");

const pad = (n, len = 2) => String(n).padStart(len, "0");
function slugFromDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}_${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}_${pad(date.getUTCMilliseconds(), 3)}`;
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const byKey = new Map(manifest.posts.map((p) => [`${p.author}/${p.slug}`, p]));
const renames = [];

for (const author of await readdir(path.join(ROOT, "content"))) {
  const dir = path.join(ROOT, "content", author);
  if (!(await stat(dir)).isDirectory()) continue;
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".md")) continue;
    const currentSlug = file.slice(0, -3);
    const filePath = path.join(dir, file);
    const raw = await readFile(filePath, "utf8");
    const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
    const fm = match ? yaml.load(match[1]) || {} : {};
    const desired = slugFromDate(fm.date);
    if (!desired || desired === currentSlug) continue;
    let target = path.join(dir, `${desired}.md`);
    let finalSlug = desired;
    let suffix = 0;
    while (true) {
      try {
        await stat(target);
      } catch {
        break;
      }
      suffix += 1;
      finalSlug = `${desired}_${pad(suffix, 3)}`;
      target = path.join(dir, `${finalSlug}.md`);
    }
    renames.push({ author, from: currentSlug, to: finalSlug, filePath, target });
  }
}

console.log(`renames: ${renames.length}${dryRun ? " (dry run)" : ""}`);
for (const r of renames.slice(0, 10)) console.log(`  ${r.author}/${r.from} → ${r.to}`);

if (!dryRun) {
  for (const r of renames) {
    await rename(r.filePath, r.target);
    const entry = byKey.get(`${r.author}/${r.from}`);
    if (entry) entry.slug = r.to;
  }
  await writeFile(MANIFEST, `${JSON.stringify(manifest)}\n`, "utf8");
  console.log(`renamed ${renames.length} files and updated manifest`);
}
