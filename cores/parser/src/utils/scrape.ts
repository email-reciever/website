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

async function fetchPage(url: string): Promise<string> {
  return fetch(url, { headers: CRAWL_HEADERS }).then((response) => {
    if (!response.ok) throw new Error(`page fetch failed: ${url} → ${response.status}`);
    return response.text();
  });
}

/** collect candidate links from the list page (newest first) */
async function discoverLinks(source: ArchiveSource, processed: string[]): Promise<string[]> {
  const html = await fetchPage(source.list);
  const $ = load(html, null, false);
  const pattern = source.linkPattern ? new RegExp(source.linkPattern) : undefined;

  const links: string[] = [];
  $(source.selector).each((_index, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    if (pattern && !pattern.test(href)) return;
    const url = href.startsWith("http") ? href : `${source.base}${href}`;
    if (!links.includes(url) && !processed.includes(url)) {
      links.push(url);
    }
  });
  return links.slice(0, MAX_ITEMS_PER_RUN);
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

/** entry for the scheduled cron handler and the manual `/rss` route */
export async function syncArchiveSources(env: Env, adapter: AdapterMap) {
  const entries = Object.entries(ARCHIVES_SOURCES) as [SenderType, ArchiveSource][];
  for (const [key, source] of entries) {
    try {
      const processed = await readProcessed(key, env);
      const links = await discoverLinks(source, processed);
      if (!links.length) continue;
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
}
