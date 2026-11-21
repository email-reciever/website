import { Link } from "@tanstack/react-router";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n";
import { SITE } from "@/lib/sources";

export function Header() {
  const t = useT();
  return (
    <header className="sticky top-0 z-40 border-b border-base-300/60 bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="h-px w-full bg-gradient-to-r from-[var(--signal)] via-[var(--signal)]/25 to-transparent" />
      <div className="navbar mx-auto max-w-7xl px-5 sm:px-8">
        <div className="navbar-start gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/media-source/email-reciever.svg"
              alt="logo"
              className="h-7 w-7"
              width="28"
              height="28"
            />
            <span className="display-caps text-sm tracking-[-0.03em] text-[var(--stage-fg)]">
              {SITE.title}
            </span>
            <span className="mono-label hidden border-l border-base-300/50 pl-3 md:inline">
              {t("feed")}
            </span>
          </Link>
        </div>
        <div className="navbar-end gap-1">
          <Link
            to="/weekly"
            search={{ week: undefined }}
            className="btn btn-ghost btn-sm gap-2 font-mono text-[10px] tracking-[0.14em] text-base-content/55 uppercase hover:text-[var(--signal)]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M4 3h16v18H4V3Zm2 2v2h2V5H6Zm4 0v2h2V5h-2Zm4 0v2h2V5h-2ZM6 9v2h2V9H6Zm4 0v2h2V9h-2Zm4 0v2h2V9h-2ZM6 13v2h2v-2H6Zm4 0v2h2v-2h-2Zm4 0v2h2v-2h-2Z" />
            </svg>
            <span className="hidden sm:inline">Weekly</span>
          </Link>
          <Link
            to="/subscribe"
            className="btn btn-ghost btn-sm gap-2 font-mono text-[10px] tracking-[0.14em] text-base-content/55 uppercase hover:text-[var(--signal)]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5A.5.5 0 0 0 6 19.5v1A1.5 1.5 0 0 0 7.5 22H20v-2M4 4v1.5a14.5 14.5 0 0 1 14.5 14.5H20A16.5 16.5 0 0 0 3.5 4H4Zm0 5v1.5A9.5 9.5 0 0 1 13.5 20H15A11.5 11.5 0 0 0 3.5 9H4Z" />
            </svg>
            <span className="hidden sm:inline">{t("subscribe")}</span>
          </Link>
          <a
            href={SITE.repo}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm gap-2 font-mono text-[10px] tracking-[0.14em] text-base-content/55 uppercase hover:text-[var(--signal)]"
            aria-label="GitHub repository"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.38.82 1.11.82 2.24v3.32c0 .32.22.7.83.58C20.57 22.29 24 17.79 24 12.5 24 5.87 18.63.5 12 .5Z" />
            </svg>
            <span className="hidden sm:inline">{t("source")}</span>
          </a>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
