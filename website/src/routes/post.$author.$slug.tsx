import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Markdown } from "@/components/Markdown";
import { PostCard } from "@/components/PostCard";
import { getPostPage, getRelatedPosts } from "@/lib/content";
import { formatDate } from "@/lib/date";
import { sourceIcon, sourceLabel } from "@/lib/sources";
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
      // missing or unpublished content → 404
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

  const related = useQuery({
    queryKey: ["related", entry.author, entry.slug],
    queryFn: () => fetchRelated({ data: { author: entry.author, slug: entry.slug } }),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav className="mb-8 flex items-center gap-2 font-mono text-[11px] text-base-content/45">
        <Link
          to="/"
          search={{ source: undefined, q: undefined, page: undefined }}
          className="hover:text-base-content"
        >
          /index
        </Link>
        <span className="text-base-content/25">/</span>
        <Link
          to="/"
          search={{ source: entry.author, q: undefined, page: undefined }}
          className="hover:text-base-content"
        >
          {entry.author}
        </Link>
        <span className="text-base-content/25">/</span>
        <span className="max-w-48 truncate text-base-content/60">{entry.slug}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <header className="mb-9 flex flex-col gap-5 border-b border-base-300/70 pb-8">
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] text-base-content/50">
              <img
                src={sourceIcon(entry.author)}
                alt=""
                className="h-4 w-4 rounded-sm"
                width="16"
                height="16"
              />
              <span className="tracking-wide text-base-content/70">
                {sourceLabel(entry.author)}
              </span>
              <span className="text-base-content/25">·</span>
              <span>{formatDate(entry.date)}</span>
              <span className="text-base-content/25">·</span>
              <span className={entry.translated ? "text-base-content/70" : "text-base-content/40"}>
                {entry.translated ? "TRANSLATED" : "ORIGINAL"}
              </span>
            </div>
            <h1 className="text-3xl leading-[1.15] font-semibold tracking-[-0.035em] text-wrap-pretty sm:text-[2.6rem]">
              {entry.title}
            </h1>
            {entry.description && entry.description !== entry.title && (
              <p className="max-w-2xl border-l-2 border-base-content/25 pl-4 text-[15px] leading-relaxed text-base-content/60">
                {entry.description}
              </p>
            )}
            {entry.banner && (
              <img
                src={entry.banner}
                alt=""
                loading="lazy"
                className="detail-banner mt-1 max-h-56 w-full rounded-xl border border-base-300 object-cover"
              />
            )}
            {originURL && (
              <a
                href={originURL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-fit items-center gap-2.5 rounded-lg bg-base-content px-4 text-[13px] font-medium text-base-100 transition-opacity hover:opacity-85"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                  <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3Zm-9 2h6v2H5v12h12v-6h2v8H3V5h2Z" />
                </svg>
                阅读原文
              </a>
            )}
          </header>

          {html ? (
            <Markdown html={html} />
          ) : (
            <div className="alert">
              <span>这篇文章没有正文内容，可尝试阅读原文。</span>
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 flex flex-col gap-3">
            {entry.subAuthor && (
              <div className="rounded-xl border border-base-300/70 bg-base-100/50 p-4">
                <div className="mono-label mb-1.5">Author</div>
                <p className="text-sm font-medium">{entry.subAuthor}</p>
              </div>
            )}
            <div className="rounded-xl border border-base-300/70 bg-base-100/50 p-4">
              <div className="mono-label mb-2">Source</div>
              <Link
                to="/"
                search={{ source: entry.author, q: undefined, page: undefined }}
                className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-base-content"
              >
                <img
                  src={sourceIcon(entry.author)}
                  alt=""
                  className="h-4 w-4 rounded-sm grayscale"
                  width="16"
                  height="16"
                />
                {sourceLabel(entry.author)}
              </Link>
            </div>
            <div className="rounded-xl border border-base-300/70 bg-base-100/50 p-4">
              <div className="mono-label mb-2">Meta</div>
              <dl className="flex flex-col gap-1.5 font-mono text-[11px] text-base-content/55">
                <div className="flex justify-between gap-2">
                  <dt>slug</dt>
                  <dd className="max-w-32 truncate text-base-content/70">{entry.slug}</dd>
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
        <section className="mt-16 border-t border-base-300/70 pt-10">
          <div className="mb-5 flex items-baseline gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              更多来自 {sourceLabel(entry.author)}
            </h2>
            <span className="mono-label">related</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.data.slice(0, 3).map((post: ManifestEntry) => (
              <PostCard key={`${post.author}/${post.slug}`} post={post} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
