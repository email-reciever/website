/**
 * TanStack Highlight instance wired into TanStack Markdown's code blocks.
 *
 * Grammars are registered server-side only (renderMarkdown runs in the SSR
 * server function); unknown fence languages degrade to escaped plain text.
 */
import { createHighlighter } from "@tanstack/highlight/core";
import { cpp } from "@tanstack/highlight/languages/cpp";
import { csharp } from "@tanstack/highlight/languages/csharp";
import { css } from "@tanstack/highlight/languages/css";
import { diff } from "@tanstack/highlight/languages/diff";
import { dockerfile } from "@tanstack/highlight/languages/dockerfile";
import { env } from "@tanstack/highlight/languages/env";
import { go } from "@tanstack/highlight/languages/go";
import { html } from "@tanstack/highlight/languages/html";
import { http } from "@tanstack/highlight/languages/http";
import { java } from "@tanstack/highlight/languages/java";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { jsx } from "@tanstack/highlight/languages/jsx";
import { kotlin } from "@tanstack/highlight/languages/kotlin";
import { markdown } from "@tanstack/highlight/languages/markdown";
import { php } from "@tanstack/highlight/languages/php";
import { plaintext } from "@tanstack/highlight/languages/plaintext";
import { python } from "@tanstack/highlight/languages/python";
import { ruby } from "@tanstack/highlight/languages/ruby";
import { rust } from "@tanstack/highlight/languages/rust";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { swift } from "@tanstack/highlight/languages/swift";
import { toml } from "@tanstack/highlight/languages/toml";
import { ts } from "@tanstack/highlight/languages/ts";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { yaml } from "@tanstack/highlight/languages/yaml";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";
import { createThemeCss } from "@tanstack/highlight/theme";
import { githubDarkTheme } from "@tanstack/highlight/themes/github-dark";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";

const highlighter = createHighlighter({
  languages: [
    plaintext,
    html,
    css,
    js,
    jsx,
    ts,
    tsx,
    json,
    yaml,
    toml,
    shell,
    sql,
    go,
    rust,
    python,
    java,
    csharp,
    cpp,
    php,
    ruby,
    swift,
    kotlin,
    markdown,
    diff,
    http,
    dockerfile,
    env,
  ],
});

/** escaped token markup for the inside of Markdown's own `<pre><code>` tree */
export const markdownCodeHighlighter = createTanStackMarkdownHighlighter(highlighter);

/**
 * Token/theme CSS, scoped to daisyUI's data-theme switching:
 * dim (default dark) / light. The Markdown component inlines this once.
 */
export const highlightThemeCss = createThemeCss({
  light: githubLightTheme,
  dark: githubDarkTheme,
  lightSelector: ':root[data-theme="light"] .markdown-body',
  darkSelector: ':root[data-theme="dim"] .markdown-body',
  codeBlockSelector: ".markdown-body pre.tm-code",
  lineNumbersSelector: ".markdown-body .tm-code--line-numbers",
});
