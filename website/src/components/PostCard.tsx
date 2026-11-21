import { Link } from "@tanstack/react-router";
import { formatDate } from "@/lib/date";
import { sourceBanner, sourceIcon, sourceLabel, sourceNote } from "@/lib/sources";
import type { ManifestEntry } from "@/lib/types";

export function PostCard({ post }: { post: ManifestEntry }) {
  const href = "/post/$author/$slug";
  return (
    <Link
      to={href}
      params={{ author: post.author, slug: post.slug }}
      className="post-card group card relative overflow-hidden rounded-xl border border-base-300/80 bg-base-100 transition-[border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-base-content/25"
    >
      <figure className="relative h-28 overflow-hidden border-b border-base-300/60">
        <img
          src={sourceBanner(post.author)}
          alt={sourceLabel(post.author)}
          loading="lazy"
          className="card-banner h-full w-full object-cover object-left-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/35 to-transparent" />
        <div className="absolute bottom-2 left-3 flex items-center gap-2">
          <img
            src={sourceIcon(post.author)}
            alt=""
            className="h-4 w-4 rounded-sm"
            width="16"
            height="16"
          />
          <span className="text-[11px] font-medium tracking-wide text-base-content/80">
            {sourceLabel(post.author)}
          </span>
          {sourceNote(post.author) && (
            <span className="hidden text-[11px] text-base-content/45 sm:inline">
              · {sourceNote(post.author)}
            </span>
          )}
        </div>
      </figure>
      <div className="card-body gap-2 p-4">
        <h2 className="card-title line-clamp-2 text-[15px] leading-snug font-semibold tracking-tight transition-colors group-hover:text-base-content">
          {post.title}
        </h2>
        {post.description && post.description !== post.title && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-base-content/55">
            {post.description}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between border-t border-base-300/50 pt-3 font-mono text-[11px] text-base-content/45">
          <span>{formatDate(post.date)}</span>
          <div className="flex items-center gap-2">
            {post.subAuthor && <span className="max-w-28 truncate">{post.subAuthor}</span>}
            <span className={post.translated ? "text-base-content/70" : "text-base-content/35"}>
              {post.translated ? "译" : "原"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
