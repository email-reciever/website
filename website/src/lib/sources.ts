/** display metadata for every content source (whitelist key → branding) */
export interface SourceMeta {
  label: string;
  /** short zh description shown under the site title / source tabs */
  note: string;
}

export const SOURCES: Record<string, SourceMeta> = {
  ajiang: { label: "Ajiang", note: "自留地" },
  alexkondov: { label: "Alex Kondov", note: "React/TS 长文" },
  arcupdate: { label: "Arc Update", note: "Arc 浏览器动态" },
  astro: { label: "Astro", note: "框架官方通讯" },
  cloudflareblog: { label: "Cloudflare Blog", note: "Cloudflare 官方博客" },
  frontendfocus: { label: "Frontend Focus", note: "前端周刊" },
  insidergithub: { label: "GitHub Insider", note: "GitHub 官方通讯" },
  javascriptweekly: { label: "JavaScript Weekly", note: "JS 周刊" },
  mediumcom: { label: "Medium", note: "Medium 精选" },
  modular: { label: "Modular", note: "Mojo / AI 生态" },
  nodeweekly: { label: "Node Weekly", note: "Node 周刊" },
  others: { label: "Others", note: "其他收录" },
  producthunt: { label: "Product Hunt", note: "新品发现" },
  reactdigest: { label: "React Digest", note: "React 文摘" },
  reactstatus: { label: "React Status", note: "React 周刊" },
  rnn: { label: "React Native Newsletter", note: "RN 双周报" },
  syntaxfm: { label: "Syntax", note: "Syntax 通讯" },
  tyler: { label: "Bytes", note: "ui.dev 出品" },
  zhihu: { label: "知乎专栏", note: "中文技术周刊" },
};

export function sourceLabel(key: string): string {
  return SOURCES[key]?.label ?? key;
}

export function sourceNote(key: string): string {
  return SOURCES[key]?.note ?? "";
}

export function sourceIcon(key: string): string {
  return `/media-source/${key}-ico.png`;
}

export function sourceBanner(key: string): string {
  return `/media-source/${key}-banner.png`;
}

/** site-level metadata */
export const SITE = {
  title: "Email Reciever",
  description: "订阅邮件自动翻译与归档 —— 技术 newsletter 的中文阅读站",
  repo: "https://github.com/email-reciever/website",
};
