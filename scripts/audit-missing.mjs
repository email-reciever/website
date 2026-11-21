/**
 * Accurate audit of content that exists in our sources but not in the archive.
 *
 * The old "missing" number only compared the handful of items still present in
 * each current RSS feed, which massively under-reported history (reactdigest,
 * for example, exposes only 5 feed items but has 61 missing issues in its
 * sequence). This script also checks sequential issue URLs and archive pages.
 *
 * Usage: node scripts/audit-missing.mjs [--out scripts/out/missing-report.json]
 */

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { ARCHIVES, CRAWL_HEADERS, FEEDS, ISSUE_SOURCES } from "./lib/sources.mjs";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "manifest.json");
const outIndex = process.argv.indexOf("--out");
const OUT =
  outIndex >= 0 && process.argv[outIndex + 1]
    ? process.argv[outIndex + 1]
    : path.join(ROOT, "scripts/out/missing-report.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url) {
  const response = await fetch(url, { headers: CRAWL_HEADERS });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

const normalize = (value) =>
  String(value || "")
    .trim()
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

const decodeEntities = (text) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

function parseFeed(xml) {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  return blocks.map((block) => {
    const pick = (tag) => {
      const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
      return match ? decodeEntities(match[1]) : "";
    };
    return { title: pick("title"), link: pick("link"), guid: pick("guid"), date: pick("pubDate") };
  });
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const posts = manifest.posts ?? [];
const knownUrls = new Set(posts.map((p) => normalize(p.origin_url)));
const knownTitles = new Set(posts.map((p) => normalize(p.title)));

// ConvertKit / Mailchimp tracking links carry the real destination as a base64
// path segment, so decode those too before deciding an item is missing.
const decodedOrigins = new Set();
for (const post of posts) {
  for (const segment of String(post.origin_url || "").split(/[/?=&]/)) {
    if (segment.length < 12) continue;
    try {
      const decoded = Buffer.from(segment, "base64").toString("utf8");
      if (decoded.startsWith("http")) decodedOrigins.add(normalize(decoded));
    } catch {
      /* not base64 */
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  sources: {},
  totals: { feedMissing: 0, issueMissing: 0, archiveMissing: 0, emptyBodies: 0 },
};

for (const [key, url] of Object.entries(FEEDS)) {
  try {
    const items = parseFeed(await fetchText(url));
    const missing = items.filter(
      (item) => !knownUrls.has(normalize(item.link)) && !knownTitles.has(normalize(item.title)),
    );
    report.sources[key] = {
      ...(report.sources[key] || {}),
      feedItems: items.length,
      feedMissing: missing.length,
      feedCandidates: missing.map((i) => ({ url: i.link, title: i.title, date: i.date })),
    };
    report.totals.feedMissing += missing.length;
  } catch (error) {
    report.sources[key] = { ...(report.sources[key] || {}), feedError: String(error) };
  }
  await sleep(200);
}

for (const [key, conf] of Object.entries(ISSUE_SOURCES)) {
  const present = new Set();
  for (const post of posts) {
    if (post.author !== key) continue;
    const match = conf.pattern.exec(post.origin_url || "");
    if (match) present.add(Number(match[1]));
  }
  if (!present.size) continue;
  const min = Math.min(...present);
  const max = Math.max(...present);
  const missing = [];
  for (let n = min; n <= max; n += conf.step) {
    if (!present.has(n)) missing.push({ number: n, url: conf.url(n) });
  }
  report.sources[key] = {
    ...(report.sources[key] || {}),
    issuesPresent: present.size,
    issueRange: `${min}-${max}`,
    issueMissing: missing.length,
    issueCandidates: missing,
  };
  report.totals.issueMissing += missing.length;
}

for (const [key, conf] of Object.entries(ARCHIVES)) {
  try {
    const pages = [conf.list];
    if (conf.page && conf.maxPages) {
      for (let n = 2; n <= conf.maxPages; n++) pages.push(conf.page(n));
    }
    const html = (await Promise.all(pages.map((p) => fetchText(p).catch(() => "")))).join("\n");
    const entries = [...html.matchAll(conf.selector)].map((m) => ({
      url: m[1].startsWith("http") ? m[1] : `${conf.base}${m[1]}`,
      title:
        m[2]
          ?.replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .trim() || "",
    }));
    const urls = new Map();
    for (const entry of entries) if (!urls.has(entry.url)) urls.set(entry.url, entry.title);
    const missing = [...urls.entries()].filter(
      ([url, title]) =>
        !knownUrls.has(normalize(url)) &&
        !decodedOrigins.has(normalize(url)) &&
        !knownTitles.has(normalize(title)),
    );
    report.sources[key] = {
      ...(report.sources[key] || {}),
      archiveLinks: urls.size,
      archiveMissing: missing.length,
      archiveCandidates: missing.map(([url, title]) => ({ url, title })),
    };
    report.totals.archiveMissing += missing.length;
  } catch (error) {
    report.sources[key] = { ...(report.sources[key] || {}), archiveError: String(error) };
  }
  await sleep(200);
}

// Posts whose body was lost during the legacy MDX migration are retryable too.
for (const author of await readdir(path.join(ROOT, "content"))) {
  const dir = path.join(ROOT, "content", author);
  if (!(await stat(dir)).isDirectory()) continue;
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".md")) continue;
    const raw = await readFile(path.join(dir, file), "utf8");
    const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
    const fm = match ? yaml.load(match[1]) || {} : {};
    const body = match ? raw.slice(match[0].length) : raw;
    if (body.trim().length >= 80) continue;
    const url = String(fm.origin_url || "");
    if (!url || url === "javascript:;" || !url.startsWith("http")) continue;
    report.sources[author] = {
      ...(report.sources[author] || {}),
      emptyCandidates: [
        ...(report.sources[author]?.emptyCandidates || []),
        { url, title: fm.title || file.slice(0, -3), slug: file.slice(0, -3) },
      ],
    };
    report.totals.emptyBodies += 1;
  }
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`missing audit → ${OUT}`);
for (const [key, data] of Object.entries(report.sources)) {
  const bits = [];
  if (data.feedMissing !== undefined) bits.push(`feed ${data.feedMissing}/${data.feedItems}`);
  if (data.issueMissing !== undefined)
    bits.push(`issues ${data.issueMissing} (${data.issueRange})`);
  if (data.archiveMissing !== undefined)
    bits.push(`archive ${data.archiveMissing}/${data.archiveLinks}`);
  if (data.emptyCandidates?.length) bits.push(`empty ${data.emptyCandidates.length}`);
  if (data.feedError || data.archiveError) bits.push(data.feedError || data.archiveError);
  if (bits.length) console.log(`  ${key.padEnd(18)} ${bits.join(" · ")}`);
}
console.log(
  `TOTAL feed=${report.totals.feedMissing} issue=${report.totals.issueMissing} archive=${report.totals.archiveMissing} empty=${report.totals.emptyBodies}`,
);
