import { describe, expect, it } from "vitest";

import packageJson from "../package.json";
import { cli, OCTOGREP_VERSION } from "../src/cli.js";

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
		let output = "";
		let exitCode: number | undefined;

		await cli.serve(["search", "panic org:cli", "--org", "cli", "--json"], {
			stdout(chunk) {
				output += chunk;
			},
			exit(code) {
				exitCode = code;
			},
		});

		const parsed = JSON.parse(output);
		expect(exitCode).toBe(1);
		expect(parsed.code).toBe("QUERY_CONFLICT");
		expect(parsed.cta.commands).toEqual([
			{ command: "octogrep search 'term org:my-org'" },
			{ command: "octogrep search term --org my-org" },
		]);
	});
});
