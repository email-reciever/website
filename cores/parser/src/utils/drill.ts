/**
 * Weekly down-drill: use Browserless `/content` REST with the Worker-held
 * BROWSERLESS_KEY, then extract prose + outbound article links. Runs in the
 * Worker so the secret never has to leave Cloudflare.
 */
import { CRAWL_HEADERS } from "./ingest";

const ENDPOINT = "https://production-sfo.browserless.io/content";

export interface DrilledItem {
  source: string;
  title: string;
  text: string;
  links: Array<{ url: string; text: string }>;
  images: string[];
}

const decode = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

export async function drillUrls(urls: string[], env: Env): Promise<DrilledItem[]> {
  if (!env.BROWSERLESS_KEY) throw new Error("BROWSERLESS_KEY not configured");
  const out: DrilledItem[] = [];

  for (const url of urls.slice(0, 5)) {
    if (!url.startsWith("http")) continue;
    try {
      const response = await fetch(`${ENDPOINT}?token=${env.BROWSERLESS_KEY}`, {
        method: "POST",
        headers: { ...CRAWL_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ url, waitForTimeout: 1200 }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error(`browserless ${response.status}`);
      const html = (await response.text()).slice(0, 300_000);

      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
      const title = titleMatch ? decode(titleMatch[1].replace(/<[^>]+>/g, "")) : url;

      const text = decode(
        html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " "),
      ).slice(0, 12_000);

      const links: DrilledItem["links"] = [];
      const linkRe = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      for (const match of html.matchAll(linkRe)) {
        if (links.length >= 5) break;
        const text = decode(match[2].replace(/<[^>]+>/g, ""));
        const target = decode(match[1]);
        if (text.length < 12 || target.includes(new URL(url).hostname)) continue;
        if (links.some((item) => item.url === target)) continue;
        links.push({ url: target, text: text.slice(0, 160) });
      }
      const images: string[] = [];
      const imgRe = /<img[^>]+(?:src|data-src)="(https?:\/\/[^"]+)"[^>]*>/gi;
      for (const match of html.matchAll(imgRe)) {
        if (images.length >= 4) break;
        const src = decode(match[1]);
        if (!images.includes(src)) images.push(src);
      }
      out.push({ source: url, title, text, links, images });
    } catch (error) {
      out.push({
        source: url,
        title: url,
        text: `drill failed: ${String(error)}`,
        links: [],
        images: [],
      });
    }
  }
  return out;
}
