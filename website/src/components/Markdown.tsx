import { highlightThemeCss } from "@/lib/highlight";

/**
 * Rendered markdown output. The HTML was produced server-side by
 * @tanstack/markdown with `allowHtml` (trusted-content boundary) and then
 * passed through the sanitize-html allowlist in lib/markdown.ts, so
 * dangerouslySetInnerHTML is safe here. The highlight theme CSS is inlined
 * once per page, scoped to `.markdown-body` + daisyUI's data-theme.
 */
export function Markdown({ html }: { html: string }) {
  return (
    <div className="markdown-body">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized output from lib/markdown.ts (allowlist + URL schemes) */}
      <style dangerouslySetInnerHTML={{ __html: highlightThemeCss }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized output from lib/markdown.ts (allowlist + URL schemes) */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
