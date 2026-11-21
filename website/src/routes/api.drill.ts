import { createFileRoute } from "@tanstack/react-router";

/** Proxy to the parser Worker through a Service Binding — a Worker cannot
 * fetch another Worker's workers.dev URL (Cloudflare error 1042). */
export const Route = createFileRoute("/api/drill")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { urls?: string[] };
          const parser = (process.env as unknown as { PARSER: { fetch: typeof fetch } }).PARSER;
          const response = await parser.fetch("https://parser.internal/weekly/drill", {
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
