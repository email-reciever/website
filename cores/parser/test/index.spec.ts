// test/index.spec.ts
import { env, exports } from "cloudflare:workers";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

describe("fetch routes", () => {
	it("redirects unknown paths to the repository (unit style)", async () => {
		// inbound worker requests carry CF metadata the plain constructor lacks;
		// the test pool's generated Env omits secrets, which these routes never touch
		type IncomingRequest = Parameters<typeof worker.fetch>[0];
		type WorkerEnv = Parameters<typeof worker.fetch>[1];
		const request = new Request("http://example.com/unknown-path") as unknown as IncomingRequest;
		const response = await worker.fetch(request, env as unknown as WorkerEnv);
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("https://github.com/email-reciever/website");
	});

	it("redirects unknown paths to the repository (integration style)", async () => {
		// manual mode: following the absolute redirect inside the same-isolate
		// harness would re-enter this worker and loop until the redirect limit
		const response = await exports.default.fetch("https://example.com/unknown-path", {
			redirect: "manual",
		});
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("https://github.com/email-reciever/website");
	});
});
