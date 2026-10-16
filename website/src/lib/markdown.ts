/**
 * Markdown → sanitized HTML via @tanstack/markdown.
 *
 * Why not unified/remark: TanStack Markdown is a small synchronous parser
 * built for exactly this shape of content (atx headings, tables, task lists,
 * fenced code, footnotes) and renders deterministic HTML with stable heading
 * IDs — see the syntax profile:
 * https://tanstack.com/markdown/latest/docs/core-concepts/syntax-profile
 *
 * Pipeline:
 * 1. renderHtml with `allowHtml` — legacy content keeps raw HTML
 *    (<a>, <blockquote>, <video>, …), which the parser passes through verbatim
 * 2. sanitize-html — `allowHtml` is a *trusted-content boundary* and our
 *    content originates from third-party newsletter emails, so the output is
 *    always sanitized with an explicit allowlist (tags, attributes, URL
 *    schemes, and a text-align-only style policy)
 *
 * Code highlighting runs through TanStack Highlight's markdown adapter, which
 * returns escaped token markup inside Markdown's own <pre><code> tree.
 */

import type { CodeHighlighter } from "@tanstack/markdown";
import { renderHtml } from "@tanstack/markdown/html";
import sanitizeHtml from "sanitize-html";

import { markdownCodeHighlighter } from "./highlight";

const highlighter: CodeHighlighter = markdownCodeHighlighter;

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    // block
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "blockquote",
    "ul",
    "ol",
    "li",
    "hr",
    "section",
    "figure",
    "figcaption",
    "details",
    "summary",
    "div",
    // inline
    "a",
    "em",
    "strong",
    "b",
    "i",
    "del",
    "s",
    "code",
    "pre",
    "span",
    "br",
    "sup",
    "sub",
    "img",
    // task-list checkboxes
    "input",
    // tables
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    // media (turndown fork preserves these from emails)
    "video",
    "source",
  ],
  allowedAttributes: {
    // tanstack highlight token classes + tm-code block classes
    "*": ["class"],
    // stable duplicate-safe heading ids from tanstack markdown
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "srcset", "alt", "title", "loading", "width", "height"],
    video: ["src", "poster", "controls", "preload", "width", "height", "muted", "loop"],
    source: ["src", "type"],
    input: ["type", "checked", "disabled"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  // table alignment is the only style the renderer emits; everything else drops
  allowedStyles: {
    th: { "text-align": [/^(left|center|right)$/] },
    td: { "text-align": [/^(left|center|right)$/] },
  },
  transformTags: {
    // footnote links inside our own pages stay in-app
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

export function renderMarkdown(markdown: string): string {
  const raw = renderHtml(markdown, {
    allowHtml: true,
    highlighter,
  });
  return sanitizeHtml(raw, sanitizeOptions);
}
