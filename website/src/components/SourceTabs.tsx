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
    <div className="tabs-boxed flex flex-wrap gap-1" role="tablist">
      <Link
        to="/"
        search={{ source: undefined, q: undefined, page: undefined }}
        className={`tab gap-1.5 ${active === "all" ? "tab-active" : ""}`}
      >
        全部
        <span className="text-xs opacity-60">
          {Object.values(counts).reduce((sum, n) => sum + n, 0)}
        </span>
      </Link>
      {entries.map(([key, count]) => (
        <Link
          key={key}
          to="/"
          search={{ source: key, q: undefined, page: undefined }}
          className={`tab gap-1.5 ${active === key ? "tab-active" : ""}`}
          title={SOURCES[key].note}
        >
          <img
            src={sourceIcon(key)}
            alt=""
            className="h-4 w-4 rounded"
            width="16"
            height="16"
            loading="lazy"
          />
          {sourceLabel(key)}
          <span className="text-xs opacity-60">{count}</span>
        </Link>
      ))}
    </div>
  );
}
