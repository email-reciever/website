/**
 * RSS direct subscription.
 *
 * For sources with a public feed the worker no longer depends on Gmail
 * forwarding: the scheduled cron pulls each feed and hands new items to the
 * shared ingest pipeline (utils/ingest.ts), which GUID-dedupes against
 * `{source}.metadata.json` and publishes through the same slicing /
 * translating pipeline as emails.
 *
 * Source list lives in packages/consts/src/rss.ts:
 * - `newsletter` mode: a feed item IS a full newsletter issue (HTML identical
 *   to the email body), so existing email adapters slice it as usual
 * - `article` mode: a feed item is a single article; html2md converts it
 *   directly, then it goes through translation
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

async function fetchNewItems(feed: string, processed: string[]): Promise<IngestItem[]> {
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
    .filter((item) => item.guid && !processed.includes(item.guid) && item.html)
    .slice(0, MAX_ITEMS_PER_RUN);
}

/** sync one feed source — called in its own Worker invocation via /rss/:source
 * so each source gets a fresh subrequest budget (free plan: 50 per invocation) */
export async function syncRssSource(key: SenderType, env: Env, adapter: AdapterMap) {
  const conf = RSS_SOURCES[key as keyof typeof RSS_SOURCES] as RssSource | undefined;
  if (!conf) return;
  try {
    const processed = await readProcessed(key, env);
    const items = await fetchNewItems(conf.feed, processed);
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
