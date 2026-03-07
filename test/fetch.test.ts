import { describe, expect, it, vi } from "vitest";

import { executeFetch, validateContentsUrl } from "../src/fetch.js";
import { OctogrepError } from "../src/gh.js";

const { fetchFileContentsWithGh, getAuthenticatedGhHosts } = vi.hoisted(() => ({
	fetchFileContentsWithGh: vi.fn(),
	getAuthenticatedGhHosts: vi.fn(),
}));

vi.mock("../src/gh.js", async () => {
	const actual = await vi.importActual<typeof import("../src/gh.js")>("../src/gh.js");
	return {
		...actual,
		fetchFileContentsWithGh,
		getAuthenticatedGhHosts,
	};
});

describe("validateContentsUrl", () => {
	it("accepts repository-id contents URLs returned by GitHub code search results", () => {
		expect(
			validateContentsUrl(
				"https://api.github.com/repositories/212613049/contents/pkg/cmd/root/root.go?ref=59ba50885feeed63a6f31de06ced5a06a5a3930d",
				["github.com"],
			),
		).toBe(
			"https://api.github.com/repositories/212613049/contents/pkg/cmd/root/root.go?ref=59ba50885feeed63a6f31de06ced5a06a5a3930d",
		);
	});

	it("accepts repo-scoped contents URLs on authenticated enterprise hosts", () => {
		expect(
			validateContentsUrl("https://ghe.example.com/api/v3/repos/a/b/contents/src/index.ts?ref=main", [
				"ghe.example.com",
			]),
		).toBe("https://ghe.example.com/api/v3/repos/a/b/contents/src/index.ts?ref=main");
	});

	it("rejects contents URLs on non-authenticated hosts", () => {
		expect(() =>
			validateContentsUrl("https://example.com/repos/a/b/contents/src/index.ts?ref=main", ["github.com"]),
		).toThrowError(OctogrepError);
	});

	it("rejects plain http contents URLs", () => {
		expect(() =>
			validateContentsUrl("http://api.github.com/repos/a/b/contents/src/index.ts?ref=main", ["github.com"]),
		).toThrowError(OctogrepError);
	});

	it("rejects html URLs", () => {
		expect(() => validateContentsUrl("https://github.com/a/b/blob/main/src/index.ts", ["github.com"])).toThrowError(
			OctogrepError,
		);

		try {
			validateContentsUrl("https://github.com/a/b/blob/main/src/index.ts", ["github.com"]);
			expect.unreachable("Expected INVALID_CONTENTS_URL to be thrown");
		} catch (error) {
			expect((error as OctogrepError).code).toBe("INVALID_CONTENTS_URL");
		}
	});

	it("rejects github.com non-api hosts even when github.com is authenticated", () => {
		expect(() =>
			validateContentsUrl("https://github.com/repos/a/b/contents/src/index.ts?ref=main", ["github.com"]),
		).toThrowError(OctogrepError);
	});

	it("rejects contents URLs without a ref query parameter", () => {
		expect(() =>
			validateContentsUrl("https://api.github.com/repos/a/b/contents/src/index.ts", ["github.com"]),
		).toThrowError(OctogrepError);
	});

	it("rejects contents URLs with an empty ref query parameter", () => {
		expect(() =>
			validateContentsUrl("https://api.github.com/repos/a/b/contents/src/index.ts?ref=", ["github.com"]),
		).toThrowError(OctogrepError);
	});
});

describe("executeFetch", () => {
	it("checks authenticated hosts and fetches the validated contents URL", () => {
		getAuthenticatedGhHosts.mockReturnValue(["github.com"]);
		fetchFileContentsWithGh.mockReturnValue("console.log('ok');\n");

		const result = executeFetch("https://api.github.com/repositories/1/contents/src/index.ts?ref=main");

		expect(result).toBe("console.log('ok');\n");
		expect(getAuthenticatedGhHosts).toHaveBeenCalledTimes(1);
		expect(fetchFileContentsWithGh).toHaveBeenCalledWith(
			"https://api.github.com/repositories/1/contents/src/index.ts?ref=main",
		);
	});
});
