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
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <section className="mesh-hero mb-10 border-b border-base-300/70">
        <div className="flex flex-col gap-7 py-12 sm:py-16">
          <div className="flex flex-col gap-4">
            <div className="mono-label">Email Reciever / Library</div>
            <h1 className="max-w-3xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] sm:text-6xl">
              技术通讯，
              <br className="hidden sm:block" />
              读成中文。
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-base-content/55">
              邮件与 RSS 直接入库，自动切片、翻译、归档。
              <span className="font-mono text-xs text-base-content/40">
                {" "}
                {Object.keys(counts).length} sources / {total} posts
              </span>
            </p>
          </div>
          <SearchBar />
        </div>
      </section>

      <section className="mb-6 flex items-center gap-3 overflow-x-auto pb-1">
        <span className="mono-label shrink-0">Sources</span>
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
