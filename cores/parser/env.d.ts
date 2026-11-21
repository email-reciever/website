// Secrets (set via `wrangler secret put`) are not visible to `wrangler types`,
// so declare them here — they merge into the generated global Env interface.

interface Env {
  /** GitHub PAT used to commit content and metadata */
  REPO_TOKEN: string;
  /** zhihu crawl auth cookie */
  ZHIHU_COOKIE: string;
  /** set to 'dev' to route writes through the local deno server */
  ENV?: "dev";
  /** optional override for the Workers AI translation model */
  TR_MODEL?: string;
  /** translation provider chain primary */
  TR_PROVIDER?: "mymemory" | "ai" | "google";
  /** email raises MyMemory's keyless daily quota from 5k to 50k chars */
  MYMEMORY_EMAIL?: string;
  /** self service binding used by the cron fan-out (fresh subrequest budget per source) */
  SELF: Fetcher;
  /** Browserless API key for optional weekly down-drill CDP scans */
  BROWSERLESS_KEY?: string;
}
