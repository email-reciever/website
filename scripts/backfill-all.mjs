/**
 * One-shot historical backfill for content missing from the archive.
 *
 * Uses scripts/out/missing-report.json (from `node scripts/audit-missing.mjs`)
 * as the candidate list, fetches each source page, converts it to Markdown with
 * the project's turndown fork, translates it with local headful Chrome, and
 * writes content/** + manifest.json directly (no Worker subrequest limits).
 *
 * Future/new content still goes through the deployed Worker's online provider
 * chain — this script is for filling historical gaps only.
 *
 * Usage:
 *   node scripts/backfill-all.mjs --limit 10
 *   node scripts/backfill-all.mjs --author reactdigest --limit 5 --dry-run
 */
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { openLocalTranslator } from "./lib/local-translator.mjs";
import { CRAWL_HEADERS } from "./lib/sources.mjs";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");
const Turndown = require("@email.reciever/turndown");
const cheerio = require("cheerio");

const ROOT = process.cwd();
const REPORT = path.join(ROOT, "scripts/out/missing-report.json");
const MANIFEST = path.join(ROOT, "manifest.json");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const limit = Number(arg("limit", 20));
const authorFilter = arg("author", "");
const dryRun = process.argv.includes("--dry-run");

const normalize = (value) =>
  String(value || "")
    .trim()
    .replace(/\?.*$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

const decode = (text) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

function extractMeta(html) {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  let title = titleMatch ? decode(titleMatch[1]) : "untitled";
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (h1) title = decode(h1[1].replace(/<[^>]+>/g, "")) || title;

  const dateSources = [
    /property="article:published_time"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="article:published_time"/i,
    /"datePublished"\s*:\s*"([^"]+)"/i,
    /<time[^>]+datetime="([^"]+)"/i,
  ];
  let date = "";
  for (const re of dateSources) {
    const found = re.exec(html);
    if (found) {
      date = found[1];
      break;
    }
  }
  return { title, date };
}

function htmlToMarkdown(html) {
  const $ = cheerio.load(html);
  $("script,style,nav,footer,header,aside,form,noscript,iframe").remove();
  const root =
    $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  const td = Turndown();
  return td.turndown(root.html() || "").trim();
}

function slugNow() {
  const d = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}_${pad(d.getUTCMilliseconds(), 3)}`;
}

async function main() {
  const report = JSON.parse(await readFile(REPORT, "utf8"));
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const seen = new Set(manifest.posts.map((p) => normalize(p.origin_url)));

  const candidates = [];
  for (const [author, data] of Object.entries(report.sources)) {
    if (authorFilter && author !== authorFilter) continue;
    const items = [
      ...(data.feedCandidates || []).map((i) => ({ ...i, via: "feed" })),
      ...(data.issueCandidates || []).map((i) => ({ ...i, via: "issue" })),
      ...(data.archiveCandidates || []).map((i) => ({ ...i, via: "archive" })),
    ];
    for (const item of items) {
      if (!item.url || seen.has(normalize(item.url))) continue;
      seen.add(normalize(item.url));
      candidates.push({ ...item, author });
    }
  }

  console.log(`candidates: ${candidates.length}, processing up to ${limit}${dryRun ? " (dry run)" : ""}`);
  if (!candidates.length) return;

  const translator = await openLocalTranslator();
  console.log(`Translator availability: ${translator.availability}`);
  let done = 0;

  try {
    for (const candidate of candidates.slice(0, limit)) {
      try {
        const response = await fetch(candidate.url, { headers: CRAWL_HEADERS });
        if (!response.ok) {
          console.log(`  skip ${response.status} ${candidate.url}`);
          continue;
        }
        const html = await response.text();
        const markdown = htmlToMarkdown(html);
        if (markdown.length < 200) {
          console.log(`  skip thin page ${candidate.url}`);
          continue;
        }
        const { title, date } = extractMeta(html);
        const translated = await translator.translateMarkdown(markdown);
        const rawTitle = candidate.title && candidate.title !== "untitled" ? candidate.title : title;
        const finalTitle = decode(rawTitle);

        console.log(
          `  ${candidate.author}: ${finalTitle.slice(0, 50)} (${translated.translatedCount} lines)`,
        );
        if (dryRun) continue;

        const slug = slugNow();
        const isoDate = date ? new Date(date).toISOString() : new Date().toISOString();
        const fm = {
          title: finalTitle,
          description: finalTitle,
          author: candidate.author,
          date: isoDate,
          origin_url: candidate.url,
          translated: true,
          avatar: `/media-source/${candidate.author}-ico.png`,
        };
        const fmYaml = yaml.dump(fm, { lineWidth: -1, noRefs: true }).trimEnd();
        const file = path.join(ROOT, "content", candidate.author, `${slug}.md`);
        await writeFile(
          file,
          `---\n${fmYaml}\n---\n\n${translated.markdown.trim()}\n`,
          "utf8",
        );
        manifest.posts.push({
          author: candidate.author,
          slug,
          title: finalTitle,
          description: finalTitle,
          date: isoDate,
          origin_url: candidate.url,
          avatar: fm.avatar,
          translated: true,
        });
        done += 1;
      } catch (error) {
        console.log(`  failed ${candidate.url}: ${String(error).slice(0, 100)}`);
      }
    }
  } finally {
    await translator.close();
  }

  if (!dryRun && done) {
    manifest.posts.sort((a, b) => (a.date < b.date ? 1 : -1));
    await writeFile(MANIFEST, `${JSON.stringify(manifest)}\n`, "utf8");
  }
  console.log(`backfilled ${done} posts${dryRun ? " (dry run)" : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
