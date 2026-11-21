import { createFileRoute } from "@tanstack/react-router";
import { getManifest } from "@/lib/content";
import { SITE, sourceLabel } from "@/lib/sources";

const FALLBACK_ORIGIN = "https://email-reciever-website.jiangjiangjiangxi.workers.dev";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** Our own RSS 2.0 feed, built from the same manifest the site reads.
 * Stable GUIDs, real pubDates and an ETag make it feed-reader and CDN friendly. */
export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin || FALLBACK_ORIGIN;
        const feedUrl = `${origin}/rss.xml`;
        const { posts } = await getManifest();

        const items = posts.slice(0, 50).map((post) => {
          const link = `${origin}/post/${encodeURIComponent(post.author)}/${encodeURIComponent(post.slug)}`;
          const date = new Date(post.date);
          const pubDate = Number.isNaN(date.getTime())
            ? new Date(0).toUTCString()
            : date.toUTCString();
          return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(post.description ?? post.title)}</description>
      <category>${escapeXml(sourceLabel(post.author))}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
        });

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.title)} — 中文技术订阅</title>
    <link>${origin}/</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>zh-CN</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>
`;
        const etag = `"${hash(body)}"`;
        const headers = {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          ETag: etag,
        };
        const incoming = request.headers.get("If-None-Match");
        if (incoming?.split(",").some((v) => v.trim().replace(/^W\//, "") === etag)) {
          return new Response(null, { status: 304, headers });
        }
        return new Response(body, { status: 200, headers });
      },
    },
  },
});
