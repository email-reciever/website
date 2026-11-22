/**
 * Shared direct-subscription ingest pipeline.
 *
 * Both RSS feeds (utils/rss.ts) and archive-page scrapes (utils/scrape.ts)
 * funnel their discovered items through here: GUID dedupe against
 * `{source}.metadata.json` (same pattern as zhihu), publish via the standard
 * slicing / translating pipeline, and persist after every item so a crash
 * only replays a single entry.
 */

import { md } from "../adapters/md";
import type { AdapterMap, SenderType } from "../types";
import { createBlog, createCommonFrontmatter } from "./blog";
import { cleanMarkdown, extractHtml, resolveHtml } from "./extract";
import { html2md } from "./html2md";
import { logger } from "./logger";
import { getMetaData, setMetaData } from "./metadata";

/** per-run cap per source — one item keeps CPU + subrequests inside the free
 * plan limits (10ms CPU / 50 subrequests per invocation). Feeds are weekly, so
 * the 6h cron catches up quickly. */
export const MAX_ITEMS_PER_RUN = 1;
/** bound the dedupe list so metadata files stay small */
const DEDUPE_LIMIT = 200;

export const CRAWL_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
};

export interface IngestItem {
  guid: string;
  title: string;
  /** origin link, also the fallback origin_url on the frontmatter */
  link: string;
  /** full item HTML (feed entry or scraped page) */
  html: string;
  pubDate?: string;
  /** provenance stored on the frontmatter, e.g. `rss:https://...` */
  recorder?: string;
}

/** already-processed GUIDs, for callers that need to filter before fetching pages */
export async function readProcessed(key: SenderType, env: Env): Promise<string[]> {
  const { content } = await getMetaData<string[]>(key, env);
  return content ?? [];
}

export interface RenderedItem {
  content: string;
  translated: boolean;
  originUrl: string;
}

/** Run an item through the same slicing + translation pipeline used by new
 * posts. Shared by ingest (new) and reconcile (repair existing). */
export async function renderItem(
  key: SenderType,
  mode: "newsletter" | "article",
  item: IngestItem,
  adapter: AdapterMap,
  env: Env,
): Promise<RenderedItem> {
  let content = item.html;
  let translated = false;
  let originUrl = item.link;

  // Teaser-only feeds (Astro, CSS-Tricks) must be hydrated from the canonical
  // article page before extraction. The prune/extract step runs for every
  // source, including email adapters, so inline <script>/<style> and tracking
  // pixels never reach turndown.
  const { html: resolvedHtml } = await resolveHtml(item, key);
  const html = extractHtml(resolvedHtml, key);

  if (mode === "newsletter") {
    // item HTML === email HTML → reuse the email adapter's slicing rules
    const collector = adapter[key];
    if (!collector) throw new Error(`no adapter registered for ${key}`);
    const output = await collector("", html, [], env);
    content = cleanMarkdown(output.blogContent || "", key);
    if (output.origin_url) {
      originUrl = output.origin_url;
    }
    if (output.translate !== false) {
      const result = await md(content, env);
      content = result.content;
      translated = result.translated;
    }
  } else {
    const { md: articleMd } = html2md(html);
    content = cleanMarkdown(articleMd, key);
    const result = await md(content, env);
    content = result.content;
    translated = result.translated;
  }

  return { content, translated, originUrl };
}

async function publishItem(
  key: SenderType,
  mode: "newsletter" | "article",
  item: IngestItem,
  adapter: AdapterMap,
  env: Env,
) {
  const { content, translated, originUrl } = await renderItem(key, mode, item, adapter, env);
  await createBlog(
    content,
    {
      ...createCommonFrontmatter(item.title, key, originUrl, item.pubDate),
      email_recorder: item.recorder,
      translated,
    },
    env,
  );
}

/**
 * Ingest discovered items (oldest first). Items already in the dedupe list
 * are skipped; a failed item stays unseen so the next run retries it.
 */
export async function ingestItems(
  key: SenderType,
  mode: "newsletter" | "article",
  items: IngestItem[],
  adapter: AdapterMap,
  env: Env,
): Promise<number> {
  const processed = await readProcessed(key, env);
  const { sha } = await getMetaData<string[]>(key, env);
  let currentSha = sha;
  let handled = 0;

  for (const item of [...items].reverse()) {
    if (!item.guid || processed.includes(item.guid)) continue;
    try {
      await publishItem(key, mode, item, adapter, env);
      processed.push(item.guid);
      handled += 1;
      // persist after every item: a crash only replays that one item
      const updated = await setMetaData(key, processed.slice(-DEDUPE_LIMIT), env, currentSha);
      currentSha = updated.sha;
    } catch (e) {
      logger(env, `ingest item failed: ${key}`, e);
    }
  }

  if (handled) {
    logger(env, `direct sync: ${key} +${handled}`);
  }
  return handled;
}
