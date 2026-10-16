import { Link, useSearch } from "@tanstack/react-router";

interface PaginationProps {
  page: number;
  totalPages: number;
}

function pageHref<S extends object>(search: S, page: number) {
  return (prev: S) => ({ ...prev, ...search, page: page > 1 ? page : undefined });
}

/**
 * Compact windowed pagination (daisyUI `join`). Page number lives in ?page=.
 */
export function Pagination({ page, totalPages }: PaginationProps) {
  const search = useSearch({ from: "/" });

  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, windowStart + 4);
  const pages: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pages.push(p);

  return (
    <nav className="join" aria-label="分页">
      <Link
        to="/"
        search={pageHref(search, page - 1)}
        aria-disabled={page <= 1}
        className={`join-item btn btn-sm ${page <= 1 ? "btn-disabled" : ""}`}
      >
        «
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          to="/"
          search={pageHref(search, p)}
          className={`join-item btn btn-sm ${p === page ? "btn-primary" : ""}`}
        >
          {p}
        </Link>
      ))}
      <Link
        to="/"
        search={pageHref(search, page + 1)}
        aria-disabled={page >= totalPages}
        className={`join-item btn btn-sm ${page >= totalPages ? "btn-disabled" : ""}`}
      >
        »
      </Link>
    </nav>
  );
}
