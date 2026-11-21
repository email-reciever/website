/**
 * Fill missing translations for existing posts using local headful Chrome.
 * Keeps the Worker's online provider chain untouched — this runs on this Mac
 * and is meant for historical backfill only.
 *
 * Usage:
 *   node scripts/translate-local.mjs --limit 20
 *   node scripts/translate-local.mjs --author tyler --limit 5 --dry-run
 */

import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { openLocalTranslator } from "./lib/local-translator.mjs";

const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "manifest.json");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const limit = Number(arg("limit", 20));
const authorFilter = arg("author", "");
const dryRun = process.argv.includes("--dry-run");

function splitFrontmatter(raw) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return { fm: {}, body: raw };
  return {
    fm: yaml.load(match[1]) || {},
    body: raw.slice(match[0].length),
  };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const candidates = manifest.posts.filter(
    (post) =>
      post.translated === false &&
      (!authorFilter || post.author === authorFilter) &&
      post.author !== "zhihu" &&
      post.author !== "ajiang",
  );

  console.log(
    `candidates: ${candidates.length}, processing up to ${limit}${dryRun ? " (dry run)" : ""}`,
  );
  if (!candidates.length) return;

  const translator = await openLocalTranslator();
  console.log(`Translator availability: ${translator.availability}`);
  let done = 0;

  try {
    for (const post of candidates.slice(0, limit)) {
      const file = path.join(ROOT, "content", post.author, `${post.slug}.md`);
      let raw;
      try {
        raw = await readFile(file, "utf8");
      } catch {
        console.log(`  skip missing file ${post.author}/${post.slug}`);
        continue;
      }
      const { fm, body } = splitFrontmatter(raw);
      if (!body.trim()) {
        console.log(`  skip empty body ${post.author}/${post.slug}`);
        continue;
      }

      const { markdown, translatedCount } = await translator.translateMarkdown(body);
      if (translatedCount === 0) {
        console.log(`  skip (no prose) ${post.author}/${post.slug}`);
        continue;
      }
      console.log(`  ${post.author}/${post.slug}: ${translatedCount} lines translated`);

      if (dryRun) continue;
      const nextFm = { ...fm, translated: true };
      const fmYaml = yaml.dump(nextFm, { lineWidth: -1, noRefs: true }).trimEnd();
      await writeFile(file, `---\n${fmYaml}\n---\n\n${markdown.trim()}\n`, "utf8");
      post.translated = true;
      done += 1;
    }
  } finally {
    await translator.close();
  }

  if (!dryRun && done) {
    await writeFile(MANIFEST, `${JSON.stringify(manifest)}\n`, "utf8");
  }
  console.log(`translated ${done} posts${dryRun ? " (dry run)" : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
