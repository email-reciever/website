import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { formatDate } from "@/lib/date";
import { sourceLabel } from "@/lib/sources";
import { buildWeeklyDigest, type WeeklyDigest, weekInfo } from "@/lib/weekly";

const fetchDigest = createServerFn({ method: "GET" })
  .validator((data: { week?: string }) => data)
  .handler(({ data }) => buildWeeklyDigest(data.week));

export const Route = createFileRoute("/weekly")({
  validateSearch: (search: Record<string, unknown>) => ({
    week:
      typeof search.week === "string" && /^\d{4}-W\d{2}$/.test(search.week)
        ? search.week
        : undefined,
  }),
  loaderDeps: ({ search }) => ({ week: search.week }),
  loader: ({ deps }) => fetchDigest({ data: deps }),
  head: () => ({
    meta: [
      { title: "周总结 / Weekly — Email Reciever" },
      { name: "description", content: "每周一至周日 20:00 的技术内容去重总结与推荐" },
    ],
  }),
  component: WeeklyPage,
});

function WeeklyPage() {
  const digest = Route.useLoaderData() as WeeklyDigest;
  const { week } = Route.useSearch();
  const current = weekInfo();

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
      <section className="hero-stage weekly-hero mb-12 border-b border-base-300/60">
        <div className="scan-grid absolute inset-0" />
        <div className="hero-content relative flex flex-col gap-5 px-1 py-12">
          <div className="mono-label">Email Reciever / weekly signal</div>
          <h1 className="display-caps text-[clamp(2.6rem,8vw,6rem)] text-base-content">
            Weekly
            <br />
            <span className="text-[var(--signal)]">digest.</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--stage-muted)]">
            {digest.week.label} · 去重后 {digest.total} 篇 · 按来源分布与关键词生成摘要与推荐
          </p>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.14em] text-[var(--stage-meta)] uppercase">
            <span>window: mon 00:00 → sun 20:00 +08</span>
            <span className="text-[var(--signal)]">/</span>
            <span>{digest.source === "browserless" ? "CDP 下钻已启用" : "归档摘要"}</span>
          </div>
        </div>
      </section>

      <div className="mb-10 flex flex-wrap items-center gap-3">
        <span className="mono-label">select week</span>
        <Link
          to="/weekly"
          search={{ week: undefined }}
          className={`btn-cine h-9 px-4 ${!week ? "opacity-100" : "opacity-60"}`}
        >
          本周
        </Link>
        <Link
          to="/weekly"
          search={{ week: previousWeek(digest.week.key) }}
          className="btn-cine h-9 px-4"
        >
          ← 上一周
        </Link>
        {week && week !== current.key ? (
          <Link
            to="/weekly"
            search={{ week: nextWeek(digest.week.key) }}
            className="btn-cine h-9 px-4"
          >
            下一周 →
          </Link>
        ) : null}
        <div className="ml-auto flex gap-2">
          <a href="/rss.xml" className="btn-cine h-9 px-4">
            RSS
          </a>
          <a href="/llms.txt" className="btn-cine h-9 px-4">
            LLMS
          </a>
        </div>
      </div>

      <section className="mb-10 grid grid-cols-1 gap-4 border border-base-300/60 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="mono-label">video / remotion</div>
            <a
              href={`/weekly/${digest.week.key}.mp4`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] tracking-[0.12em] text-[var(--signal)] uppercase"
            >
              open file ↗
            </a>
          </div>
          <video
            controls
            preload="metadata"
            poster={`/weekly/${digest.week.key}-poster.png`}
            className="w-full border border-base-300/70 bg-black"
          >
            <source src={`/weekly/${digest.week.key}.mp4`} type="video/mp4" />
            <track
              kind="captions"
              src={`/weekly/${digest.week.key}.vtt`}
              srcLang="zh"
              label="中文"
              default
            />
            你的浏览器不支持视频播放。
          </video>
        </div>
        <div className="flex flex-col gap-3">
          <div className="mono-label">audio / narration</div>
          <div className="flex min-h-28 flex-col justify-center gap-4 border border-base-300/70 p-5">
            <p className="text-[13px] leading-relaxed text-base-content/60">
              中文语音导读,由 macOS 中文语音合成,与视频同步生成。
            </p>
            <audio controls preload="metadata" className="w-full">
              <source src={`/weekly/${digest.week.key}.m4a`} type="audio/mp4" />
              <track
                kind="captions"
                src={`/weekly/${digest.week.key}.vtt`}
                srcLang="zh"
                label="中文"
                default
              />
              你的浏览器不支持音频播放。
            </audio>
            <a href={`/weekly/${digest.week.key}.m4a`} download className="btn-cine h-9 w-fit px-4">
              下载音频
            </a>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="display-caps mb-5 text-xl">本周要点 / highlights</h2>
            <div className="flex flex-col gap-3">
              {digest.highlights.map((post, index) => (
                <Link
                  key={`${post.author}/${post.slug}`}
                  to="/post/$author/$slug"
                  params={{ author: post.author, slug: post.slug }}
                  className="cine-card flex gap-4 p-4"
                >
                  <span className="font-mono text-[11px] text-[var(--signal)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] tracking-[0.12em] text-[var(--signal)] uppercase">
                      {sourceLabel(post.author)}
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">{post.title}</div>
                    <div className="mt-1 font-mono text-[10px] text-base-content/45">
                      {formatDate(post.date)} · {post.description ?? ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="display-caps mb-5 text-xl">推荐阅读 / picked</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {digest.recommendations.map((post) => (
                <Link
                  key={`${post.author}/${post.slug}`}
                  to="/post/$author/$slug"
                  params={{ author: post.author, slug: post.slug }}
                  className="cine-card p-4"
                >
                  <div className="font-mono text-[10px] tracking-[0.12em] text-[var(--signal)] uppercase">
                    {sourceLabel(post.author)}
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm font-medium">{post.title}</div>
                </Link>
              ))}
            </div>
          </section>

          {digest.drilled.length > 0 && (
            <section>
              <h2 className="display-caps mb-5 text-xl">下钻文章 / drilled</h2>
              <div className="flex flex-col gap-2">
                {digest.drilled.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="cine-card p-4"
                  >
                    <div className="text-sm font-medium">{item.title}</div>
                    <p className="mt-1 line-clamp-2 text-[13px] text-base-content/55">
                      {item.excerpt}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <div className="border border-base-300/60 bg-base-100/40 p-5">
            <div className="mono-label mb-4">来源分布 / sources</div>
            <div className="flex flex-col gap-2">
              {digest.sources.slice(0, 12).map((entry) => (
                <div key={entry.author} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[13px]">{sourceLabel(entry.author)}</span>
                  <span className="font-mono text-[11px] text-[var(--signal)]">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-base-300/60 bg-base-100/40 p-5">
            <div className="mono-label mb-4">关键词 / keywords</div>
            <div className="flex flex-wrap gap-2">
              {digest.keywords.map((item) => (
                <span
                  key={item.word}
                  className="border border-base-300/60 px-2 py-1 font-mono text-[10px] text-base-content/65"
                >
                  {item.word} <span className="text-[var(--signal)]">{item.count}</span>
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function previousWeek(key: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return undefined;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week === 1) return `${year - 1}-W52`;
  return `${year}-W${String(week - 1).padStart(2, "0")}`;
}

function nextWeek(key: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return undefined;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week >= 52) return `${year + 1}-W01`;
  return `${year}-W${String(week + 1).padStart(2, "0")}`;
}
