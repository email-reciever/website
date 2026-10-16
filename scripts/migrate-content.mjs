/**
 * One-shot migration: legacy Astro MDX content (src/content/**) → plain
 * markdown (content/**) + root manifest.json for the new TanStack Start site.
 *
 * What it does per file:
 * - drops `layout`, normalizes `date` to ISO (parsed from the timestamp filename)
 * - strips `import { Detail / Reference }` lines and the MDX components
 *   `<Reference ... />` / `<Detail ...>...</Detail>` (original English content
 *   inside Detail is discarded by design)
 * - restores the old MDX escaping hacks: `<` → `<`, `&lcub;` → `{`
 * - re-serializes frontmatter with a real YAML dumper (no more hand-joined
 *   `key: value` strings)
 *
 * Usage (repo root, after `pnpm install`):
 *   node scripts/migrate-content.mjs [--force]
 *
 * `--force` overwrites an existing content/ directory + manifest.json.
 */
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// js-yaml lives in cores/parser deps (pnpm isolated node_modules)
const require = createRequire(path.resolve("cores/parser/package.json"));
const yaml = require("js-yaml");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src/content");
const DEST = path.join(ROOT, "content");
const MANIFEST = path.join(ROOT, "manifest.json");

const TIMESTAMP_RE = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})_(\d{3})$/;

const keepFields = [
  "title",
  "description",
  "author",
  "subAuthor",
  "date",
  "origin_url",
  "origin_site",
  "email_recorder",
  "translated",
  "avatar",
  "banner",
];

const stats = { total: 0, byAuthor: {}, warnings: [], emptyBody: 0 };

function warn(file, msg) {
  stats.warnings.push(`${file}: ${msg}`);
}

/** naive fallback for hand-written frontmatter that fails real YAML parsing */
function naiveFrontmatter(text) {
  const fm = {};
  for (const line of text.split("\n")) {
    const m = /^([A-Za-z_][\w]*):\s*(.*)$/.exec(line);
    if (m) fm[m[1]] = m[2].trim();
  }
  return fm;
}

function parseFrontmatter(raw) {
  const match = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (!match) return null;
  try {
    return { fm: yaml.load(match[1]), body: raw.slice(match[0].length) };
  } catch {
    return { fm: naiveFrontmatter(match[1]), body: raw.slice(match[0].length) };
  }
}

/** filename timestamp (UTC, worker generated) → ISO string */
function isoFromSlug(slug) {
  const m = TIMESTAMP_RE.exec(slug);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, S, MS] = m;
  return `${Y}-${Mo}-${D}T${H}:${Mi}:${S}.${MS}Z`;
}

function cleanBody(body) {
  return (
    body
      // component imports (single/double quotes, optional semicolon)
      .replace(
        /^import\s*\{[^}]*\}\s*from\s*['"]@\/components\/(Detail|Reference)\.tsx['"];?\s*$/gm,
        "",
      )
      // self-closing Reference, attrs may span lines
      .replace(/<Reference\b[\s\S]*?\/>\s*/g, "")
      // Detail block with the original English content inside — dropped
      .replace(/<Detail\b[\s\S]*?<\/Detail>\s*/g, "")
      // restore the MDX escaping hacks
      .replaceAll("&lt;", "<")
      .replaceAll("&lcub;", "{")
      // collapse the gaps left by removed components
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

async function main() {
  const force = process.argv.includes("--force");
  if (!force) {
    for (const target of [DEST, MANIFEST]) {
      try {
        await stat(target);
        console.error(
          `refusing to run: ${path.relative(ROOT, target)} already exists (use --force)`,
        );
        process.exit(1);
      } catch {
        /* not exists — ok */
      }
    }
  } else {
    await rm(DEST, { recursive: true, force: true });
  }

  const authors = (await readdir(SRC, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const posts = [];

  for (const author of authors) {
    const dir = path.join(SRC, author);
    const files = (await readdir(dir)).filter((f) => f.endsWith(".mdx")).sort();
    stats.byAuthor[author] = 0;

    for (const file of files) {
      const raw = await readFile(path.join(dir, file), "utf8");
      const parsed = parseFrontmatter(raw);
      if (!parsed) {
        warn(`${author}/${file}`, "no frontmatter block found, skipped");
        continue;
      }

      const slug = file.replace(/\.mdx$/, "");
      const fm = parsed.fm ?? {};

      const next = { author };
      for (const key of keepFields) {
        if (key === "author") continue;
        if (fm[key] !== undefined) next[key] = fm[key];
      }
      // fill defaults the old templates used to hardcode
      if (!next.title) {
        warn(`${author}/${file}`, "missing title, using slug");
        next.title = slug;
      }
      if (!next.description) next.description = next.title;
      if (!next.avatar) next.avatar = `/media-source/${author}-ico.png`;
      next.translated = Boolean(next.translated);
      const iso = isoFromSlug(slug);
      if (iso) {
        next.date = iso;
      } else {
        // only legacy hand-written files land here — keep their original date string
        warn(`${author}/${file}`, "non-timestamp filename, date kept as-is");
      }

      const body = cleanBody(parsed.body);
      if (!body.length) {
        stats.emptyBody += 1;
        warn(`${author}/${file}`, "empty body after migration");
      }

      const fmYaml = yaml.dump(next, { lineWidth: -1, noRefs: true }).trimEnd();
      const content = `---\n${fmYaml}\n---\n\n${body}\n`;

      await mkdir(path.join(DEST, author), { recursive: true });
      await writeFile(path.join(DEST, author, `${slug}.md`), content, "utf8");

      posts.push({
        author,
        slug,
        title: next.title,
        description: next.description,
        date: next.date,
        origin_url: next.origin_url,
        origin_site: next.origin_site,
        subAuthor: next.subAuthor,
        avatar: next.avatar,
        banner: next.banner,
        translated: next.translated,
      });

      stats.total += 1;
      stats.byAuthor[author] += 1;
    }
  }

  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  await writeFile(MANIFEST, `${JSON.stringify({ posts }, null, 2)}\n`, "utf8");

  console.log(`migrated ${stats.total} posts into content/ + manifest.json`);
  for (const [author, count] of Object.entries(stats.byAuthor)) {
    console.log(`  ${author.padEnd(16)} ${count}`);
  }
  if (stats.emptyBody) console.log(`note: ${stats.emptyBody} posts have an empty body`);
  if (stats.warnings.length) {
    console.log("\nwarnings:");
    for (const w of stats.warnings) console.log(`  - ${w}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
