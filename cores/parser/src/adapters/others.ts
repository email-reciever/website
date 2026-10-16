import type { Adapter } from "../types";
import { html2md } from "../utils/html2md";

/**
 * Fallback adapter for manually recorded pages (issue template).
 * Expects `startmark` / `endmark` headers carrying slice anchors,
 * and an optional `nextorigin` header passed through to turndown
 * (rewrites /_next/image proxy URLs back to their origin).
 */
export const others: Adapter = (_text, html, headers) => {
  const nextOrigin = headers?.find?.((v) => v.key === "nextorigin")?.value;
  const { md } = html2md(html, nextOrigin ? { nextOrigin } : undefined);

  const startMark = headers?.find?.((v) => v.key === "startmark")?.value;
  const endMark = headers?.find?.((v) => v.key === "endmark")?.value;
  const startIndex = startMark ? Math.max(md.indexOf(startMark), 0) : 0;
  const endIndex = endMark ? md.lastIndexOf(endMark) : undefined;

  const blogContent = md.slice(startIndex, endIndex);

  return {
    blogContent,
  };
};
