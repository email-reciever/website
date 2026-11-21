import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { ArticleToc } from "@/components/ArticleToc";
import { Markdown } from "@/components/Markdown";
import { PostCard } from "@/components/PostCard";
import { ReadingProgress } from "@/components/ReadingProgress";
import { getPostPage, getRelatedPosts } from "@/lib/content";
import { formatDate } from "@/lib/date";
import { sourceIcon, sourceLabel } from "@/lib/sources";
import { extractHeadings } from "@/lib/toc";
import type { ManifestEntry } from "@/lib/types";

const fetchPost = createServerFn({ method: "GET" })
  .validator((data: { author: string; slug: string }) => data)
  .handler(({ data }) => getPostPage(data.author, data.slug));

const fetchRelated = createServerFn({ method: "GET" })
  .validator((data: { author: string; slug: string }) => data)
  .handler(({ data }) => getRelatedPosts(data.author, data.slug));

export const Route = createFileRoute("/post/$author/$slug")({
  loader: async ({ params }) => {
    try {
      return await fetchPost({ data: { author: params.author, slug: params.slug } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.entry.title} · ${sourceLabel(loaderData.entry.author)}` },
          { name: "description", content: loaderData.entry.description ?? loaderData.entry.title },
          { property: "og:title", content: loaderData.entry.title },
          { property: "og:type", content: "article" },
        ]
      : [{ title: "文章不存在" }],
  }),
  component: PostPage,
});

function PostPage() {
  const { entry, html } = Route.useLoaderData();
  const originURL =
    entry.origin_url && entry.origin_url !== "javascript:;" ? entry.origin_url : undefined;

  const headings = useMemo(() => extractHeadings(html), [html]);

  const related = useQuery({
    queryKey: ["related", entry.author, entry.slug],
    queryFn: () => fetchRelated({ data: { author: entry.author, slug: entry.slug } }),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <>
      <ReadingProgress />
      <article className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <nav className="mb-10 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-base-content/45 uppercase">
          <Link
            to="/"
            search={{ source: undefined, q: undefined, page: undefined }}
            className="hover:text-[var(--signal)]"
          >
            /index
          </Link>
          <span className="text-base-content/25">/</span>
          <Link
            to="/"
            search={{ source: entry.author, q: undefined, page: undefined }}
            className="hover:text-[var(--signal)]"
          >
            {entry.author}
          </Link>
          <span className="text-base-content/25">/</span>
          <span className="max-w-52 truncate text-base-content/60">{entry.slug}</span>
        </nav>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0">
            <header className="mb-12 flex flex-col gap-6 border-b border-base-300/60 pb-10">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.16em] text-base-content/50 uppercase">
                <img
                  src={sourceIcon(entry.author)}
                  alt=""
                  className="h-4 w-4"
                  width="16"
                  height="16"
                />
                <span className="text-[var(--signal)]">{sourceLabel(entry.author)}</span>
                <span className="text-base-content/25">·</span>
                <span>{formatDate(entry.date)}</span>
                <span className="text-base-content/25">·</span>
                <span
                  className={entry.translated ? "text-[var(--signal)]" : "text-base-content/40"}
                >
                  {entry.translated ? "translated" : "original"}
                </span>
              </div>

              <h1 className="max-w-4xl text-[clamp(2rem,5vw,3.6rem)] leading-[1.08] font-bold tracking-[-0.045em] text-base-content text-wrap-pretty">
                {entry.title}
              </h1>

              {entry.description && entry.description !== entry.title && (
                <p className="max-w-2xl border-l-2 border-[var(--signal)] pl-4 text-[15px] leading-relaxed text-base-content/60">
                  {entry.description}
                </p>
              )}

              {entry.banner && (
                <img
                  src={entry.banner}
                  alt=""
                  loading="lazy"
                  className="max-h-64 w-full border border-base-300/60 object-cover grayscale transition-[filter] duration-700 hover:grayscale-0"
                />
              )}

              {originURL && (
                <a
                  href={originURL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-cine h-9 w-fit px-5"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                    <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3Zm-9 2h6v2H5v12h12v-6h2v8H3V5h2Z" />
                  </svg>
                  Read original
                </a>
              )}
            </header>

            {html ? (
              <Markdown html={html} />
            ) : (
              <div className="border border-base-300/60 border-l-2 border-l-[var(--signal)] p-5 font-mono text-xs tracking-[0.1em] text-base-content/55 uppercase">
                No body content available — try reading the original.
              </div>
            )}

            {/* colophon — deliberately quiet, closes the reading session */}
            <div className="mt-16 flex flex-col gap-2 border-t border-base-300/60 pt-6 font-mono text-[10px] tracking-[0.14em] text-base-content/30 uppercase">
              <span>
                End of document / {entry.author} / {entry.slug}
              </span>
              <span>Archived & translated automatically · Made for the open web</span>
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-8">
              <ArticleToc items={headings} />

              {entry.subAuthor && (
                <div className="border border-base-300/60 bg-base-100/40 p-4">
                  <div className="mono-label mb-2">Author</div>
                  <p className="text-sm font-medium">{entry.subAuthor}</p>
                </div>
              )}

              <div className="border border-base-300/60 bg-base-100/40 p-4">
                <div className="mono-label mb-2">Source</div>
                <Link
                  to="/"
                  search={{ source: entry.author, q: undefined, page: undefined }}
                  className="flex items-center gap-2 text-sm font-medium hover:text-[var(--signal)]"
                >
                  <img
                    src={sourceIcon(entry.author)}
                    alt=""
                    className="h-4 w-4 grayscale"
                    width="16"
                    height="16"
                  />
                  {sourceLabel(entry.author)}
                </Link>
              </div>

              <div className="border border-base-300/60 bg-base-100/40 p-4">
                <div className="mono-label mb-2">Meta</div>
                <dl className="flex flex-col gap-1.5 font-mono text-[10px] tracking-[0.08em] text-base-content/55">
                  <div className="flex justify-between gap-2">
                    <dt>slug</dt>
                    <dd className="max-w-28 truncate text-base-content/70">{entry.slug}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>status</dt>
                    <dd className="text-base-content/70">{entry.translated ? "zh" : "en"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </aside>
        </div>

        {related.data && related.data.length > 0 && (
          <section className="mt-20 border-t border-base-300/60 pt-10">
            <div className="mb-6 flex items-baseline gap-4">
              <h2 className="display-caps text-xl">Related signal</h2>
              <span className="mono-label">/ {sourceLabel(entry.author)}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.data.slice(0, 3).map((post: ManifestEntry) => (
                <PostCard key={`${post.author}/${post.slug}`} post={post} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
