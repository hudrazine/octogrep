import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeSearch, executeFetch } = vi.hoisted(() => ({
	executeSearch: vi.fn(),
	executeFetch: vi.fn(),
}));

vi.mock("../src/search.js", () => ({
	executeSearch,
}));

vi.mock("../src/fetch.js", () => ({
	executeFetch,
}));

import packageJson from "../package.json";
import { cli, OCTOGREP_VERSION } from "../src/cli.js";
import { OctogrepError } from "../src/gh.js";

async function expectCliJsonError(argv: string[]) {
	let output = "";
	let exitCode: number | undefined;

	await cli.serve(argv, {
		stdout(chunk) {
			output += chunk;
		},
		exit(code) {
			exitCode = code;
		},
	});

	return {
		exitCode,
		parsed: JSON.parse(output),
	};
}

beforeEach(() => {
	executeSearch.mockReset();
	executeFetch.mockReset();
});

describe("cli metadata", () => {
	it("exposes package bin mapping for octogrep", () => {
		expect(packageJson.bin).toEqual({ octogrep: "dist/index.js" });
	});

	it("prints version with --version", async () => {
		let output = "";
		let exitCode: number | undefined;

		await cli.serve(["--version"], {
			stdout(chunk) {
				output += chunk;
			},
			exit(code) {
				exitCode = code;
			},
		});

		expect(exitCode).toBeUndefined();
		expect(output.trim()).toBe(OCTOGREP_VERSION);
		expect(OCTOGREP_VERSION).toBe(packageJson.version);
	});

	it("shows help for search subcommand", async () => {
		let output = "";

		await cli.serve(["search", "--help"], {
			stdout(chunk) {
				output += chunk;
			},
			exit() {},
		});

		expect(output).toContain("Usage: octogrep search <query>");
		expect(output).toContain("--org <array>");
		expect(output).toContain("--user <array>");
		expect(output).not.toContain("--owner");
		expect(output).toContain('octogrep search "panic" --org cli --filename option.go --limit 5');
	});

	it("shows help for fetch subcommand", async () => {
		let output = "";

		await cli.serve(["fetch", "--help"], {
			stdout(chunk) {
				output += chunk;
			},
			exit() {},
		});

		expect(output).toContain("Usage: octogrep fetch <contentsUrl>");
	});

	it("returns COMMAND_NOT_FOUND for legacy root query style", async () => {
		let output = "";
		let exitCode: number | undefined;

		await cli.serve(["legacy", "--json"], {
			stdout(chunk) {
				output += chunk;
			},
			exit(code) {
				exitCode = code;
			},
		});

		const parsed = JSON.parse(output);
		expect(exitCode).toBe(1);
		expect(parsed.code).toBe("COMMAND_NOT_FOUND");
	});

	it("returns org-based conflict guidance for QUERY_CONFLICT", async () => {
		executeSearch.mockImplementation(() => {
			throw new OctogrepError("QUERY_CONFLICT", "Qualifier conflict detected: --org conflicts with org:");
		});

		const { exitCode, parsed } = await expectCliJsonError(["search", "panic org:cli", "--org", "cli", "--json"]);
		expect(exitCode).toBe(1);
		expect(parsed.code).toBe("QUERY_CONFLICT");
		expect(parsed.cta.description).toContain("same qualifier family");
		expect(parsed.cta.commands).toEqual([
			{ command: "octogrep search 'term org:my-org'" },
			{ command: "octogrep search term --org my-org" },
		]);
	});

	it("returns install guidance in message for GH_NOT_INSTALLED", async () => {
		executeSearch.mockImplementation(() => {
			throw new OctogrepError("GH_NOT_INSTALLED", "GitHub CLI (gh) is not installed.");
		});

		const { exitCode, parsed } = await expectCliJsonError(["search", "panic", "--json"]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "GH_NOT_INSTALLED",
			message:
				"GitHub CLI (gh) is not installed. Install GitHub CLI from https://cli.github.com/ and rerun the same command.",
			retryable: false,
		});
		expect(parsed.cta).toBeUndefined();
	});

	it("returns auth guidance in message for GH_NOT_AUTHENTICATED", async () => {
		executeSearch.mockImplementation(() => {
			throw new OctogrepError(
				"GH_NOT_AUTHENTICATED",
				"GitHub CLI is not authenticated. Run `gh auth login` first.",
				true,
			);
		});

		const { exitCode, parsed } = await expectCliJsonError(["search", "panic", "--json"]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "GH_NOT_AUTHENTICATED",
			message:
				"GitHub CLI is not authenticated. Run `gh auth login` first. Run `gh auth login`, then rerun the same command.",
			retryable: true,
		});
		expect(parsed.cta).toBeUndefined();
	});

	it("returns invalid query guidance with a deterministic CTA", async () => {
		executeSearch.mockImplementation(() => {
			throw new OctogrepError("INVALID_QUERY", "Search query must not be empty.");
		});

		const { exitCode, parsed } = await expectCliJsonError(["search", "   ", "--json"]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "INVALID_QUERY",
			retryable: false,
			cta: {
				description: expect.stringContaining("non-empty query"),
			},
		});
		expect(parsed.cta.commands).toEqual([{ command: 'octogrep search "http client" --limit 5' }]);
	});

	it("returns contentsUrl guidance in message for INVALID_CONTENTS_URL", async () => {
		executeFetch.mockImplementation(() => {
			throw new OctogrepError(
				"INVALID_CONTENTS_URL",
				"Contents URL must be a GitHub Contents API URL from octogrep search results.",
			);
		});

		const { exitCode, parsed } = await expectCliJsonError([
			"fetch",
			"https://github.com/a/b/blob/main/src/index.ts",
			"--json",
		]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "INVALID_CONTENTS_URL",
			message:
				"Contents URL must be a GitHub Contents API URL from octogrep search results. Use the contentsUrl returned by octogrep search as-is.",
			retryable: false,
		});
		expect(parsed.cta).toBeUndefined();
	});

	it("returns retry guidance in message for retryable GH_SEARCH_FAILED", async () => {
		executeSearch.mockImplementation(() => {
			throw new OctogrepError("GH_SEARCH_FAILED", "GitHub search failed: Service Unavailable", true);
		});

		const { exitCode, parsed } = await expectCliJsonError(["search", "panic", "--json"]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "GH_SEARCH_FAILED",
			message:
				"GitHub search failed: Service Unavailable Retry the same search after a short pause or with a narrower scope.",
			retryable: true,
		});
		expect(parsed.cta).toBeUndefined();
	});

	it("returns non-retryable guidance in message for GH_SEARCH_FAILED", async () => {
		executeSearch.mockImplementation(() => {
			throw new OctogrepError("GH_SEARCH_FAILED", "GitHub search failed: Validation Failed", false);
		});

		const { exitCode, parsed } = await expectCliJsonError(["search", "panic", "--json"]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "GH_SEARCH_FAILED",
			message:
				"GitHub search failed: Validation Failed Check the message, then verify auth or permissions or adjust the query before retrying.",
			retryable: false,
		});
		expect(parsed.cta).toBeUndefined();
	});

	it("returns retry guidance in message for retryable GH_FETCH_FAILED", async () => {
		executeFetch.mockImplementation(() => {
			throw new OctogrepError("GH_FETCH_FAILED", "GitHub fetch failed: Service Unavailable", true);
		});

		const { exitCode, parsed } = await expectCliJsonError([
			"fetch",
			"https://api.github.com/repositories/1/contents/src/index.ts?ref=main",
			"--json",
		]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "GH_FETCH_FAILED",
			message: "GitHub fetch failed: Service Unavailable Retry the same fetch after a short pause.",
			retryable: true,
		});
		expect(parsed.cta).toBeUndefined();
	});

	it("returns non-retryable guidance in message for GH_FETCH_FAILED", async () => {
		executeFetch.mockImplementation(() => {
			throw new OctogrepError("GH_FETCH_FAILED", "GitHub fetch failed: Validation Failed", false);
		});

		const { exitCode, parsed } = await expectCliJsonError([
			"fetch",
			"https://api.github.com/repositories/1/contents/src/index.ts?ref=main",
			"--json",
		]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "GH_FETCH_FAILED",
			message:
				"GitHub fetch failed: Validation Failed Check the message, then verify auth or permissions or use a fresh contentsUrl before retrying.",
			retryable: false,
		});
		expect(parsed.cta).toBeUndefined();
	});

	it("returns a short non-retryable message for GH_RESPONSE_INVALID", async () => {
		executeSearch.mockImplementation(() => {
			throw new OctogrepError("GH_RESPONSE_INVALID", "GitHub CLI returned invalid JSON.");
		});

		const { exitCode, parsed } = await expectCliJsonError(["search", "panic", "--json"]);
		expect(exitCode).toBe(1);
		expect(parsed).toMatchObject({
			code: "GH_RESPONSE_INVALID",
			message: "GitHub CLI returned an unexpected response. Check gh directly and report the issue if it persists.",
			retryable: false,
		});
		expect(parsed.cta).toBeUndefined();
	});
});
