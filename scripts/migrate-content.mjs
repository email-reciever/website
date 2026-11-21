/**
 * Content migration / maintenance tool.
 *
 * The one-shot Astro→TanStack migration already converted the original 2392
 * MDX files into `content/**` + `manifest.json`. Since then the legacy writer
 * (old worker still deployed) has kept dropping new `.mdx` files into
 * `src/content/**`. This script folds those pending files into the new
 * structure without ever touching already-migrated content.
 *
 * Modes:
 *   node scripts/migrate-content.mjs                incremental (default, safe, idempotent)
 *   node scripts/migrate-content.mjs --force        same, but overwrite existing target .md files
 *   node scripts/migrate-content.mjs --rebuild-manifest
 *                                                  rebuild manifest.json from content/**\/*.md
 *                                                  (the real source of truth — use this when the
 *                                                  index drifts, replacing the old unsafe `--force`)
 *
 * Per converted file:
 * - drops `layout`, normalizes `date` to ISO (parsed from the timestamp filename)
 * - strips `import { Detail / Reference }` and the `<Reference>` / `<Detail>`
 *   MDX components (the English original inside <Detail> is discarded by design)
 * - restores the legacy escaping hacks: `&lt;` → `<`, `&lcub;` → `{`
 * - re-serializes frontmatter as real YAML (js-yaml when installed, built-in
 *   YAML-lite fallback so the script also runs before `pnpm install`)
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// js-yaml lives in cores/parser deps (pnpm isolated node_modules).
// Fall back to a tiny YAML-lite (de)serializer when deps aren't installed yet.
const require = createRequire(path.resolve("cores/parser/package.json"));
let yaml = null;
try {
  yaml = require("js-yaml");
} catch {
  /* yarn/pnpm install not run yet — use the built-in fallback */
}

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

const stats = { converted: 0, skipped: 0, manifestAdded: 0, byAuthor: {}, warnings: [] };

function warn(file, msg) {
  stats.warnings.push(`${file}: ${msg}`);
}

/* -------------------------------------------------------------------------- */
/* YAML helpers                                                               */
/* -------------------------------------------------------------------------- */

/** minimal parser for the flat `key: value` frontmatter these files use */
function parseLite(text) {
  const fm = {};
  for (const line of text.split("\n")) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replaceAll("''", "'");
    } else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    }
    fm[m[1]] = value;
  }
  return fm;
}

/** double-quoted scalars are valid YAML, so JSON.stringify is a safe dumper */
function dumpLite(obj) {
  return Object.entries(obj)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) =>
      typeof value === "boolean" || typeof value === "number"
        ? `${key}: ${value}`
        : `${key}: ${JSON.stringify(String(value))}`,
    )
    .join("\n");
}

function parseFrontmatter(raw) {
  const match = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (!match) return null;
  try {
    const fm = yaml ? yaml.load(match[1]) : parseLite(match[1]);
    return { fm: fm ?? {}, body: raw.slice(match[0].length) };
  } catch {
    return { fm: parseLite(match[1]), body: raw.slice(match[0].length) };
  }
}

function dumpFrontmatter(obj) {
  return (yaml ? yaml.dump(obj, { lineWidth: -1, noRefs: true }) : dumpLite(obj)).trimEnd();
}

/* -------------------------------------------------------------------------- */
/* Conversion helpers                                                         */
/* -------------------------------------------------------------------------- */

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

function normalize(fileLabel, author, slug, fm) {
  const next = { author };
  for (const key of keepFields) {
    if (key === "author") continue;
    if (fm[key] !== undefined) next[key] = fm[key];
  }
  if (!next.title) {
    warn(fileLabel, "missing title, using slug");
    next.title = slug;
  }
  if (!next.description) next.description = next.title;
  if (!next.avatar) next.avatar = `/media-source/${author}-ico.png`;
  next.translated = Boolean(next.translated);
  const iso = isoFromSlug(slug);
  if (iso) {
    next.date = iso;
  } else {
    warn(fileLabel, "non-timestamp filename, date kept as-is");
  }
  return next;
}

