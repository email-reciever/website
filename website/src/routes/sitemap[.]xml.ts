import { createFileRoute } from "@tanstack/react-router";
import { getManifest } from "@/lib/content";

const FALLBACK_ORIGIN = "https://email-reciever-website.jiangjiangjiangxi.workers.dev";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** All post URLs + the archive, for Google / Bing / LLM crawlers. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin || FALLBACK_ORIGIN;
        const { posts } = await getManifest();

        const urls = [
          `  <url><loc>${origin}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
          `  <url><loc>${origin}/subscribe</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
          ...posts.map((post) => {
            const loc = `${origin}/post/${encodeURIComponent(post.author)}/${encodeURIComponent(post.slug)}`;
            const date = new Date(post.date);
            const lastmod = Number.isNaN(date.getTime())
              ? ""
              : `<lastmod>${date.toISOString().slice(0, 10)}</lastmod>`;
            return `  <url><loc>${escapeXml(loc)}</loc>${lastmod}<changefreq>monthly</changefreq><priority>0.7</priority></url>`;
          }),
        ];

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
