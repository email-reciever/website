import { load } from "cheerio";
import type { Adapter } from "../types";
import { html2md } from "../utils/html2md";

export const producthunt: Adapter = (_text, html) => {
  const { md } = html2md(html);
  const startIndex = md.indexOf("TOP NEWS") || 0;
  const endIndex = md.indexOf("What did you think of today's newsletter?");
  const blogContent = md.slice(startIndex, endIndex);

  const $ = load(html, null, false);
  let origin_url: string | undefined;

  $("td.actions > a").each((_index, element) => {
    if ($(element).text().includes("Read in browser") && !origin_url) {
      origin_url = element.attribs.href;
    }
  });

  return {
    blogContent,
    origin_url,
  };
};
