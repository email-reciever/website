import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE } from "@/lib/sources";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-base-300/60 bg-base-100/80 backdrop-blur">
      <div className="navbar mx-auto max-w-6xl px-4">
        <div className="navbar-start gap-1">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/media-source/email-reciever.svg"
              alt="logo"
              className="h-8 w-8"
              width="32"
              height="32"
            />
            <span className="text-lg font-bold tracking-tight">{SITE.title}</span>
          </Link>
        </div>
        <div className="navbar-end gap-1">
          <a
            href={SITE.repo}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm gap-2"
            aria-label="GitHub 仓库"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.38.82 1.11.82 2.24v3.32c0 .32.22.7.83.58C20.57 22.29 24 17.79 24 12.5 24 5.87 18.63.5 12 .5Z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
