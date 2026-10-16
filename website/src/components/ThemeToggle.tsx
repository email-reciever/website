import { useState } from "react";

const THEMES = ["dim", "light"] as const;

/**
 * daisyUI theme switcher — persists to localStorage, applied immediately
 * via <html data-theme>. The init script in __root prevents theme flash.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "dim";
    return (
      (document.documentElement.getAttribute("data-theme") as (typeof THEMES)[number]) ?? "dim"
    );
  });

  const toggle = () => {
    const next = THEMES.find((t) => t !== theme) ?? "dim";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // private mode — ignore
    }
  };

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-circle"
      onClick={toggle}
      aria-label="切换主题"
    >
      {theme === "dim" ? (
        // moon
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.3.74 8.06 8.06 0 0 1-8.06-8.06c0-1.15.24-2.25.7-3.3a1 1 0 0 0-.13-1.06 1 1 0 0 0-1.07-.24 10.06 10.06 0 0 0-4.42 16.53A10.14 10.14 0 0 0 11.99 22 10.06 10.06 0 0 0 22 12c0-.34-.02-.67-.06-1Z" />
        </svg>
      ) : (
        // sun
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm0-14.5a1 1 0 0 1-1-1v-2a1 1 0 0 1 2 0v2a1 1 0 0 1-1 1Zm0 19a1 1 0 0 1-1-1v-2a1 1 0 0 1 2 0v2a1 1 0 0 1-1 1ZM4.22 5.64a1 1 0 0 1 1.42 0l1.42 1.42a1 1 0 0 1-1.42 1.41L4.22 7.05a1 1 0 0 1 0-1.41Zm12.72 12.73a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 0 1-1.41 1.42l-1.42-1.42a1 1 0 0 1 0-1.41ZM2 12a1 1 0 0 1 1-1h2a1 1 0 0 1 0 2H3a1 1 0 0 1-1-1Zm17 0a1 1 0 0 1 1-1h2a1 1 0 0 1 0 2h-2a1 1 0 0 1-1-1ZM4.22 18.36a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 1 1 1.41 1.41l-1.41 1.42a1 1 0 0 1-1.42 0Zm12.72-12.73a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 0 1 1.41 1.42l-1.41 1.41a1 1 0 0 1-1.42 0Z" />
        </svg>
      )}
    </button>
  );
}
