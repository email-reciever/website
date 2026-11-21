import { Link } from "@tanstack/react-router";
import { formatDate } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { sourceBanner, sourceIcon, sourceLabel, sourceNote } from "@/lib/sources";
import type { ManifestEntry } from "@/lib/types";

export function PostCard({ post }: { post: ManifestEntry }) {
  const t = useT();
  const href = "/post/$author/$slug";
  return (
    <Link
      to={href}
      params={{ author: post.author, slug: post.slug }}
      className="cine-card group flex flex-col"
    >
      <figure className="relative h-32 overflow-hidden border-b border-base-300/50">
        <img
          src={sourceBanner(post.author)}
          alt={sourceLabel(post.author)}
          loading="lazy"
          className="card-banner h-full w-full object-cover object-left-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2">
          <img
            src={sourceIcon(post.author)}
            alt=""
            className="h-3.5 w-3.5"
            width="14"
            height="14"
          />
          <span className="font-mono text-[10px] tracking-[0.12em] text-white uppercase">
            {sourceLabel(post.author)}
          </span>
          {sourceNote(post.author) && (
            <span className="hidden truncate font-mono text-[10px] text-white/45 sm:inline">
              · {sourceNote(post.author)}
            </span>
          )}
        </div>
      </figure>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="line-clamp-2 text-[15px] leading-snug font-semibold tracking-tight text-base-content transition-colors group-hover:text-[var(--signal)]">
          {post.title}
        </h2>
        {post.description && post.description !== post.title && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-base-content/55">
            {post.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-base-300/40 pt-3 font-mono text-[10px] tracking-[0.1em] text-base-content/45">
          <span>{formatDate(post.date)}</span>
          <div className="flex items-center gap-2">
            {post.subAuthor && <span className="max-w-24 truncate">{post.subAuthor}</span>}
            <span className={post.translated ? "text-[var(--signal)]" : "text-base-content/35"}>
              {post.translated ? t("translated") : t("original")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
