/**
 * Content source: the GitHub repository itself.
 *
 * The site no longer bundles content at build time (that is what blew up
 * the Cloudflare Pages build). Instead it reads posts from
 * raw.githubusercontent.com at request time, behind a two-level cache:
 *
 *   1. edge cache (`caches.default`) — shared across worker instances,
 *      survives cold starts, keyed by raw URL
 *   2. per-instance in-memory map — absorbs hot traffic with zero IO
 *
 * Fallbacks degrade gracefully: if the Cache API is unavailable (local dev),
 * only the memory map is used.
 */
import { ORGWITHREPO } from "@email.reciever/consts/github";
import { splitFrontmatter } from "./frontmatter";
import { renderMarkdown } from "./markdown";
import type { ListQuery, ListResult, Manifest, ManifestEntry, PostPage } from "./types";

const BRANCH = "main";
const MANIFEST_TTL = 5 * 60 * 1000; // 5min — new posts appear quickly
const POST_TTL = 60 * 60 * 1000; // 1h — post content is immutable
const PAGE_SIZE = 24;
const RENDER_CACHE_LIMIT = 64;

const rawURL = (path: string) =>
  `https://raw.githubusercontent.com/${ORGWITHREPO}/${BRANCH}/${path.split("/").map(encodeURIComponent).join("/")}`;

type CacheBucket = { body: string; expires: number };
const memCache = new Map<string, CacheBucket>();

/** rendered post pages cache — markdown → html is the expensive part */
const renderCache = new Map<string, PostPage>();

function getEdgeCache(): Cache | undefined {
  try {
    return (globalThis.caches as CacheStorage & { default?: Cache }).default;
  } catch {
    return undefined;
  }
}

async function cachedText(url: string, ttl: number): Promise<string> {
  const hit = memCache.get(url);
  if (hit && hit.expires > Date.now()) {
    return hit.body;
  }

  const edge = getEdgeCache();
  if (edge) {
    try {
      const cached = await edge.match(url);
      if (cached) {
        const body = await cached.text();
        memCache.set(url, { body, expires: Date.now() + ttl });
        return body;
      }
    } catch {
      // cache read failure — fall through to network
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`content fetch failed: ${url} → ${response.status}`);
  }
  const body = await response.text();

  memCache.set(url, { body, expires: Date.now() + ttl });

  if (edge) {
    try {
      // best-effort edge write; failure is non-fatal
      await edge.put(
        new Request(url),
        new Response(body, {
          headers: {
            "content-type": response.headers.get("content-type") ?? "text/plain; charset=utf-8",
            "cache-control": `public, max-age=${Math.floor(ttl / 1000)}`,
          },
        }),
      );
    } catch {
      // ignore
    }
  }

  return body;
}

export async function getManifest(): Promise<Manifest> {
  const raw = await cachedText(rawURL("manifest.json"), MANIFEST_TTL);
  const manifest = JSON.parse(raw) as Manifest;
  return { posts: manifest.posts ?? [] };
}

export async function listPosts(query: ListQuery): Promise<ListResult> {
  const { source, q, page = 1 } = query;
  const all = (await getManifest()).posts;
  const counts: Record<string, number> = {};
  for (const post of all) {
    counts[post.author] = (counts[post.author] ?? 0) + 1;
  }

  const keyword = q?.trim().toLowerCase();
  const filtered = all.filter((post) => {
    if (source && source !== "all" && post.author !== source) return false;
    if (keyword) {
      const haystack =
        `${post.title} ${post.description ?? ""} ${post.subAuthor ?? ""}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;

  return {
    total,
    page: safePage,
    pageSize: PAGE_SIZE,
    totalPages,
    posts: filtered.slice(start, start + PAGE_SIZE),
    counts,
  };
}

export async function getRelatedPosts(
  author: string,
  excludeSlug: string,
  limit = 6,
): Promise<ManifestEntry[]> {
  const all = (await getManifest()).posts;
  return all.filter((post) => post.author === author && post.slug !== excludeSlug).slice(0, limit);
}

export async function getPostPage(author: string, slug: string): Promise<PostPage> {
  const cacheKey = `${author}/${slug}`;
  const rendered = renderCache.get(cacheKey);
  if (rendered) {
    return rendered;
  }

  const raw = await cachedText(rawURL(`content/${author}/${slug}.md`), POST_TTL);
  const { frontmatter, body } = splitFrontmatter(raw);

  const entry: PostPage["entry"] = {
    author,
    slug,
    title: frontmatter.title ?? slug,
    description: frontmatter.description,
    date: frontmatter.date ?? "",
    origin_url: frontmatter.origin_url,
    origin_site: frontmatter.origin_site,
    subAuthor: frontmatter.subAuthor,
    avatar: frontmatter.avatar,
    banner: frontmatter.banner,
    translated: frontmatter.translated,
    email_recorder: frontmatter.email_recorder,
  };

  const html = renderMarkdown(body);

  // simple LRU-ish trim to bound memory
  if (renderCache.size >= RENDER_CACHE_LIMIT) {
    const oldest = renderCache.keys().next().value;
    if (oldest) renderCache.delete(oldest);
  }
  const page = { entry, html };
  renderCache.set(cacheKey, page);
  return page;
}
