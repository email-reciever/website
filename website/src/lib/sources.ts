/** display metadata for every content source (whitelist key → branding) */
export interface SourceMeta {
  label: string;
  /** short zh description shown under the site title / source tabs */
  note: string;
  /** optional asset overrides — newer RSS-only sources ship typographic SVGs */
  icon?: string;
  banner?: string;
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
  weekly: {
    label: "Weekly Digest",
    note: "周总结下钻",
    icon: "/media-source/others-ico.png",
    banner: "/media-source/others-banner.png",
  },

  // RSS-only sources added 2026-11 — typographic SVG assets keep them honest
  // (no fake logos) and on-brand with the monochrome visual system.
  smashingmag: {
    label: "Smashing Mag",
    note: "前端设计与工程",
    icon: "/media-source/smashingmag-ico.svg",
    banner: "/media-source/smashingmag-banner.svg",
  },
  typescript: {
    label: "TypeScript",
    note: "TS 官方博客",
    icon: "/media-source/typescript-ico.svg",
    banner: "/media-source/typescript-banner.svg",
  },
  svelte: {
    label: "Svelte",
    note: "Svelte / SvelteKit",
    icon: "/media-source/svelte-ico.svg",
    banner: "/media-source/svelte-banner.svg",
  },
  csstricks: {
    label: "CSS-Tricks",
    note: "CSS 与 Web 前端",
    icon: "/media-source/csstricks-ico.svg",
    banner: "/media-source/csstricks-banner.svg",
  },
  importai: {
    label: "Import AI",
    note: "AI 政策与观察",
    icon: "/media-source/importai-ico.svg",
    banner: "/media-source/importai-banner.svg",
  },
  mittechai: {
    label: "MIT Tech AI",
    note: "MIT 科技评论 AI",
    icon: "/media-source/mittechai-ico.svg",
    banner: "/media-source/mittechai-banner.svg",
  },
  garymarcus: {
    label: "Gary Marcus",
    note: "AI 深度评论",
    icon: "/media-source/garymarcus-ico.svg",
    banner: "/media-source/garymarcus-banner.svg",
  },
  awsml: {
    label: "AWS ML",
    note: "AWS 机器学习博客",
    icon: "/media-source/awsml-ico.svg",
    banner: "/media-source/awsml-banner.svg",
  },
};

export function sourceLabel(key: string): string {
  return SOURCES[key]?.label ?? key;
}

export function sourceNote(key: string): string {
  return SOURCES[key]?.note ?? "";
}

export function sourceIcon(key: string): string {
  return SOURCES[key]?.icon ?? `/media-source/${key}-ico.png`;
}

export function sourceBanner(key: string): string {
  return SOURCES[key]?.banner ?? `/media-source/${key}-banner.png`;
}

/** site-level metadata */
export const SITE = {
  title: "Email Reciever",
  description: "订阅邮件自动翻译与归档 —— 技术 newsletter 的中文阅读站",
  repo: "https://github.com/email-reciever/website",
};