function toManifestEntry(author, slug, next) {
  return {
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
  };
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    return { posts: [] };
  }
}

function upsert(posts, entry) {
  const index = posts.findIndex((p) => p.author === entry.author && p.slug === entry.slug);
  if (index === -1) {
    posts.push(entry);
    stats.manifestAdded += 1;
  } else {
    posts[index] = { ...posts[index], ...entry };
  }
}

async function writeManifest(posts) {
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  await writeFile(MANIFEST, `${JSON.stringify({ posts }, null, 2)}\n`, "utf8");
}

/* -------------------------------------------------------------------------- */
/* Modes                                                                      */
/* -------------------------------------------------------------------------- */

/** incremental: fold pending src/content/**\/*.mdx into content/** + manifest */
async function migratePending(force) {
  const authors = (await readdir(SRC, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const manifest = await readManifest();

  for (const author of authors) {
    stats.byAuthor[author] = 0;
    const dir = path.join(SRC, author);
    const files = (await readdir(dir)).filter((f) => f.endsWith(".mdx")).sort();

    for (const file of files) {
      const label = `${author}/${file}`;
      const slug = file.replace(/\.mdx$/, "");
      const target = path.join(DEST, author, `${slug}.md`);

      if (!force) {
        try {
          await readFile(target);
          stats.skipped += 1;
          continue;
        } catch {
          /* not migrated yet */
        }
      }

      const raw = await readFile(path.join(dir, file), "utf8");
      const parsed = parseFrontmatter(raw);
      if (!parsed) {
        warn(label, "no frontmatter block found, skipped");
        continue;
      }

      const next = normalize(label, author, slug, parsed.fm);
      const body = cleanBody(parsed.body);
      if (!body.length) warn(label, "empty body after migration");

      const content = `---\n${dumpFrontmatter(next)}\n---\n\n${body}\n`;
      await mkdir(path.join(DEST, author), { recursive: true });
      await writeFile(target, content, "utf8");

      upsert(manifest.posts, toManifestEntry(author, slug, next));
      stats.converted += 1;
      stats.byAuthor[author] += 1;
    }
  }

  await writeManifest(manifest.posts);
}

/** rebuild the manifest from the actual source of truth (content/**\/*.md) */
async function rebuildManifest() {
  const authors = (await readdir(DEST, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const posts = [];

  for (const author of authors) {
    const dir = path.join(DEST, author);
    const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
    stats.byAuthor[author] = files.length;

    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      const raw = await readFile(path.join(dir, file), "utf8");
      const parsed = parseFrontmatter(raw);
      if (!parsed) {
        warn(`${author}/${file}`, "no frontmatter, skipped");
        continue;
      }
      const fm = parsed.fm;
      const entry = {
        author,
        slug,
        title: fm.title ?? slug,
        description: fm.description ?? fm.title ?? slug,
        date: fm.date ?? "",
        origin_url: fm.origin_url,
        origin_site: fm.origin_site,
        subAuthor: fm.subAuthor,
        avatar: fm.avatar,
        banner: fm.banner,
        translated: Boolean(fm.translated),
      };
      if (!entry.date) warn(`${author}/${file}`, "missing date");
      posts.push(entry);
    }
  }

  await writeManifest(posts);
  stats.converted = posts.length;
}

async function main() {
  const force = process.argv.includes("--force");
  const rebuild = process.argv.includes("--rebuild-manifest");

  if (rebuild) {
    await rebuildManifest();
    console.log(`rebuilt manifest.json from ${stats.converted} posts in content/`);
  } else {
    await migratePending(force);
    console.log(
      `migrated ${stats.converted} pending posts (${stats.skipped} already migrated, ` +
        `${stats.manifestAdded} new manifest entries)`,
    );
  }

  for (const [author, count] of Object.entries(stats.byAuthor)) {
    console.log(`  ${author.padEnd(16)} ${count}`);
  }
  if (stats.warnings.length) {
    console.log("\nwarnings:");
    for (const w of stats.warnings) console.log(`  - ${w}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
