import { describe, expect, it, vi } from "vitest";

import { executeSearch } from "../src/search.js";
import type { SearchOptions } from "../src/types.js";

const { ensureGhReady, searchCodeWithGh } = vi.hoisted(() => ({
	ensureGhReady: vi.fn(),
	searchCodeWithGh: vi.fn(),
}));

vi.mock("../src/gh.js", async () => {
	const actual = await vi.importActual<typeof import("../src/gh.js")>("../src/gh.js");
	return {
		...actual,
		ensureGhReady,
		searchCodeWithGh,
	};
});

function options(overrides: Partial<SearchOptions> = {}): SearchOptions {
	return {
		repo: undefined,
		org: undefined,
		user: undefined,
		language: undefined,
		path: undefined,
		filename: undefined,
		extension: undefined,
		limit: 20,
		page: 1,
		...overrides,
	};
}

describe("executeSearch", () => {
	it("normalizes GitHub response into compact output", () => {
		searchCodeWithGh.mockReturnValue({
			total_count: 2,
			incomplete_results: false,
			items: [
				{
					path: "src/index.ts",
					sha: "blob-sha-1",
					url: "https://api.github.com/repos/a/b/contents/src/index.ts?ref=commit-sha-1",
					html_url: "https://github.com/a/b/blob/commit-sha-1/src/index.ts",
					repository: { full_name: "a/b" },
					text_matches: [{ fragment: "const x = 1" }],
				},
				{
					path: "docs/My File.md",
					sha: "blob-sha-2",
					url: "https://api.github.com/repos/a/b/contents/docs/My%20File.md?ref=commit-sha-2",
					html_url: "https://github.com/a/b/blob/commit-sha-2/docs/My%20File.md",
					repository: { full_name: "a/b" },
				},
			],
		});

		const result = executeSearch("index", options({ repo: ["a/b"] }));

		expect(ensureGhReady).toHaveBeenCalledTimes(1);
		expect(searchCodeWithGh).toHaveBeenCalledWith({
			query: "index repo:a/b",
			limit: 20,
			page: 1,
		});
		expect(result.meta).toEqual({
			totalCount: 2,
			incompleteResults: false,
			page: 1,
			limit: 20,
			returnedCount: 2,
		});
		expect(result.items[0]?.sha).toBe("blob-sha-1");
		expect(result.items[1]?.sha).toBe("blob-sha-2");
		expect(result.items[0]?.htmlUrl).toBe("https://github.com/a/b/blob/commit-sha-1/src/index.ts");
		expect(result.items[1]?.htmlUrl).toBe("https://github.com/a/b/blob/commit-sha-2/docs/My%20File.md");
		expect(result.items[0]?.contentsUrl).toBe(
			"https://api.github.com/repos/a/b/contents/src/index.ts?ref=commit-sha-1",
		);
		expect(result.items[1]?.contentsUrl).toBe(
			"https://api.github.com/repos/a/b/contents/docs/My%20File.md?ref=commit-sha-2",
		);
		expect(result.items[0]?.fragment).toBe("const x = 1");
		expect(result.items[1]?.fragment).toBeNull();
	});

	it("passes through API URLs without transforming encoded characters", () => {
		searchCodeWithGh.mockReturnValue({
			total_count: 2,
			incomplete_results: false,
			items: [
				{
					path: "docs/C++ Guide@2.md",
					sha: "blob-sha-3",
					url: "https://api.github.com/repos/a/b/contents/docs/C++%20Guide@2.md?ref=main",
					html_url: "https://github.com/a/b/blob/main/docs/C++%20Guide@2.md",
					repository: { full_name: "a/b" },
				},
				{
					path: "docs/100% coverage.md",
					sha: "blob-sha-4",
					url: "https://api.github.com/repos/a/b/contents/docs/100%25%20coverage.md?ref=main",
					html_url: "https://github.com/a/b/blob/main/docs/100%25%20coverage.md",
					repository: { full_name: "a/b" },
				},
			],
		});

		const result = executeSearch("docs", options({ repo: ["a/b"] }));

		expect(result.items[0]?.contentsUrl).toBe(
			"https://api.github.com/repos/a/b/contents/docs/C++%20Guide@2.md?ref=main",
		);
		expect(result.items[1]?.contentsUrl).toBe(
			"https://api.github.com/repos/a/b/contents/docs/100%25%20coverage.md?ref=main",
		);
	});

	it("rejects empty query", () => {
		expect(() => executeSearch("   ", options())).toThrowError("Search query must not be empty.");
	});

	it("passes org and user qualifiers through compiled query", () => {
		searchCodeWithGh.mockReturnValue({
			total_count: 0,
			incomplete_results: false,
			items: [],
		});

		executeSearch("panic", options({ org: ["cli"], user: ["vercel"] }));

		expect(searchCodeWithGh).toHaveBeenLastCalledWith({
			query: "panic org:cli user:vercel",
			limit: 20,
			page: 1,
		});
	});
});
