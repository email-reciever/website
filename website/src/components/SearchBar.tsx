import { useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * Debounced client search — writes ?q= into the URL so results are shareable.
 * The actual filtering happens server-side in the list loader.
 */
export function SearchBar() {
  const router = useRouter();
  const { q } = useSearch({ from: "/" });
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
    <label className="input input-bordered flex w-full items-center gap-2 bg-base-100 sm:max-w-xs">
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-base-content/40" aria-hidden>
        <path d="M10 2a8 8 0 1 0 4.9 14.32l4.4 4.39a1 1 0 0 0 1.41-1.42l-4.39-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索标题 / 作者 / 摘要"
        className="grow bg-transparent text-sm outline-none placeholder:text-base-content/40"
      />
      {value && (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle"
          onClick={() => setValue("")}
          aria-label="清空"
        >
          ✕
        </button>
      )}
    </label>
  );
}
