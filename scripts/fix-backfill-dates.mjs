/**
 * Repair dates for locally backfilled posts.
 *
 * Local backfill used `new Date()` as the frontmatter date when the source page
 * had no machine-readable meta date, so those posts carry 2026-11-21 (execution
 * time) instead of their real publish date. This script fetches each source
 * page, extracts a human/machine date, and rewrites frontmatter date + slug.
 *
 * Usage: node scripts/fix-backfill-dates.mjs [--limit N] [--dry-run]
 */

import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { CRAWL_HEADERS } from "./lib/sources.mjs";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "manifest.json");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const limit = Number(arg("limit", 5000));
const dryRun = process.argv.includes("--dry-run");

const pad = (n, len = 2) => String(n).padStart(len, "0");
const slugFrom = (date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}_${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}_${pad(date.getUTCMilliseconds(), 3)}`;

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";

/** Parse human dates in UTC — `new Date('July 6, 2020')` shifts a day in +08. */
function parseDateUTC(value) {
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return new Date(text);
  const numeric = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (numeric) {
    return new Date(Date.UTC(Number(numeric[3]), Number(numeric[1]) - 1, Number(numeric[2])));
  }
  return new Date(`${text} UTC`);
}
const DATE_PATTERNS = [
  /property=["']article:published_time["']\s+content=["']([^"']+)["']/i,
  /content=["']([^"']+)["']\s+property=["']article:published_time["']/i,
  /"datePublished"\s*:\s*"([^"]+)"/i,
  /<time[^>]+datetime=["']([^"']+)["']/i,
  new RegExp(`\\b(?:${MONTHS})\\s+\\d{1,2},?\\s+20\\d{2}\\b`, "i"),
  /\b\d{1,2}\/\d{1,2}\/20\d{2}\b/,
  /\b20\d{2}-\d{2}-\d{2}\b/,
];

function extractDate(html, title = "") {
  for (const re of DATE_PATTERNS) {
    const found = re.exec(html) || re.exec(title);
    if (!found) continue;
    const value = found[1] || found[0];
    const parsed = parseDateUTC(value);
    if (!Number.isNaN(parsed.getTime()) && parsed.getUTCFullYear() >= 2000) {
      return parsed;
    }
  }
  return null;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: CRAWL_HEADERS,
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.text();
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const candidates = manifest.posts.filter(
  (p) =>
    /^https?:\/\//.test(p.origin_url || "") &&
    (p.date.startsWith("2026-11-21") || p.date.endsWith("T16:00:00.000Z")),
);
console.log(`candidates: ${candidates.length}, limit ${limit}${dryRun ? " (dry run)" : ""}`);

let fixed = 0;
let failed = 0;
let index = 0;
const concurrency = 8;

async function worker() {
  while (index < candidates.length && index < limit) {
    const post = candidates[index++];
    try {
      const html = await fetchHtml(post.origin_url);
      const parsed = extractDate(html, post.title || "");
      if (!parsed) {
        failed += 1;
        continue;
      }
      const newDate = parsed.toISOString();
      if (newDate === post.date) continue;
      const newSlug = slugFrom(parsed);
      const file = path.join(ROOT, "content", post.author, `${post.slug}.md`);
      const raw = await readFile(file, "utf8");
      const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
      if (!match) continue;
      const fm = yaml.load(match[1]) || {};
      const body = raw.slice(match[0].length);
      const nextFm = { ...fm, date: newDate };
      const fmYaml = yaml.dump(nextFm, { lineWidth: -1, noRefs: true }).trimEnd();
      const output = `---\n${fmYaml}\n---\n\n${body.trim()}\n`;

      if (!dryRun) {
        let target = path.join(ROOT, "content", post.author, `${newSlug}.md`);
        try {
          await stat(target);
          target = path.join(ROOT, "content", post.author, `${newSlug}_${pad(fixed % 1000, 3)}.md`);
        } catch {
          /* free */
        }
        const finalSlug = path.basename(target, ".md");
        await rename(file, target);
        await writeFile(target, output, "utf8");
        post.date = newDate;
        post.slug = finalSlug;
      }
      fixed += 1;
    } catch {
      failed += 1;
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

if (!dryRun && fixed) {
  await writeFile(MANIFEST, `${JSON.stringify(manifest)}\n`, "utf8");
}
console.log(`fixed ${fixed} dates, failed ${failed}${dryRun ? " (dry run)" : ""}`);
