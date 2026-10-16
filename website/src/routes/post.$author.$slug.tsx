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
    <article className="container mx-auto max-w-6xl px-4 py-8">
      <nav className="breadcrumbs mb-6 text-sm text-base-content/50">
        <ul>
          <li>
            <Link to="/" search={{ source: undefined, q: undefined, page: undefined }}>
              首页
            </Link>
          </li>
          <li>
            <Link to="/" search={{ source: entry.author, q: undefined, page: undefined }}>
              {sourceLabel(entry.author)}
            </Link>
          </li>
          <li className="max-w-48 truncate opacity-70">{entry.title}</li>
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <header className="mb-8 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <img
                src={sourceIcon(entry.author)}
                alt=""
                className="h-5 w-5 rounded"
                width="20"
                height="20"
              />
              <span className="text-sm font-semibold">{sourceLabel(entry.author)}</span>
              <span className="text-sm text-base-content/50">{formatDate(entry.date)}</span>
              {entry.translated ? (
                <span className="badge badge-primary badge-sm">已翻译</span>
              ) : (
                <span className="badge badge-ghost badge-sm">原文</span>
              )}
            </div>
            <h1 className="text-2xl leading-tight font-black tracking-tight sm:text-3xl">
              {entry.title}
            </h1>
            {entry.description && entry.description !== entry.title && (
              <p className="border-l-4 border-primary/50 pl-3 text-base-content/70">
                {entry.description}
              </p>
            )}
            {entry.banner && (
              <img
                src={entry.banner}
                alt=""
                loading="lazy"
                className="max-h-56 w-full rounded-xl object-cover"
              />
            )}
            {originURL && (
              <a
                href={originURL}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm w-fit gap-2"
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
          <div className="sticky top-20 flex flex-col gap-4">
            {entry.subAuthor && (
              <div className="card bg-base-100 shadow-sm ring-1 ring-base-300/40">
                <div className="card-body gap-1 p-4">
                  <h3 className="text-xs font-semibold text-base-content/50">作者</h3>
                  <p className="text-sm font-medium">{entry.subAuthor}</p>
                </div>
              </div>
            )}
            <div className="card bg-base-100 shadow-sm ring-1 ring-base-300/40">
              <div className="card-body gap-1 p-4">
                <h3 className="text-xs font-semibold text-base-content/50">订阅源</h3>
                <Link
                  to="/"
                  search={{ source: entry.author, q: undefined, page: undefined }}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                >
                  <img
                    src={sourceIcon(entry.author)}
                    alt=""
                    className="h-4 w-4 rounded"
                    width="16"
                    height="16"
                  />
                  {sourceLabel(entry.author)}
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {related.data && related.data.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-bold">来自 {sourceLabel(entry.author)} 的更多文章</h2>
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
