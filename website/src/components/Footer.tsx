import { SITE } from "@/lib/sources";

export function Footer() {
  return (
    <footer className="border-t border-base-300/60 bg-base-100/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-sm text-base-content/50">
        <p>
          由 Cloudflare Worker 接收邮件并自动翻译生成 · 内容经 GitHub 存储 ·{" "}
          <a
            href={SITE.repo}
            target="_blank"
            rel="noreferrer"
            className="link link-hover text-base-content/70"
          >
            email-reciever/website
          </a>
        </p>
        <p>
          © {new Date().getFullYear()} {SITE.title} · RSS 订阅随时欢迎
        </p>
      </div>
    </footer>
  );
}
