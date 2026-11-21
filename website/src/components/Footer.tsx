import { SITE } from "@/lib/sources";

export function Footer() {
  return (
    <footer className="border-t border-base-300/70 bg-base-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-10 text-center sm:px-6">
        <p className="mono-label">Email Reciever / End of feed</p>
        <p className="text-[13px] leading-relaxed text-base-content/45">
          Cloudflare Worker 接收邮件与 RSS，自动翻译生成 · 内容经 GitHub 存储 ·{" "}
          <a
            href={SITE.repo}
            target="_blank"
            rel="noreferrer"
            className="text-base-content/70 underline underline-offset-2 decoration-base-content/25 hover:text-base-content"
          >
            email-reciever/website
          </a>
        </p>
        <p className="font-mono text-[11px] text-base-content/30">
          © {new Date().getFullYear()} {SITE.title} · built on the open web
        </p>
      </div>
    </footer>
  );
}
