/**
 * Archive-page scraping subscription.
 *
 * For sources with no RSS at all: pull the archive/list page, extract item
 * links, fetch each item page and feed it through the same ingest pipeline
 * as RSS / emails. All discovered links are checked against the dedupe list
 * BEFORE the item page is fetched, so already-published issues cost one
 * list-page request and nothing more.
 *
 * Source list lives in packages/consts/src/archives.ts.
 */

import type { ArchiveSource } from "@email.reciever/consts/archives";
import { ARCHIVES_SOURCES } from "@email.reciever/consts/archives";
import { load } from "cheerio";
import type { AdapterMap, SenderType } from "../types";
import {
  CRAWL_HEADERS,
  type IngestItem,
  ingestItems,
  MAX_ITEMS_PER_RUN,
  readProcessed,
} from "./ingest";
import { logger } from "./logger";
import { readManifest } from "./manifest";

async function fetchPage(url: string): Promise<string> {
  return fetch(url, { headers: CRAWL_HEADERS }).then((response) => {
    if (!response.ok) throw new Error(`page fetch failed: ${url} → ${response.status}`);
    return response.text();
  });
}

/** collect every candidate link from the list page (newest first) — callers
 * decide which slice to hydrate/ingest */
async function discoverLinks(
  source: ArchiveSource,
  processed: string[],
  known: Set<string>,
): Promise<string[]> {
  const html = await fetchPage(source.list);
  const $ = load(html, null, false);
  const pattern = source.linkPattern ? new RegExp(source.linkPattern) : undefined;

  const links: string[] = [];
  $(source.selector).each((_index, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    if (pattern && !pattern.test(href)) return;
    const url = href.startsWith("http") ? href : `${source.base}${href}`;
    if (!links.includes(url) && !processed.includes(url) && !known.has(url)) {
      links.push(url);
    }
  });
  return links;
}

/** fetch one item page and build a complete ingest item */
async function hydrateItem(link: string, source: ArchiveSource): Promise<IngestItem> {
  const html = await fetchPage(link);
  const $ = load(html, null, false);
  const rawTitle = $("title").first().text() || link;
  const match = source.titleMatch ? new RegExp(source.titleMatch).exec(rawTitle) : undefined;
  const title = (match?.[1] ?? rawTitle).trim() || link;

  return {
    guid: link,
    title,
    link,
    html,
    recorder: `scrape:${source.list}`,
  };
}

export interface ArchiveSyncOptions {
  backfill?: boolean;
}

/** sync one archive source — invoked in its own Worker invocation via /rss/:source */
export async function syncArchiveSource(
  key: SenderType,
  env: Env,
  adapter: AdapterMap,
  opts: ArchiveSyncOptions = {},
) {
  const source = ARCHIVES_SOURCES[key as keyof typeof ARCHIVES_SOURCES] as
    | ArchiveSource
    | undefined;
  if (!source) return;
  try {
    const processed = await readProcessed(key, env);
    let known = new Set<string>();
    if (opts.backfill) {
      const { manifest } = await readManifest(env);
      known = new Set(
        manifest.posts.map((p) => p.origin_url).filter((url): url is string => Boolean(url)),
      );
    }
    const allLinks = await discoverLinks(source, processed, known);
    // backfill walks from the oldest missing archive entry
    const links = opts.backfill
      ? [...allLinks].reverse().slice(0, MAX_ITEMS_PER_RUN)
      : allLinks.slice(0, MAX_ITEMS_PER_RUN);
    if (!links.length) return;
    // hydrate oldest-first so a mid-run failure keeps chronological order
    const items: IngestItem[] = [];
    for (const link of [...links].reverse()) {
      try {
        items.push(await hydrateItem(link, source));
      } catch (e) {
        logger(env, `scrape hydrate failed: ${key}`, link, e);
      }
    }
    await ingestItems(key, source.mode, items, adapter, env);
  } catch (e) {
    logger(env, `scrape sync failed: ${key}`, e);
  }
}

/** legacy in-process path (local dev / single-source debugging) */
export async function syncArchiveSources(env: Env, adapter: AdapterMap) {
  for (const key of Object.keys(ARCHIVES_SOURCES) as SenderType[]) {
    await syncArchiveSource(key, env, adapter);
  }
}
