import { load } from "cheerio";
import type { Adapter } from "../types";
import { html2md } from "../utils/html2md";

interface MediumNode {
  nodeName: string;
  firstChild: MediumNode;
  lastChild: MediumNode;
  innerHTML: string;
  textContent: string;
  getAttribute(name: string): string | null;
}

export const mediumcom: Adapter = (_text, html) => {
  const { md } = html2md(html, {
    rules: [
      [
        "media-block",
        {
          filter: (node) => {
            const { nodeName, firstChild } = node as unknown as MediumNode;
            if (
              nodeName === "DIV" &&
              firstChild &&
              firstChild?.getAttribute?.("class")?.startsWith?.("ca cb cc cd ce")
            ) {
              return true;
            }

            return false;
          },
          replacement: (_content, node) => {
            const {
              firstChild: { firstChild, lastChild },
            } = node as unknown as MediumNode;
            const { firstChild: coverElement, lastChild: contentElemet } = lastChild;

            const $coverElement = load(coverElement.innerHTML, null, false);
            const cover = $coverElement("img").attr("src") || "/media-source/mediumcom-banner.png";
            const coverAlt = $coverElement("img").attr("alt");
            const link = $coverElement("a").attr("href");
            const $contentElement = load(contentElemet.innerHTML, null, false);
            const title = $contentElement("h2").text();
            const description = $contentElement("h3").text() || "no description";
            return `

![${coverAlt}](${cover})

## [${title}](${link})

### ${description}

- author: **${firstChild.firstChild.textContent}**

***

`;
          },
        },
      ],
    ],
  });
  const startIndex = md.indexOf("Today's highlights") || 0;
  const endIndex = md.indexOf("## See more of what you like and less of what you don’t.");
  const blogContent = md.slice(startIndex, endIndex);

  // mediumcom not have snapshot for daily digest

  return {
    blogContent,
    origin_url: "https://medium.com/",
  };
};
