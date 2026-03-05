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
		owner: undefined,
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
					sha: "abc",
					html_url: "https://github.com/a/b/blob/main/src/index.ts",
					repository: { full_name: "a/b" },
					text_matches: [{ fragment: "const x = 1" }],
				},
				{
					path: "README.md",
					sha: "def",
					html_url: "https://github.com/a/b/blob/main/README.md",
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
		expect(result.items[0]?.fragment).toBe("const x = 1");
		expect(result.items[1]?.fragment).toBeNull();
	});

	it("rejects empty query", () => {
		expect(() => executeSearch("   ", options())).toThrowError("Search query must not be empty.");
	});
});
