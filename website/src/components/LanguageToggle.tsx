import { useEffect } from "react";
import { initLang, setLang, useLang } from "@/lib/i18n";

/** zh / en switch. Persisted to localStorage and applied to <html lang>,
 * which also helps crawlers and screen readers. */
export function LanguageToggle() {
  const lang = useLang();

  useEffect(() => {
    initLang();
  }, []);

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm font-mono text-[11px] tracking-[0.1em] text-base-content/55 hover:text-[var(--signal)]"
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}
    >
      {lang === "zh" ? "EN" : "中"}
    </button>
  );
}
