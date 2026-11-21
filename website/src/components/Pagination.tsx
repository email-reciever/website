import { Link, useSearch } from "@tanstack/react-router";

interface PaginationProps {
  page: number;
  totalPages: number;
}

function pageHref<S extends object>(search: S, page: number) {
  return (prev: S) => ({ ...prev, ...search, page: page > 1 ? page : undefined });
}

/** Compact windowed pagination. Page number lives in ?page=. */
export function Pagination({ page, totalPages }: PaginationProps) {
  const search = useSearch({ from: "/" });

  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pages.push(p);

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center border px-2 font-mono text-xs tracking-[0.08em] transition-colors";
  const idle =
    "border-base-300/60 text-base-content/55 hover:border-[var(--signal)]/60 hover:text-[var(--signal)]";
  const on = "border-[var(--signal)] bg-[var(--signal)] text-black";

  return (
    <nav className="flex items-center gap-2" aria-label="分页">
      <Link
        to="/"
        search={pageHref(search, page - 1)}
        aria-disabled={page <= 1}
        className={`${base} ${page <= 1 ? "pointer-events-none border-base-300/30 text-base-content/20" : idle}`}
      >
        ‹
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          to="/"
          search={pageHref(search, p)}
          className={`${base} ${p === page ? on : idle}`}
        >
          {p}
        </Link>
      ))}
      <Link
        to="/"
        search={pageHref(search, page + 1)}
        aria-disabled={page >= totalPages}
        className={`${base} ${
          page >= totalPages ? "pointer-events-none border-base-300/30 text-base-content/20" : idle
        }`}
      >
        ›
      </Link>
    </nav>
  );
}
