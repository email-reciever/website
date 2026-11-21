/**
 * Content reconciliation cron.
 *
 * Besides backfilling missing history, existing posts can drift: early runs
 * produced empty bodies / untranslated prose, and a source can edit an article
 * after we archived it. This task walks a few posts per source per invocation,
 * re-fetches the matching source item and:
 *   - repairs posts with a missing body, missing translation or no source hash
 *   - re-publishes posts whose source HTML hash changed
 *
 * One post per source per invocation keeps CPU + subrequests inside the free
 * Workers plan, same constraint as the ingest/backfill fan-out.
 */

import { ARCHIVES_SOURCES } from "@email.reciever/consts/archives";
import { RSS_SOURCES } from "@email.reciever/consts/rss";
import type { Frontmatter } from "@email.reciever/types/markdown-extends";
import { load as cheerioLoad } from "cheerio";
import { load as yamlLoad } from "js-yaml";

import { github, githubRead } from "../adapters/github";
import { local, localRead } from "../adapters/local";
import type { AdapterMap, SenderType } from "../types";
import { composeMarkdown } from "./blog";
import { CRAWL_HEADERS, type IngestItem, renderItem } from "./ingest";
import { logger } from "./logger";
import { type ManifestEntry, readManifest, upsertManifest } from "./manifest";
import { fetchFeedItems } from "./rss";

/** small deterministic hash — enough to detect source edits, no subtle crypto needed */
function hashText(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

async function readContent(entry: ManifestEntry, env: Env) {
  const path = `content/${entry.author}/${entry.slug}.md`;
  const response = env.ENV === "dev" ? await localRead(path, env) : await githubRead(path, env);
  return { path, content: response?.content, sha: response?.sha };
}

function splitFrontmatter(raw: string) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return { fm: {} as Partial<Frontmatter>, body: raw };
  let fm = {} as Partial<Frontmatter>;
  try {
    fm = (yamlLoad(match[1]) as Partial<Frontmatter>) ?? {};
  } catch {
    /* malformed frontmatter — treat as empty */
  }
  return { fm, body: raw.slice(match[0].length) };
}

/** find the source item that corresponds to an archived post */
async function findSourceItem(key: SenderType, originUrl: string): Promise<IngestItem | undefined> {
  const feed = RSS_SOURCES[key as keyof typeof RSS_SOURCES];
  if (feed) {
    const items = await fetchFeedItems(feed.feed);
    return items.find(
      (item) => item.link === originUrl || item.guid === originUrl || item.guid === key,
    );
  }

  const archive = ARCHIVES_SOURCES[key as keyof typeof ARCHIVES_SOURCES];
  if (!archive) return undefined;
  const listHtml = await fetch(archive.list, { headers: CRAWL_HEADERS }).then((r) => r.text());
  const $list = cheerioLoad(listHtml, null, false);
  let link: string | undefined;
  $list(archive.selector).each((_i, element) => {
    const href = $list(element).attr("href");
    if (!href) return;
    const url = href.startsWith("http") ? href : `${archive.base}${href}`;
    if (url === originUrl) link = url;
  });
  if (!link) return undefined;

  const page = await fetch(link, { headers: CRAWL_HEADERS }).then((r) => r.text());
  const $page = cheerioLoad(page, null, false);
  const rawTitle = $page("title").first().text() || link;
  const match = archive.titleMatch ? new RegExp(archive.titleMatch).exec(rawTitle) : undefined;
  return {
    guid: link,
    title: (match?.[1] ?? rawTitle).trim() || link,
    link,
    html: page,
    recorder: `scrape:${archive.list}`,
  };
}

/** write the repaired post in place (same slug) and sync its manifest entry */
async function updateBlog(
  entry: ManifestEntry,
  content: string,
  rendered: { translated: boolean; originUrl: string },
  hash: string,
  env: Env,
) {
  const { path, sha } = await readContent(entry, env);
  const frontMatter: Frontmatter = {
    title: entry.title,
    description: entry.description,
    author: entry.author,
    subAuthor: entry.subAuthor,
    date: entry.date,
    origin_url: rendered.originUrl || entry.origin_url || "",
    origin_site: entry.origin_site,
    email_recorder: entry.email_recorder,
    translated: rendered.translated,
    avatar: entry.avatar,
    banner: entry.banner,
    source_hash: hash,
  };
  const payload = { path, content: composeMarkdown(content, frontMatter), sha };

  if (env.ENV === "dev") {
    await local(payload, env);
  } else {
    await github(payload, env);
  }
  await upsertManifest({ ...entry, translated: rendered.translated }, env);
}

/** reconcile a handful of posts for one source, in its own invocation */
export async function reconcileSource(key: SenderType, env: Env, adapter: AdapterMap) {
  const rss = RSS_SOURCES[key as keyof typeof RSS_SOURCES];
  const archive = ARCHIVES_SOURCES[key as keyof typeof ARCHIVES_SOURCES];
  if (!rss && !archive) return;

  const { manifest } = await readManifest(env);
  const posts = manifest.posts.filter((post) => post.author === key);
  if (!posts.length) return;

  // Prefer clearly deficient posts; otherwise pick one at random for a
  // source-drift check so the cron eventually covers the whole archive.
  let target: ManifestEntry | undefined;
  let deficient = false;
  for (const post of posts.slice(0, 12)) {
    const { content } = await readContent(post, env);
    if (!content) continue;
    const { fm, body } = splitFrontmatter(content);
    if (body.trim().length < 200 || !fm.translated || !fm.source_hash) {
      target = post;
      deficient = true;
      break;
    }
  }
  if (!target) target = posts[Math.floor(Math.random() * posts.length)];

  try {
    const item = await findSourceItem(key, target.origin_url ?? "");
    if (!item?.html) return;

    const rendered = await renderItem(key, rss ? rss.mode : archive!.mode, item, adapter, env);
    if (!rendered.content.trim()) return;

    const hash = hashText(item.html);
    const { content } = await readContent(target, env);
    const { fm } = splitFrontmatter(content ?? "");

    // Nothing to do when the post is healthy and the source has not changed.
    if (!deficient && fm.source_hash === hash) return;

    // Never replace an existing translation with raw source when both providers
    // are unavailable (e.g. Workers AI daily quota exhausted + gtx 429).
    if (fm.translated && !rendered.translated) {
      logger(env, `reconcile skipped: translation unavailable for ${key}/${target.slug}`);
      return;
    }

    await updateBlog(target, rendered.content, rendered, hash, env);
    logger(env, `reconciled: ${key}/${target.slug} (${deficient ? "repair" : "source changed"})`);
  } catch (e) {
    logger(env, `reconcile failed: ${key}/${target.slug}`, e);
  }
}
