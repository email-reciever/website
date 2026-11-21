import { Link, useSearch } from "@tanstack/react-router";
import { SOURCES, sourceIcon, sourceLabel } from "@/lib/sources";

/**
 * Source filter tabs. `all` + every source that has posts.
 * State lives in the URL (?source=) so filtered views are linkable and SSR-able.
 */
export function SourceTabs({ counts }: { counts: Record<string, number> }) {
  const { source } = useSearch({ from: "/" });
  const active = source ?? "all";

  const entries = Object.entries(counts)
    .filter(([key]) => SOURCES[key])
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist">
      <Link
        to="/"
        search={{ source: undefined, q: undefined, page: undefined }}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
          active === "all"
            ? "border-base-content/20 bg-base-content text-base-100"
            : "border-base-300/70 bg-base-100/40 text-base-content/60 hover:border-base-content/25 hover:text-base-content"
        }`}
      >
        全部
        <span className="font-mono text-[10px] opacity-60">
          {Object.values(counts).reduce((sum, n) => sum + n, 0)}
        </span>
      </Link>
      {entries.map(([key, count]) => (
        <Link
          key={key}
          to="/"
          search={{ source: key, q: undefined, page: undefined }}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors ${
            active === key
              ? "border-base-content/20 bg-base-content text-base-100"
              : "border-base-300/70 bg-base-100/40 text-base-content/60 hover:border-base-content/25 hover:text-base-content"
          }`}
          title={SOURCES[key].note}
        >
          <img
            src={sourceIcon(key)}
            alt=""
            className={`h-3.5 w-3.5 rounded-sm ${active === key ? "" : "opacity-70 grayscale"}`}
            width="14"
            height="14"
            loading="lazy"
          />
          {sourceLabel(key)}
          <span className="font-mono text-[10px] opacity-50">{count}</span>
        </Link>
      ))}
    </div>
  );
}
