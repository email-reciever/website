export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/** Pull stable heading IDs from the sanitized markdown HTML for the TOC rail.
 * TanStack Markdown already generates duplicate-safe IDs, so these anchors are
 * reliable across SSR and client navigation. */
export function extractHeadings(html: string): TocItem[] {
  const re = /<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  const items: TocItem[] = [];
  for (const match of html.matchAll(re)) {
    const text = match[3]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();
    if (text) items.push({ id: match[2], text, level: Number(match[1]) });
  }
  return items;
}
