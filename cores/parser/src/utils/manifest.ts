/**
 * @description manifest.json maintenance.
 *
 * The website reads manifest.json (via raw.githubusercontent CDN) as the
 * single source of the post list, so the list page never needs to walk
 * the whole content tree or parse frontmatter of every file.
 * The parser keeps it in sync every time a post is published.
 *
 * Concurrency: the RSS fan-out runs several sources at once, each publishing
 * through createBlog → upsertManifest. A failed read must NEVER be treated as
 * an empty index (that would shrink the manifest to just the current post),
 * and read-modify-write must retry when another writer changed the file.
 */

import type { Frontmatter } from "@email.reciever/types/markdown-extends";
import { type FileInfo, github, githubRead } from "../adapters/github";
import { local, localRead } from "../adapters/local";

export const MANIFEST_PATH = "manifest.json";

/** tripwire: a healthy index has thousands of posts; refuse to write a
 * truncated one produced by a failed/stale GitHub read. */
const MIN_SAFE_POSTS = 100;
const MAX_RETRIES = 5;

export interface ManifestEntry {
  author: string;
  /** filename without extension, unique inside the author dir */
  slug: string;
  title: string;
  description?: string;
  date: string;
  origin_url?: string;
  origin_site?: string;
  email_recorder?: string;
  subAuthor?: string;
  avatar?: string;
  banner?: string;
  translated?: boolean;
}

export interface Manifest {
  posts: ManifestEntry[];
}

/** project frontmatter onto the slim entry the list page needs */
export function toManifestEntry(fm: Frontmatter, slug: string): ManifestEntry {
  return {
    author: fm.author,
    slug,
    title: fm.title,
    description: fm.description,
    date: fm.date,
    origin_url: fm.origin_url,
    origin_site: fm.origin_site,
    subAuthor: fm.subAuthor,
    avatar: fm.avatar,
    banner: fm.banner,
    translated: fm.translated,
  };
}

export async function readManifest(env: Env): Promise<{ manifest: Manifest; sha?: string }> {
  let response: { content?: string; sha?: string } | undefined;
  if (env.ENV === "dev") {
    response = await localRead(MANIFEST_PATH, env);
  } else {
    response = await githubRead(MANIFEST_PATH, env);
  }

  if (!response?.content) {
    // Never fall back to `{ posts: [] }` — a transient 404/500 would otherwise
    // make the next write replace the whole index with a single entry.
    throw new Error("manifest read failed — refusing to write an empty index");
  }
  return { manifest: JSON.parse(response.content) as Manifest, sha: response.sha };
}

/**
 * Insert or update one entry, keep posts sorted by date desc.
 * Retries with a fresh read when a concurrent fan-out writer changed the file.
 */
export async function upsertManifest(entry: ManifestEntry, env: Env) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { manifest, sha } = await readManifest(env);
      const posts = manifest.posts ?? [];
      if (posts.length < MIN_SAFE_POSTS) {
        throw new Error(`manifest has only ${posts.length} posts — aborting write`);
      }

      const index = posts.findIndex((p) => p.author === entry.author && p.slug === entry.slug);
      if (index >= 0) {
        posts[index] = entry;
      } else {
        posts.push(entry);
      }
      posts.sort((a, b) => (a.date < b.date ? 1 : -1));

      const payload: FileInfo = {
        path: MANIFEST_PATH,
        content: JSON.stringify({ ...manifest, posts }),
        ...(sha ? { sha } : {}),
      };

      if (env.ENV === "dev") {
        await local(payload, env);
      } else {
        await github(payload, env);
      }
      return;
    } catch (e) {
      if (attempt === MAX_RETRIES - 1) throw e;
      // back off briefly so the competing writer can finish its commit
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}
