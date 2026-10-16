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
  /** translation provider chain primary: 'google' (non-AI, default) or 'ai' */
  TR_PROVIDER?: "google" | "ai";
}
