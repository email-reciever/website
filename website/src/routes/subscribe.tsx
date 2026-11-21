import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getManifest } from "@/lib/content";
import { formatDate } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { sourceLabel } from "@/lib/sources";
import type { ManifestEntry } from "@/lib/types";

const fetchLatest = createServerFn({ method: "GET" }).handler(async () => {
  const { posts } = await getManifest();
  return posts.slice(0, 8);
});

export const Route = createFileRoute("/subscribe")({
  loader: () => fetchLatest(),
  head: () => ({
    meta: [
      { title: "订阅 / Subscribe — Email Reciever" },
      { name: "description", content: "通过 RSS 订阅 Email Reciever 的中文技术内容" },
    ],
  }),
  component: SubscribePage,
});

const FEED_URL = "https://email-reciever-website.jiangjiangjiangxi.workers.dev/rss.xml";

function SubscribePage() {
  const t = useT();
  const posts = Route.useLoaderData() as ManifestEntry[];
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(FEED_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8">
      <div className="mb-12 flex flex-col gap-5 border-b border-base-300/60 pb-10">
        <div className="mono-label">Email Reciever / subscribe</div>
        <h1 className="display-caps text-[clamp(2.4rem,7vw,5rem)] text-base-content">
          {t("subscribeTitle")}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-base-content/60">
          {t("subscribeLead")}
        </p>

        <div className="flex max-w-2xl flex-col gap-2 sm:flex-row">
          <div className="cine-input flex h-12 flex-1 items-center px-4 font-mono text-xs text-[var(--input-fg)]">
            <span className="truncate">{FEED_URL}</span>
          </div>
          <button type="button" onClick={copy} className="btn-cine h-12 px-6">
            {copied ? t("copied") : t("copy")}
          </button>
          <a href="/rss.xml" target="_blank" rel="noreferrer" className="btn-cine h-12 px-6">
            {t("openFeed")}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="flex flex-col gap-3">
          <h2 className="display-caps mb-2 text-xl">{t("latest")}</h2>
          {posts.map((post) => (
            <Link
              key={`${post.author}/${post.slug}`}
              to="/post/$author/$slug"
              params={{ author: post.author, slug: post.slug }}
              className="cine-card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-mono text-[10px] tracking-[0.12em] text-[var(--signal)] uppercase">
                  {sourceLabel(post.author)}
                </div>
                <div className="mt-1 truncate text-sm font-medium">{post.title}</div>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-base-content/45">
                {formatDate(post.date)}
              </span>
            </Link>
          ))}
        </section>

        <aside className="flex flex-col gap-3">
          <div className="border border-base-300/60 bg-base-100/40 p-5">
            <div className="mono-label mb-4">{t("howTo")}</div>
            <ol className="flex flex-col gap-3 text-[13px] leading-relaxed text-base-content/60">
              <li>01 · {t("step1")}</li>
              <li>02 · {t("step2")}</li>
              <li>03 · {t("step3")}</li>
            </ol>
          </div>
          <div className="border border-base-300/60 bg-base-100/40 p-5 font-mono text-[10px] tracking-[0.1em] text-base-content/40 uppercase">
            <div>RSS 2.0</div>
            <div>ETag · 304 supported</div>
            <div>updated every 6h</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
