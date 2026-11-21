import { getManifest } from "./content";
import type { ManifestEntry } from "./types";

export interface WeekInfo {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

export interface WeeklyDigest {
  week: WeekInfo;
  generatedAt: string;
  total: number;
  sources: Array<{ author: string; count: number }>;
  keywords: Array<{ word: string; count: number }>;
  highlights: ManifestEntry[];
  recommendations: ManifestEntry[];
  /** down-drilled articles saved when Browserless CDP is available */
  drilled: Array<{ title: string; url: string; excerpt: string }>;
  /** editor-written deep summary in Markdown */
  editorial?: string;
  source: "browserless" | "archive";
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "you",
  "are",
  "how",
  "what",
  "why",
  "when",
  "into",
  "about",
  "more",
  "new",
  "use",
  "using",
  "guide",
  "introducing",
  "everything",
  "need",
  "know",
  "best",
  "first",
  "get",
  "make",
  "will",
  "has",
  "have",
]);

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

/** Week window: Monday 00:00 → Sunday 20:00, Asia/Shanghai (+08:00). */
export function weekInfo(input?: string): WeekInfo {
  const now = input ? new Date(`${input}T00:00:00+08:00`) : new Date();
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const day = (local.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day),
  );
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const start = new Date(monday.getTime() - 8 * 60 * 60 * 1000);
  const end = new Date(sunday.getTime() + (20 - 8) * 60 * 60 * 1000);
  const year = monday.getUTCFullYear();
  const weekStart = Date.UTC(year, 0, 1);
  const weekNo = Math.ceil((monday.getTime() - weekStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const key = `${year}-W${pad(weekNo)}`;
  return {
    key,
    label: `${monday.getUTCFullYear()}/${pad(monday.getUTCMonth() + 1)}/${pad(monday.getUTCDate())} — ${sunday.getUTCFullYear()}/${pad(sunday.getUTCMonth() + 1)}/${pad(sunday.getUTCDate())} 20:00`,
    start,
    end,
  };
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ");
}

function dedupe(posts: ManifestEntry[]): ManifestEntry[] {
  const seen = new Set<string>();
  return posts.filter((post) => {
    const key = normalize(post.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function keywords(posts: ManifestEntry[]) {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const words = new Set(
      normalize(post.title)
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    );
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 24)
    .map(([word, count]) => ({ word, count }));
}

/** Extractive "AI-style" summary: no external LLM needed, deterministic and
 * safe to render on SSR. Swappable for a real LLM via `summarizeWithAI`. */
export async function buildWeeklyDigest(weekKey?: string): Promise<WeeklyDigest> {
  const week = weekInfo(weekKey);
  const { posts } = await getManifest();
  const inWindow = posts.filter((post) => {
    const time = new Date(post.date).getTime();
    return Number.isFinite(time) && time >= week.start.getTime() && time <= week.end.getTime();
  });
  const unique = dedupe(inWindow);

  const sourceCounts = new Map<string, number>();
  for (const post of unique)
    sourceCounts.set(post.author, (sourceCounts.get(post.author) ?? 0) + 1);

  // Recommendations: spread across sources, prefer recent + translated posts.
  const perSource = new Map<string, number>();
  const recommendations = [...unique]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((post) => {
      const used = perSource.get(post.author) ?? 0;
      if (used >= 2) return false;
      perSource.set(post.author, used + 1);
      return true;
    })
    .slice(0, 12);

  let drilled: WeeklyDigest["drilled"] = [];
  let editorial: string | undefined;
  let source: WeeklyDigest["source"] = "archive";
  try {
    const saved = await getSavedDigest(week.key);
    if (saved) {
      drilled = saved.drilled ?? [];
      source = saved.source === "browserless" ? "browserless" : "archive";
      editorial = saved.editorial;
    }
  } catch {
    /* keep the extractive digest */
  }

  return {
    week,
    generatedAt: new Date().toISOString(),
    total: unique.length,
    sources: [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([author, count]) => ({ author, count })),
    keywords: keywords(unique),
    highlights: unique.slice(0, 6),
    recommendations,
    drilled,
    editorial,
    source,
  };
}

async function getSavedDigest(key: string): Promise<WeeklyDigest | null> {
  const origin = "https://raw.githubusercontent.com/email-reciever/website/main";
  const response = await fetch(`${origin}/weekly/${key}.json?v=20261121`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  return (await response.json()) as WeeklyDigest;
}

/** Optional hook for a real LLM/Chrome-AI summarizer. Kept as an interface so a
 * Browserless self-hosted Gemini Nano or an API key can be plugged in later. */
export async function summarizeWithAI(
  input: string,
  options?: { provider?: "browserless-ai" | "api"; endpoint?: string },
): Promise<string> {
  void input;
  void options;
  throw new Error("AI summarizer not configured — using extractive summary");
}
