import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";

import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/noto-sans-sc";
import "@/styles/app.css";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "description", content: "订阅邮件自动翻译与归档 —— 技术 newsletter 的中文阅读站" },
      { title: "Email Reciever — 订阅阅读" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RootDocument>
        <Header />
        <main className="w-full flex-1">
          <Outlet />
        </main>
        <Footer />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </RootDocument>
    </QueryClientProvider>
  );
}

/**
 * Set the theme before hydration to avoid a flash of the wrong theme.
 * daisyUI reads `data-theme` on <html>; default is `dim` (dark-first site).
 */
const themeInitScript = `(function () {
	try {
		var theme = localStorage.getItem('theme') || 'dim';
		document.documentElement.setAttribute('data-theme', theme);
	} catch (e) {}
})();`;

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="dim">
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme-init script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="flex min-h-dvh flex-col bg-base-200 font-sans antialiased selection:bg-[var(--signal)] selection:text-black">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "服务出了点问题";
  return (
    <RootDocument>
      <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-5 text-center">
        <div className="h-px w-16 bg-[var(--signal)]" />
        <div className="mono-label">Error / 500</div>
        <h1 className="display-caps text-7xl text-white/20 sm:text-8xl">Lost signal</h1>
        <p className="max-w-md font-mono text-xs tracking-[0.1em] text-base-content/50">
          {message}
        </p>
        <a href="/" className="btn-cine h-10 px-6">
          Return to feed
        </a>
      </section>
    </RootDocument>
  );
}

function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-5 text-center">
      <div className="h-px w-16 bg-[var(--signal)]" />
      <div className="mono-label">Error / 404</div>
      <h1 className="display-caps text-8xl text-white/20 sm:text-9xl">No signal</h1>
      <p className="font-mono text-xs tracking-[0.1em] text-base-content/50">
        这篇文章不存在或已被移除
      </p>
      <a href="/" className="btn-cine h-10 px-6">
        Return to feed
      </a>
    </section>
  );
}
