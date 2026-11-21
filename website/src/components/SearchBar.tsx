import { useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

/**
 * Debounced client search — writes ?q= into the URL so results are shareable.
 * The actual filtering happens server-side in the list loader.
 */
export function SearchBar() {
  const router = useRouter();
  const { q } = useSearch({ from: "/" });
  const t = useT();
  const [value, setValue] = useState(q ?? "");

  useEffect(() => {
    setValue(q ?? "");
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((q ?? "") !== value) {
        router.navigate({
          to: "/",
          search: (prev) => ({ ...prev, q: value || undefined, page: undefined }),
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [value, q, router]);

  return (
    <label className="cine-input flex h-12 w-full items-center gap-3 px-4 sm:max-w-md">
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[var(--signal)]" aria-hidden>
        <path d="M10 2a8 8 0 1 0 4.9 14.32l4.4 4.39a1 1 0 0 0 1.41-1.42l-4.39-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("search")}
        className="grow bg-transparent font-mono text-xs tracking-[0.08em] text-[var(--input-fg)] outline-none placeholder:text-[var(--stage-lite)]"
      />
      {value ? (
        <button
          type="button"
          className="font-mono text-xs text-[var(--signal)]"
          onClick={() => setValue("")}
          aria-label="清空"
        >
          ✕
        </button>
      ) : (
        <kbd className="hidden border border-base-content/20 px-1.5 py-0.5 font-mono text-[10px] text-[var(--stage-lite)] sm:inline">
          /
        </kbd>
      )}
    </label>
  );
}
