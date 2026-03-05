import { describe, expect, it } from "vitest";

import { compileQuery } from "../src/query.js";
import type { SearchOptions } from "../src/types.js";

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

describe("compileQuery", () => {
	it("appends qualifiers from options", () => {
		const result = compileQuery("root command", options({ repo: ["cli/cli"], language: ["go"] }));
		expect(result.compiledQuery).toBe("root command repo:cli/cli language:go");
		expect(result.conflicts).toEqual([]);
	});

	it("quotes qualifier values with spaces", () => {
		const result = compileQuery("http", options({ path: "src core" }));
		expect(result.compiledQuery).toBe('http path:"src core"');
	});

	it("detects conflicts when raw query already has qualifier", () => {
		const result = compileQuery("panic repo:cli/cli", options({ repo: ["owner/repo"] }));
		expect(result.conflicts).toEqual([{ option: "repo", qualifier: "repo" }]);
	});

	it("detects conflicts when qualifier is wrapped in parentheses", () => {
		const result = compileQuery("(repo:cli/cli OR repo:vercel/next.js)", options({ repo: ["owner/repo"] }));
		expect(result.conflicts).toEqual([{ option: "repo", qualifier: "repo" }]);
	});

	it("detects conflicts when qualifier is quoted", () => {
		const result = compileQuery('"repo:cli/cli"', options({ repo: ["owner/repo"] }));
		expect(result.conflicts).toEqual([{ option: "repo", qualifier: "repo" }]);
	});

	it("detects conflicts when qualifier is prefixed with minus", () => {
		const result = compileQuery("-repo:cli/cli", options({ repo: ["owner/repo"] }));
		expect(result.conflicts).toEqual([{ option: "repo", qualifier: "repo" }]);
	});

	it("does not produce false positives for path-like fragments", () => {
		const result = compileQuery("path:src/repo:notes", options({ repo: ["owner/repo"] }));
		expect(result.conflicts).toEqual([]);
	});

	it("does not produce false positives for prefixed tokens", () => {
		const result = compileQuery("xrepo:cli/cli", options({ repo: ["owner/repo"] }));
		expect(result.conflicts).toEqual([]);
	});

	it("does not treat hyphenated literals as raw qualifiers", () => {
		const result = compileQuery("my-repo:foo", options({ repo: ["owner/repo"] }));
		expect(result.conflicts).toEqual([]);
	});
});
