import { load } from "cheerio";
import type { Adapter } from "../types";
import { html2md } from "../utils/html2md";

const startKeyWord = [/Issue/];
const stopKeyWord = ["Become a sponsor", "That’s a wrap!"];

export const rnn: Adapter = (_text, html) => {
  const { md } = html2md(html);
  // slice content from the main things to sports
  const startIndex = Math.max(...startKeyWord.map((v) => md.match(v)?.index ?? 0), 0);
  const endIndex = Math.max(0, ...stopKeyWord.map((v) => md.indexOf(v)));
  const blogContent = md.slice(startIndex, endIndex);

  const $ = load(html, null, false);
  let origin_url: string | undefined;

  $("td  div > a").each((_index, element) => {
    if ($(element).text().toLocaleLowerCase() === "open in browser" && !origin_url) {
      origin_url = element.attribs.href;
    }
  });

  return {
    blogContent,
    origin_url,
  };
};
