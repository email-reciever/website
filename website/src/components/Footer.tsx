import { useT } from "@/lib/i18n";
import { SITE } from "@/lib/sources";

export function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-base-300/60 bg-[var(--footer-bg)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-12 sm:px-8">
        <div className="h-px w-full bg-gradient-to-r from-[var(--signal)] to-transparent opacity-60" />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <span className="display-caps text-xl text-[var(--stage-fg)]">
              {t("endTransmission")}
            </span>
            <p className="max-w-lg text-[13px] leading-relaxed text-base-content/50">
              {t("footerDesc")}
              <a
                href={SITE.repo}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--signal)] underline decoration-[var(--signal)]/30 underline-offset-2 hover:decoration-[var(--signal)]"
              >
                email-reciever/website
              </a>
            </p>
          </div>
          <div className="flex flex-col gap-1 font-mono text-[10px] tracking-[0.14em] text-base-content/35 uppercase sm:items-end">
            <span>
              © {new Date().getFullYear()} {SITE.title}
            </span>
            <span>built on the open web</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
