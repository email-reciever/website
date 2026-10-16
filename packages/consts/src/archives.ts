/**
 * 列表页爬取型直连订阅。
 *
 * 适用于没有 RSS 的源:拉取归档/列表页 → 提取文章链接 → 逐篇抓取页面,
 * 复用与邮件完全相同的切片/翻译/发布管线。
 *
 * - `selector`:列表页上的条目链接(cheerio 选择器)
 * - `base`:相对链接转绝对地址的前缀
 * - `linkPattern`:可选,进一步过滤 href
 * - `titleMatch`:可选,从页面 标题 提取干净标题的正则(取捕获组 1)
 * - mode 语义与 rss.ts 相同:`newsletter` 复用邮件 adapter 切片,
 *   `article` 直接 html2md
 */
export interface ArchiveSource {
  list: string;
  selector: string;
  base: string;
  linkPattern?: string;
  titleMatch?: string;
  mode: "newsletter" | "article";
}

export const ARCHIVES_SOURCES = {
  // Bytes 归档页(每期内容与邮件正文一致,tyler adapter 的切片标记齐全)
  tyler: {
    list: "https://bytes.dev/archives",
    selector: 'a[href^="/archives/"]',
    base: "https://bytes.dev",
    linkPattern: "^/archives/\\d+$",
    titleMatch: "Bytes #\\d+ - (.*)",
    mode: "newsletter",
  },
  // Alex Kondov 的博客归档(SSR,article-link 类名是稳定选择器)
  alexkondov: {
    list: "https://alexkondov.com/articles/",
    selector: "a.article-link",
    base: "https://alexkondov.com",
    titleMatch: "(.*) \\| Alex Kondov$",
    mode: "article",
  },
} as const satisfies Record<string, ArchiveSource>;

export type ArchiveSourceKey = Lowercase<keyof typeof ARCHIVES_SOURCES>;
