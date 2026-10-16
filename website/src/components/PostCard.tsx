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
      className="group card bg-base-100 shadow-sm ring-1 ring-base-300/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/40"
    >
      <figure className="relative h-28 overflow-hidden">
        <img
          src={sourceBanner(post.author)}
          alt={sourceLabel(post.author)}
          loading="lazy"
          className="h-full w-full object-cover object-left-top transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/40 to-transparent" />
        <div className="absolute bottom-2 left-3 flex items-center gap-2">
          <img
            src={sourceIcon(post.author)}
            alt=""
            className="h-5 w-5 rounded"
            width="20"
            height="20"
          />
          <span className="text-xs font-semibold text-base-content/80">
            {sourceLabel(post.author)}
          </span>
          {sourceNote(post.author) && (
            <span className="hidden text-xs text-base-content/50 sm:inline">
              · {sourceNote(post.author)}
            </span>
          )}
        </div>
      </figure>
      <div className="card-body gap-2 p-4 pt-2">
        <h2 className="card-title line-clamp-2 text-base leading-snug font-semibold transition-colors group-hover:text-primary">
          {post.title}
        </h2>
        {post.description && post.description !== post.title && (
          <p className="line-clamp-2 text-sm text-base-content/60">{post.description}</p>
        )}
        <div className="card-actions items-center justify-between pt-1 text-xs text-base-content/50">
          <span>{formatDate(post.date)}</span>
          <div className="flex items-center gap-1.5">
            {post.subAuthor && <span className="max-w-32 truncate">{post.subAuthor}</span>}
            {post.translated ? (
              <span className="badge badge-ghost badge-xs">已翻译</span>
            ) : (
              <span className="badge badge-outline badge-xs">原文</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
