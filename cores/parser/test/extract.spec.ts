import { describe, expect, it } from "vitest";
import { cleanMarkdown, extractHtml, visibleLength } from "../src/utils/extract";

describe("source-aware extraction", () => {
  it("drops scripts, styles, tracking pixels and buttons from every source", () => {
    const html = `
      <style>.secret { color: red }</style>
      <article>
        <p>Real article body with enough text to be chosen as the content root.</p>
        <button>Subscribe now</button>
        <img src="https://track.example/pixel.gif" width="1" height="1" />
      </article>
      <script>console.log('LEAK')</script>`;
    const result = extractHtml(html, "cloudflareblog");
    expect(result).not.toContain("LEAK");
    expect(result).not.toContain("color: red");
    expect(result).not.toContain("<button");
    expect(result).not.toContain("track.example");
    expect(result).toContain("Real article body");
  });

  it("prefers the most specific configured content selector", () => {
    const html = `
      <main><article class="prose"><p>${"Body text. ".repeat(20)}</p></article>
      <aside>${"Related post. ".repeat(20)}</aside></main>`;
    const result = extractHtml(html, "astro");
    expect(result).not.toContain("Related post");
    expect(result).toContain("Body text");
  });

  it("removes newsletter chrome but keeps the article sentences", () => {
    const md = [
      "# Issue 811",
      "[Read on the Web](https://example.com)",
      "",
      "The real story stays here.",
      "",
      "[Subscribe now](https://example.com/subscribe)",
      "* * *",
      "Published by Cooper Press Ltd.",
    ].join("\n");
    const result = cleanMarkdown(md, "javascriptweekly");
    expect(result).toContain("Issue 811");
    expect(result).toContain("The real story stays here.");
    expect(result).not.toMatch(/Read on the Web|Subscribe now|Cooper Press/);
    expect(result.trim()).not.toMatch(/\* \* \*$/);
  });

  it("strips per-source boilerplate such as author bios and blog footers", () => {
    const md = [
      "About the authors",
      "**Hillary** is a product marketing manager.",
      "## About the authors",
      "More real content.",
      "The post [TypeScript 7.1](https://example.com) appeared first on [TypeScript](https://example.com).",
    ].join("\n");
    const result = cleanMarkdown(md, "awsml");
    expect(result).toContain("More real content.");
    expect(result).not.toMatch(/About the authors|appeared first on/);
  });

  it("measures visible text length for teaser detection", () => {
    expect(visibleLength("<p>Hello <b>world</b></p>")).toBe(11);
    expect(visibleLength("<script>ignore me</script><p>Real</p>")).toBe(4);
  });
});
