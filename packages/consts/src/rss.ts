/**
 * RSS 直连订阅源配置。
 *
 * mode 语义:
 * - `newsletter`:feed 条目即完整一期邮件(RSS 内容 = 邮件 HTML),
 *   走既有邮件 adapter 的切片逻辑,无需新写切片规则
 * - `article`:feed 条目是单篇文章,直接 html2md 后发布(按需翻译)
 *
 * 未列入的源继续走 Gmail 转发链路(无公开 RSS)。
 * react.status.com 与 cooperpress 其余刊物同属一个发行系统,/rss 路径一致。
 */
export interface RssSource {
  feed: string;
  mode: "newsletter" | "article";
}

export const RSS_SOURCES = {
  javascriptweekly: {
    feed: "https://javascriptweekly.com/rss",
    mode: "newsletter",
  },
  nodeweekly: {
    feed: "https://nodeweekly.com/rss",
    mode: "newsletter",
  },
  frontendfocus: {
    feed: "https://frontendfoc.us/rss",
    mode: "newsletter",
  },
  reactstatus: {
    feed: "https://react.status.com/rss",
    mode: "newsletter",
  },
  cloudflareblog: {
    feed: "https://blog.cloudflare.com/rss",
    mode: "article",
  },
  astro: {
    feed: "https://astro.build/rss.xml",
    mode: "article",
  },
  reactdigest: {
    feed: "https://reactdigest.net/newsletters.rss",
    mode: "article",
  },
} as const satisfies Record<string, RssSource>;

export type RssSourceKey = Lowercase<keyof typeof RSS_SOURCES>;
