import { useSyncExternalStore } from "react";

export type Lang = "zh" | "en";

const zh = {
  feed: "/ 订阅流",
  source: "源码",
  subscribe: "订阅",
  search: "搜索归档内容",
  scroll: "向下探索",
  allSources: "/ 全部来源",
  noSignal: "没有匹配的信号",
  reset: "清除筛选",
  translated: "译",
  original: "原",
  intro: "来自 {n} 个技术订阅源的内容，自动切片、翻译、归档。",
  docs: "篇文章已归档",
  directFeeds: "个直连源",
  output: "中文输出",
  endTransmission: "传输结束",
  footerDesc: "Cloudflare Worker 接收邮件与 RSS，自动翻译生成 · 内容经 GitHub 存储 · ",
  endDoc: "文档结束",
  archived: "自动归档与翻译 · 为开放网络而作",
  contents: "目录",
  author: "作者",
  meta: "元信息",
  status: "状态",
  readOriginal: "阅读原文",
  related: "相关信号",
  noBody: "这篇文章没有正文内容，可尝试阅读原文。",
  lostSignal: "信号中断",
  noSignalTitle: "没有信号",
  notFoundDesc: "这篇文章不存在或已被移除",
  returnFeed: "返回订阅流",
  subscribeTitle: "订阅更新",
  subscribeLead: "用任意 RSS 阅读器订阅，第一时间收到翻译后的技术通讯。",
  feedUrl: "RSS 地址",
  copy: "复制",
  copied: "已复制",
  openFeed: "打开 RSS",
  latest: "最近文章",
  howTo: "如何使用",
  step1: "复制上面的 RSS 地址。",
  step2: "粘贴到 Feedly、Inoreader、NetNewsWire 或你喜欢的阅读器。",
  step3: "新文章发布后会自动出现在你的订阅流里。",
} as const;

const en: Record<keyof typeof zh, string> = {
  feed: "/ feed",
  source: "Source",
  subscribe: "Subscribe",
  search: "SEARCH THE ARCHIVE",
  scroll: "Scroll to explore",
  allSources: "/ all sources",
  noSignal: "No signal found",
  reset: "Reset filters",
  translated: "ZH",
  original: "EN",
  intro: "From {n} tech sources — sliced, translated and archived automatically.",
  docs: "documents indexed",
  directFeeds: "direct feeds",
  output: "zh-CN output",
  endTransmission: "End of transmission",
  footerDesc:
    "Cloudflare Worker receives email and RSS, translates automatically · stored on GitHub · ",
  endDoc: "End of document",
  archived: "Archived and translated automatically · Made for the open web",
  contents: "Contents",
  author: "Author",
  meta: "Meta",
  status: "Status",
  readOriginal: "Read original",
  related: "Related signal",
  noBody: "No body content available — try reading the original.",
  lostSignal: "Lost signal",
  noSignalTitle: "No signal",
  notFoundDesc: "This post does not exist or has been removed",
  returnFeed: "Return to feed",
  subscribeTitle: "Subscribe to updates",
  subscribeLead:
    "Subscribe with any RSS reader to get translated tech newsletters as soon as they land.",
  feedUrl: "RSS feed URL",
  copy: "Copy",
  copied: "Copied",
  openFeed: "Open RSS",
  latest: "Latest posts",
  howTo: "How to use",
  step1: "Copy the RSS URL above.",
  step2: "Paste it into Feedly, Inoreader, NetNewsWire or your reader of choice.",
  step3: "New translated posts appear in your feed automatically.",
};

export const DICT = { zh, en };
export type TKey = keyof typeof zh;

let current: Lang = "zh";
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLang(): Lang {
  return current;
}

export function getServerLang(): Lang {
  return "zh";
}

export function setLang(lang: Lang) {
  current = lang;
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    try {
      localStorage.setItem("lang", lang);
    } catch {
      /* private mode */
    }
  }
  for (const listener of listeners) listener();
}

export function initLang() {
  if (typeof document === "undefined") return;
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "zh" || saved === "en") setLang(saved);
  } catch {
    /* private mode */
  }
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getServerLang);
}

export function useT() {
  const lang = useLang();
  return (key: TKey, vars?: Record<string, string | number>) => {
    const value = DICT[lang][key];
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
  };
}
