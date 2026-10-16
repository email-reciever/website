import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Pagination } from "@/components/Pagination";
import { PostCard } from "@/components/PostCard";
import { SearchBar } from "@/components/SearchBar";
import { SourceTabs } from "@/components/SourceTabs";
import { listPosts } from "@/lib/content";
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            订阅<span className="text-primary">阅读</span>
          </h1>
          <p className="text-sm text-base-content/60">
            来自 {Object.keys(counts).length} 个技术订阅源 · 共 {total} 篇 · 自动翻译归档
          </p>
        </div>
        <SearchBar />
      </section>

      <section className="mb-6 overflow-x-auto pb-1">
        <SourceTabs counts={counts} />
      </section>

      {posts.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-base-content/50">
          <p className="text-lg">没有匹配的文章</p>
          <Link
            to="/"
            search={{ source: undefined, q: undefined, page: undefined }}
            className="btn btn-sm"
          >
            清除筛选
          </Link>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={`${post.author}/${post.slug}`} post={post} />
          ))}
        </section>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <Pagination page={page} totalPages={totalPages} />
        {(q || source) && (
          <Link
            to="/"
            search={{ source: undefined, q: undefined, page: undefined }}
            className="link link-hover text-sm text-base-content/50"
          >
            清除筛选条件
          </Link>
        )}
      </div>
    </div>
  );
}
