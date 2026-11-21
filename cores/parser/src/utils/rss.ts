/**
 * RSS direct subscription.
 *
 * For sources with a public feed the worker no longer depends on Gmail
 * forwarding: the scheduled cron pulls each feed and hands new items to the
 * shared ingest pipeline (utils/ingest.ts), which GUID-dedupes against
 * `{source}.metadata.json` and publishes through the same slicing /
 * translating pipeline as emails.
 *
 * Two modes:
 * - normal (`/rss`): newest-first, 1 item per source per run
 * - backfill (`/rss?backfill=1`): oldest-first, walks the feed history for
 *   items that are in the feed but missing from the project. Dedupes against
 *   BOTH the GUID metadata and the live manifest (origin_url), so a pruned or
 *   missing metadata file can never create duplicates.
 */

import type { RssSource } from "@email.reciever/consts/rss";
import { RSS_SOURCES } from "@email.reciever/consts/rss";
import { XMLParser } from "fast-xml-parser";
import type { AdapterMap, SenderType } from "../types";
import {
  CRAWL_HEADERS,
  type IngestItem,
  ingestItems,
  MAX_ITEMS_PER_RUN,
  readProcessed,
} from "./ingest";
import { logger } from "./logger";

interface FeedItem {
  title?: string | Record<string, unknown>;
  link?: string | Record<string, unknown>;
  description?: string | Record<string, unknown>;
  "content:encoded"?: string | Record<string, unknown>;
  pubDate?: string | Record<string, unknown>;
  guid?: string | Record<string, unknown>;
}

const textOf = (value?: string | Record<string, unknown>): string =>
  typeof value === "string" ? value : "";

export interface SyncOptions {
  backfill?: boolean;
}

/** every item in the feed, newest first — callers decide which slice to ingest */
export async function fetchFeedItems(feed: string): Promise<IngestItem[]> {
  const xml = await fetch(feed, { headers: CRAWL_HEADERS }).then((response) => {
    if (!response.ok) throw new Error(`feed fetch failed: ${feed} → ${response.status}`);
    return response.text();
  });
  const channel = new XMLParser().parse(xml)?.rss?.channel;
  if (!channel?.item) return [];
  const items = Array.isArray(channel.item) ? channel.item : [channel.item];

  return (items as FeedItem[])
    .map((item) => ({
      guid: textOf(item.guid) || textOf(item.link),
      title: textOf(item.title) || "untitled",
      link: textOf(item.link),
      html: textOf(item["content:encoded"]) || textOf(item.description),
      pubDate: textOf(item.pubDate) || undefined,
    }))
    .filter((item) => item.guid && item.html);
}

/** Dedupe for backfill uses the per-source GUID metadata only. Reading the
 * full manifest (now >1 MB) costs more CPU than the free plan allows. */

/** sync one feed source — called in its own Worker invocation via /rss/:source
 * so each source gets a fresh subrequest budget (free plan: 50 per invocation) */
export async function syncRssSource(
  key: SenderType,
  env: Env,
  adapter: AdapterMap,
  opts: SyncOptions = {},
) {
  const conf = RSS_SOURCES[key as keyof typeof RSS_SOURCES] as RssSource | undefined;
  if (!conf) return;
  try {
    const processed = await readProcessed(key, env);
    const candidates = (await fetchFeedItems(conf.feed)).filter(
      (item) => !processed.includes(item.guid),
    );
    // backfill deliberately starts at the oldest missing item; normal sync
    // keeps taking the newest one. Each invocation still ingests just one item.
    const items = opts.backfill
      ? [...candidates].reverse().slice(0, MAX_ITEMS_PER_RUN)
      : candidates.slice(0, MAX_ITEMS_PER_RUN);
    await ingestItems(key, conf.mode, items, adapter, env);
  } catch (e) {
    logger(env, `rss sync failed: ${key}`, e);
  }
}

/** legacy in-process path (local dev / single-source debugging) */
export async function syncRssSources(env: Env, adapter: AdapterMap) {
  for (const key of Object.keys(RSS_SOURCES) as SenderType[]) {
    await syncRssSource(key, env, adapter);
  }
}
