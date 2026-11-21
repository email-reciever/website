import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { HeroScene } from "@/components/HeroScene";
import { Pagination } from "@/components/Pagination";
import { PostCard } from "@/components/PostCard";
import { SearchBar } from "@/components/SearchBar";
import { SourceTabs } from "@/components/SourceTabs";
import { listPosts } from "@/lib/content";
import { useT } from "@/lib/i18n";
import { SITE } from "@/lib/sources";
import type { ListQuery } from "@/lib/types";

const fetchList = createServerFn({ method: "GET" })
  .validator((data: ListQuery) => data)
  .handler(({ data }) => listPosts(data));

interface ListSearch {
  source?: string;
  q?: string;
  page?: number;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): ListSearch => ({
    source: typeof search.source === "string" && search.source ? search.source : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    page: typeof search.page === "number" && search.page > 1 ? Math.floor(search.page) : undefined,
  }),
  loaderDeps: ({ search: { source, q, page } }) => ({ source, q, page }),
  loader: ({ deps }) => fetchList({ data: deps }),
  head: () => ({
    meta: [
      { title: `${SITE.title} — 订阅阅读` },
      { name: "description", content: SITE.description },
    ],
  }),
  component: ListPage,
});

function ListPage() {
  const { posts, total, page, totalPages, counts } = Route.useLoaderData();
  const { q, source } = Route.useSearch();
  const t = useT();
  const stageRef = useRef<HTMLElement>(null);

  // scroll becomes a slow camera push through the stage — one set-piece,
  // no competing motion elsewhere on the page.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onScroll = () => {
      const y = Math.min(window.scrollY, 760);
      stage.style.setProperty("--cam", String(y * 0.16));
      stage.style.setProperty("--fade", String(Math.max(0, 1 - y / 680)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section ref={stageRef} className="hero-stage border-b border-base-300/60">
        <HeroScene />
        <div className="hero-content scan-grid absolute inset-0" />

        <div className="hero-content relative mx-auto flex min-h-[min(86vh,760px)] max-w-7xl flex-col justify-between px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex items-center justify-between gap-4">
            <span className="mono-label !text-[rgba(0,229,255,0.75)]">
              {`${SITE.title} / Intelligence feed`}
            </span>
            <span className="mono-label hidden sm:inline">EST. 2024 · AUTO-TRANSLATED</span>
          </div>

          <div className="cine-reveal flex flex-col gap-7 py-16">
            <div className="flex flex-col gap-1">
              <h1 className="hero-title display-caps text-[clamp(3.4rem,11vw,10rem)]">
                Read the
                <br />
                <span className="text-[var(--signal)]">signal.</span>
              </h1>
              <div className="hero-rule mt-7 max-w-2xl" />
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--stage-muted)] sm:text-lg">
                {t("intro", { n: Object.keys(counts).length })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[0.6875rem] tracking-[0.18em] text-[var(--stage-meta)] uppercase">
              <span>
                {total} {t("docs")}
              </span>
              <span className="text-[var(--signal)]">/</span>
              <span>17 {t("directFeeds")}</span>
              <span className="text-[var(--signal)]">/</span>
              <span>{t("output")}</span>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <SearchBar />
            <div className="flex items-center gap-3">
              <span className="mono-label">{t("scroll")}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-[var(--signal)]/60 to-transparent" />
              <span className="font-mono text-[10px] text-[var(--stage-lite)]">↓</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-b border-base-300/60 px-5 py-8 sm:px-8">
        <div className="flex items-baseline gap-4">
          <h2 className="display-caps text-2xl sm:text-3xl">Archive</h2>
          <span className="mono-label">{t("allSources")}</span>
        </div>
        <SourceTabs counts={counts} />
      </section>

      <div className="px-5 py-10 sm:px-8">
        {posts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
            <p className="font-mono text-sm tracking-[0.2em] text-base-content/50 uppercase">
              {t("noSignal")}
            </p>
            <Link
              to="/"
              search={{ source: undefined, q: undefined, page: undefined }}
              className="btn-cine h-9 px-5"
            >
              {t("reset")}
            </Link>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={`${post.author}/${post.slug}`} post={post} />
            ))}
          </section>
        )}

        <div className="mt-12 flex flex-col items-center gap-4">
          <Pagination page={page} totalPages={totalPages} />
          {(q || source) && (
            <Link
              to="/"
              search={{ source: undefined, q: undefined, page: undefined }}
              className="font-mono text-[11px] tracking-[0.14em] text-base-content/45 uppercase hover:text-[var(--signal)]"
            >
              {t("reset")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
