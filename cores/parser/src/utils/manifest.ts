/**
 * @description manifest.json maintenance.
 *
 * The website reads manifest.json (via raw.githubusercontent CDN) as the
 * single source of the post list, so the list page never needs to walk
 * the whole content tree or parse frontmatter of every file.
 * The parser keeps it in sync every time a post is published.
 */

import type { Frontmatter } from "@email.reciever/types/markdown-extends";
import { type FileInfo, github, githubRead } from "../adapters/github";
import { local, localRead } from "../adapters/local";

export const MANIFEST_PATH = "manifest.json";

export interface ManifestEntry {
  author: string;
  /** filename without extension, unique inside the author dir */
  slug: string;
  title: string;
  description?: string;
  date: string;
  origin_url?: string;
  origin_site?: string;
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

  const { content = '{ "posts": [] }', sha } = response ?? {};
  return { manifest: JSON.parse(content) as Manifest, sha };
}

/**
 * Insert or update one entry, keep posts sorted by date desc.
 * `sha` is required when the manifest already exists on GitHub (update).
 */
export async function upsertManifest(entry: ManifestEntry, env: Env) {
  const { manifest, sha } = await readManifest(env);
  const posts = manifest.posts ?? [];
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
}
