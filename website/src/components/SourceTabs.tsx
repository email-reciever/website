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

  const base =
    "inline-flex h-9 items-center gap-2 border px-3 font-mono text-[11px] tracking-[0.08em] transition-colors";
  const idle =
    "border-base-300/60 text-base-content/55 hover:border-[var(--signal)]/60 hover:text-[var(--signal)]";
  const on = "border-[var(--signal)] bg-[var(--signal)] text-[var(--on-signal)]";

  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      <Link
        to="/"
        search={{ source: undefined, q: undefined, page: undefined }}
        className={`${base} ${active === "all" ? on : idle}`}
      >
        全部
        <span className="opacity-60">{Object.values(counts).reduce((s, n) => s + n, 0)}</span>
      </Link>
      {entries.map(([key, count]) => (
        <Link
          key={key}
          to="/"
          search={{ source: key, q: undefined, page: undefined }}
          className={`${base} ${active === key ? on : idle}`}
          title={SOURCES[key].note}
        >
          <img
            src={sourceIcon(key)}
            alt=""
            className={`h-3.5 w-3.5 ${active === key ? "" : "grayscale opacity-60"}`}
            width="14"
            height="14"
            loading="lazy"
          />
          {sourceLabel(key)}
          <span className="opacity-60">{count}</span>
        </Link>
      ))}
    </div>
  );
}
