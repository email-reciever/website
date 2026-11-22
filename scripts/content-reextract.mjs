/**
 * Re-extract existing posts with the current per-source strategy.
 *
 * The parser learned source-aware extraction (`packages/consts/src/content-rules.ts`)
 * after most of the archive had already been saved with the old "convert the
 * whole RSS entry" behaviour. This script repairs posts in place by re-fetching
 * their canonical page, running the SAME extractor the Worker uses, and
 * translating with local headful Chrome (no API quota).
 *
 * Usage:
 *   node scripts/content-reextract.mjs --dry-run
 *   node scripts/content-reextract.mjs --author csstricks --limit 3
 *   node scripts/content-reextract.mjs --sources astro,csstricks,awsml --limit 2
 *
 * Network needs the usual proxy when run locally:
 *   NODE_USE_ENV_PROXY=1 node scripts/content-reextract.mjs ...
 */

import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { openLocalTranslator } from "./lib/local-translator.mjs";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const PARSER = path.join(ROOT, "cores/parser");
// Bundles live under node_modules so Biome/tsc never see generated code.
const CACHE = path.join(PARSER, "node_modules/.cache/reextract");
const EXTRACT_BUNDLE = path.join(CACHE, "extract.mjs");
const HTML2MD_BUNDLE = path.join(CACHE, "html2md.mjs");
const ESBUILD = path.join(PARSER, "node_modules/.bin/esbuild");
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
};

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const authorFilter = arg("author", "");
const sources = arg("sources", "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const limit = Number(arg("limit", 1));
const dryRun = process.argv.includes("--dry-run");
// Email-only sources have no re-fetchable source HTML (their origin_url is a
// tracking redirect or a homepage), so they are excluded unless asked for.
const includeEmail = process.argv.includes("--include-email");

function bundle(entry, out) {
  const result = spawnSync(
    ESBUILD,
    [
      entry,
      "--bundle",
      "--platform=node",
      "--format=esm",
      "--external:cheerio",
      `--outfile=${out}`,
    ],
    { cwd: ROOT, stdio: "pipe" },
  );
  if (result.status !== 0) throw new Error(`esbuild failed for ${entry}: ${result.stderr}`);
}

function splitFrontmatter(raw) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return { fm: {}, body: raw };
  return { fm: yaml.load(match[1]) || {}, body: raw.slice(match[0].length).trim() };
}

const fetchable = (url) =>
  /^https?:\/\//.test(url || "") && !/click\.|mailchi\.|buttondown|app\.github\.media/.test(url);

// Mirror the Worker: prefer the feed entry, and only hydrate from the live page
// for sources whose feed is a teaser. A live page alone is unreliable (bot
// checks, JS rendering) and must never silently replace good feed HTML.
const rssConfig = await readFile(path.join(ROOT, "packages/consts/src/rss.ts"), "utf8");
const FEEDS = Object.fromEntries(
  [...rssConfig.matchAll(/(\w+):\s*\{\s*feed:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
);
const { XMLParser } = require("fast-xml-parser");
const feedCache = new Map();
const normalizeUrl = (url) =>
  String(url || "")
    .replace(/\/$/, "")
    .replace(/^https?:\/\//, "");

async function feedHtml(author, url) {
  if (!FEEDS[author]) return null;
  if (!feedCache.has(author)) {
    const xml = await fetch(FEEDS[author], {
      headers: HEADERS,
      signal: AbortSignal.timeout(25_000),
    }).then((response) => response.text());
    const channel = new XMLParser().parse(xml)?.rss?.channel;
    const items = Array.isArray(channel?.item) ? channel.item : channel?.item ? [channel.item] : [];
    feedCache.set(author, items);
  }
  const item = feedCache
    .get(author)
    .find(
      (entry) =>
        normalizeUrl(entry.link) === normalizeUrl(url) ||
        normalizeUrl(entry.guid) === normalizeUrl(url),
    );
  return item ? String(item["content:encoded"] || item.description || "") : null;
}

async function main() {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(CACHE, { recursive: true });
  bundle("cores/parser/src/utils/extract.ts", EXTRACT_BUNDLE);
  bundle("cores/parser/src/utils/html2md.ts", HTML2MD_BUNDLE);
  const { extractHtml, cleanMarkdown, resolveHtml } = await import(EXTRACT_BUNDLE);
  const { html2md } = await import(HTML2MD_BUNDLE);

  // Walk the actual content tree, not manifest.json: a cron/manifest race can
  // leave stale manifest slugs whose files no longer exist.
  const { readdir } = await import("node:fs/promises");
  const authors = (await readdir(path.join(ROOT, "content"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const targets = [];
  for (const author of authors) {
    if (authorFilter && author !== authorFilter) continue;
    if (sources.length && !sources.includes(author)) continue;
    if (!includeEmail && !authorFilter && !sources.length && !FEEDS[author]) continue;
    const dir = path.join(ROOT, "content", author);
    const files = (await readdir(dir))
      .filter((file) => file.endsWith(".md"))
      .sort()
      .reverse();
    let taken = 0;
    for (const name of files) {
      if (taken >= limit) break;
      const file = path.join(dir, name);
      const raw = await readFile(file, "utf8");
      const { fm, body } = splitFrontmatter(raw);
      if (body.length < 120 || !fetchable(fm.origin_url)) continue;
      targets.push({ author, slug: name.replace(/\.md$/, ""), url: fm.origin_url, file, body });
      taken += 1;
    }
  }

  console.log(`re-extract targets: ${targets.length} (dry run: ${dryRun})`);
  if (!targets.length) return;
  const translator = dryRun ? null : await openLocalTranslator();
  let done = 0;
  try {
    for (const target of targets) {
      try {
        let baseHtml = await feedHtml(target.author, target.url);
        if (!baseHtml) {
          const response = await fetch(target.url, {
            headers: HEADERS,
            signal: AbortSignal.timeout(25_000),
          });
          if (!response.ok) {
            console.log(`  skip ${target.author}: HTTP ${response.status}`);
            continue;
          }
          baseHtml = await response.text();
        }
        // Same guard as the Worker: only teaser feeds get hydrated from the
        // canonical page; a thinner live page never replaces good feed HTML.
        const { html: resolved } = await resolveHtml(
          { guid: target.slug, title: "", link: target.url, html: baseHtml },
          target.author,
        );
        const html = extractHtml(resolved, target.author);
        const markdown = cleanMarkdown(html2md(html).md, target.author);
        if (markdown.length < 120) {
          console.log(`  skip ${target.author}: extracted body too short (${markdown.length})`);
          continue;
        }
        console.log(
          `  ${target.author}/${target.slug}: ${target.body.length} → ${markdown.length} chars`,
        );
        if (dryRun) continue;

        const translated = await translator.translateMarkdown(markdown);
        const { fm } = splitFrontmatter(await readFile(target.file, "utf8"));
        const nextFm = { ...fm, translated: true };
        delete nextFm.source_hash; // stale: extraction rules changed
        await writeFile(
          target.file,
          `---\n${yaml.dump(nextFm, { lineWidth: -1, noRefs: true }).trimEnd()}\n---\n\n${translated.markdown.trim()}\n`,
          "utf8",
        );
        done += 1;
      } catch (error) {
        console.log(`  fail ${target.author}/${target.slug}: ${String(error).slice(0, 120)}`);
      }
    }
  } finally {
    await translator?.close();
  }
  console.log(`re-extracted ${done} posts`);
}

try {
  await main();
} finally {
  await Promise.all([rm(EXTRACT_BUNDLE, { force: true }), rm(HTML2MD_BUNDLE, { force: true })]);
}
