import { describe, expect, it } from "vitest";

import { executeSearch } from "../src/search.js";

const runE2E = process.env.OCTOGREP_E2E === "1";
const maybeDescribe = runE2E ? describe : describe.skip;

maybeDescribe("octogrep e2e", () => {
	it("runs a real GitHub code search through gh", () => {
		const result = executeSearch("root command", {
			repo: ["cli/cli"],
			owner: undefined,
			language: undefined,
			path: undefined,
			filename: "root.go",
			extension: undefined,
			limit: 5,
			page: 1,
		});

		expect(result.meta.limit).toBe(5);
		expect(Array.isArray(result.items)).toBe(true);
		if (result.items.length > 0) {
			expect(typeof result.items[0]?.htmlUrl).toBe("string");
			expect(typeof result.items[0]?.contentsUrl).toBe("string");
		}
	});
});
