import { WHITELISTS } from "@email.reciever/consts/white-lists";
import type { Frontmatter } from "@email.reciever/types/markdown-extends";
import dayjs from "dayjs";
import { dump as yamlDump } from "js-yaml";
import { type FileInfo, github } from "../adapters/github";
import { local } from "../adapters/local";
import type { WlKeys } from "../types";
import { logger } from "./logger";
import { toManifestEntry, upsertManifest } from "./manifest";

export function checkEmailSendValid(send: string) {
  return (Object.values(WHITELISTS) as string[]).includes(send);
}

export function getEmailSenderType(email: string) {
  const entry = Object.entries(WHITELISTS).find(([, value]) => value === email);
  // callers must pass checkEmailSendValid first, so the entry always exists
  return (entry?.[0] ?? "").toLowerCase() as Lowercase<WlKeys>;
}

/**
 * Compose the final markdown file: YAML frontmatter + body.
 * Output is plain markdown — no MDX/JSX involved, so the old
 * `<`/`{` escaping hacks (escapeUnsafeCharactors) are gone for good.
 */
export function composeMarkdown(content: string, frontMatter: Frontmatter) {
  const fm = yamlDump(frontMatter, { lineWidth: -1, noRefs: true });
  return `---
${fm.trimEnd()}
---

${content.trim()}
`;
}

/**
 * Publish a post:
 * 1. write `content/{author}/{timestamp}.md` to the repo (GitHub API or local dev server)
 * 2. upsert the manifest entry for the website list page
 *
 * Manifest failure does not block the post itself — it only logs.
 */
export async function createBlog(content: string, frontMatter: Frontmatter, env: Env) {
  const { author } = frontMatter;
  // timestamp filename: unique, sortable, free of special chars that break routing
  const slug = dayjs().format("YYYY-MM-DD_HH-mm-ss_SSS");
  const payload: FileInfo = {
    path: `content/${author}/${slug}.md`,
    content: composeMarkdown(content, frontMatter),
  };

  if (env.ENV === "dev") {
    await local(payload, env);
  } else {
    await github(payload, env);
  }

  try {
    await upsertManifest(toManifestEntry(frontMatter, slug), env);
  } catch (e) {
    logger(env, "manifest update failed", payload.path, e);
  }
}

export function createCommonFrontmatter(
  title: string,
  author: string,
  origin_url: string,
  date?: string | Date,
): Frontmatter {
  const parsed = dayjs(date);
  return {
    title,
    description: title,
    date: (parsed.isValid() ? parsed : dayjs()).toISOString(),
    author,
    origin_url,
    translated: true,
    avatar: `/media-source/${author}-ico.png`,
  };
}
