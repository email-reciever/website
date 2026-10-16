import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			// test-only wrangler config: identical to wrangler.toml minus the
			// [ai] binding — Workers AI cannot run locally, and its presence
			// would push the pool into a remote-proxy session (CLOUDFLARE_API_TOKEN).
			// The tested fetch routes never invoke the translator.
			wrangler: { configPath: "./wrangler.test.toml" },
		}),
	],
});
