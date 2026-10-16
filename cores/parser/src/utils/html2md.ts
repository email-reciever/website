/**
 * @description make common rules for transform html to markdown
 */
import * as cheerio from "cheerio";
import { type Options, type Rule, td } from "./td";

export function html2md(
  html: string,
  options?: Partial<Options> & { rules?: [key: string, rule: Rule][] },
) {
  const { rules = [], ...restOptions } = options ?? {};
  const services = new td({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    ...restOptions,
  });

  for (const rule of rules) {
    services.addRule(...rule);
  }

  services.addRule("image-sources", {
    filter: (node) => {
      const imageNode = node as HTMLImageElement;
      const src = imageNode.getAttribute("src") || "";
      return /data:image\/svg\+xml/.test(src);
    },
    replacement: () => "",
  });

  // only use body for translate
  const bodyHTML = cheerio.load(html, null, false).html();
  return {
    bodyHTML,
    services,
    md: services.turndown(bodyHTML ?? html),
  } as const;
}
