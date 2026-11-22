/**
 * Source-aware content extraction.
 *
 * Sits between "we have some HTML" and "we hand Markdown to the translator".
 * It prunes chrome from the DOM, narrows to the real article body, optionally
 * fetches the full page when the feed only carries a teaser, and finally drops
 * plain-text newsletter boilerplate from the converted Markdown.
 */

import {
  type ContentRule,
  contentRule,
  GLOBAL_REMOVE,
  GLOBAL_STRIP,
} from "@email.reciever/consts/content-rules";
import { load } from "cheerio";
import type { SenderType } from "../types";
import type { IngestItem } from "./ingest";

/** Boilerplate that is appended to a real sentence instead of owning a line. */
const GLOBAL_INLINE: RegExp[] = [
  /[^\n]*\bThe post .+? appeared first on .+?\.?\s*$/im,
  /\s*You should really get the newsletter[^\n]*$/im,
  /\|?\s*\[Read on the web\]\([^)]*\)/gi,
];

const FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
};

/** Visible text size — used to detect teaser-only RSS entries. */
export function visibleLength(html: string): number {
  if (!html) return 0;
  try {
    const $ = load(html, null, false);
    $("script, style, noscript").remove();
    return $.text().replace(/\s+/g, " ").trim().length;
  } catch {
    return html.length;
  }
}

function removeSelectors($: ReturnType<typeof load>, selectors: string[]) {
  for (const selector of selectors) {
    try {
      $(selector).remove();
    } catch {
      /* an unsupported pseudo selector must not break the whole extraction */
    }
  }
}

/**
 * Prune the DOM and return only the source's real body HTML.
 * Falls back to `<body>` (then to the original string) so a changed selector
 * can never turn an article into an empty post.
 */
export function extractHtml(html: string, key?: SenderType | string): string {
  if (!html) return "";
  const rule = contentRule(key);
  let $: ReturnType<typeof load>;
  try {
    $ = load(html);
  } catch {
    return html;
  }

  removeSelectors($, [...GLOBAL_REMOVE, ...(rule.remove ?? [])]);

  // Selectors are ordered most-specific first: `article.prose` before `main`,
  // otherwise a page-wide <main> would drag related-post cards into the body.
  // 80 chars is the reconcile "deficient post" threshold.
  for (const selector of rule.content ?? []) {
    try {
      const node = $(selector).first();
      if (!node.length) continue;
      if (node.text().replace(/\s+/g, " ").trim().length < 80) continue;
      return node.html() ?? "";
    } catch {
      /* skip an invalid selector and try the next one */
    }
  }

  const body = $("body").first();
  const bodyHtml = body.length ? (body.html() ?? "") : $.html();
  return bodyHtml || html;
}

function matchesAny(line: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(line));
}

/**
 * Drop lines that are pure subscription/legal chrome. Markdown links are
 * unwrapped first so `[Subscribe now](…)` matches `/^subscribe now/`.
 */
export function cleanMarkdown(md: string, key?: SenderType | string): string {
  if (!md) return "";
  const rule = contentRule(key);
  const patterns = [...GLOBAL_STRIP, ...(rule.strip ?? [])];

  const kept: string[] = [];
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    // Unwrap Markdown links/emphasis first: `[Subscribe now](url)` and
    // `_Thanks for reading!_` must match the same rules as plain text.
    const probe = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .replace(/^\s*#{1,6}\s+/, "")
      .replace(/^\s*[-+>]\s+/, "")
      .trim();
    if (probe && matchesAny(probe, patterns)) continue;
    kept.push(raw);
  }

  let result = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  for (const pattern of GLOBAL_INLINE) result = result.replace(pattern, "");
  // trailing decorative rules with nothing after them are template leftovers
  result = result
    .replace(/(?:\n[ \t]*(?:\*[ \t]*){3,})+$/, "")
    .replace(/(?:\n[ \t]*(?:-[ \t]*){3,})+$/, "");
  return result.trim();
}

/** Whether this source needs the linked article page instead of feed HTML. */
export function needsFullPage(key: SenderType | string, rule?: ContentRule): boolean {
  const resolved = rule ?? contentRule(key);
  return Boolean(resolved.fetchFull || (resolved.minChars && resolved.minChars > 0));
}

/**
 * Fetch the canonical article page when the RSS entry is a teaser.
 * Returns the original HTML on any network failure so ingestion still works
 * offline — a stub is better than no post at all.
 */
export async function resolveHtml(
  item: IngestItem,
  key: SenderType | string,
): Promise<{ html: string; upgraded: boolean }> {
  const rule = contentRule(key);
  const short = rule.minChars ? visibleLength(item.html) < rule.minChars : false;
  if (!rule.fetchFull && !short) return { html: item.html, upgraded: false };
  if (!item.link || !/^https?:\/\//.test(item.link)) {
    return { html: item.html, upgraded: false };
  }
  try {
    const response = await fetch(item.link, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { html: item.html, upgraded: false };
    const html = await response.text();
    // Some sites return a bot-check page that is shorter than the feed entry.
    if (visibleLength(html) <= visibleLength(item.html)) {
      return { html: item.html, upgraded: false };
    }
    return { html, upgraded: true };
  } catch {
    return { html: item.html, upgraded: false };
  }
}
