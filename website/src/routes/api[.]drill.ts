import { createFileRoute } from "@tanstack/react-router";

const WORKER = "https://subscribe-email.jiangjiangjiangxi.workers.dev";

/** Proxy to the Worker's Browserless drill endpoint (keeps the key server-side). */
export const Route = createFileRoute("/api.drill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { urls?: string[] };
          const response = await fetch(`${WORKER}/weekly/drill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: (body.urls ?? []).slice(0, 3) }),
            signal: AbortSignal.timeout(120_000),
          });
          return new Response(await response.text(), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 503 });
        }
      },
    },
  },
});
