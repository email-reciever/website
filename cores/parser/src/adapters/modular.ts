import { load } from "cheerio";
import type { Adapter } from "../types";
import { html2md } from "../utils/html2md";

export const modular: Adapter = (_text, html) => {
  const { md } = html2md(html);
  // slice content from the main things to sports
  const startIndex = Math.max(md.indexOf("Read Modverse Weekly"), 0);
  const endIndexMatcher = md.match(/\[!\[(")?X/);
  const blogContent = md.slice(startIndex, endIndexMatcher?.index ?? md.length);

  const $ = load(html, null, false);
  let origin_url: string | undefined;

  $("td > a").each((_index, element) => {
    if ($(element).text().includes("💫 Modverse Weekly #") && !origin_url) {
      origin_url = element.attribs.href;
    }
  });

  return {
    blogContent,
    origin_url,
  };
};
