import { Cli, z } from "incur";

import { executeFetch } from "./fetch.js";
import { OctogrepError } from "./gh.js";
import { executeSearch } from "./search.js";
import { searchOptionsSchema, searchOutputSchema } from "./types.js";

export const OCTOGREP_VERSION = "0.2.0";

export const cli = Cli.create("octogrep", {
	version: OCTOGREP_VERSION,
	description: "A lightweight GitHub code search CLI for AI agents, outputting token-efficient results.",
});

type ErrorContext = {
	error: (input: {
		code: string;
		message: string;
		retryable: boolean;
		cta?: {
			description: string;
			commands: string[];
		};
	}) => never;
};

function handleOctogrepError(c: ErrorContext, error: OctogrepError) {
	switch (error.code) {
		case "GH_NOT_INSTALLED":
			return c.error({
				code: error.code,
				message: `${error.message} Install GitHub CLI from https://cli.github.com/.`,
				retryable: false,
			});
		case "GH_NOT_AUTHENTICATED":
			return c.error({
				code: error.code,
				message: `${error.message} Run gh auth login and retry.`,
				retryable: true,
			});
		case "QUERY_CONFLICT":
			return c.error({
				code: error.code,
				message: error.message,
				retryable: false,
				cta: {
					description: "Use either raw query qualifiers or the corresponding options:",
					commands: ["search 'term repo:owner/name'", "search term --repo owner/name"],
				},
			});
		default:
			return c.error({
				code: error.code,
				message: error.message,
				retryable: error.retryable,
			});
	}
}

cli.command("search", {
	description: "Search GitHub code and output token-efficient results.",
	args: z.object({
		query: z.string().describe("Search query in GitHub code search syntax."),
	}),
	options: searchOptionsSchema,
	output: searchOutputSchema,
	examples: [
		{
			args: { query: '"http client"' },
			description: "Search code by free text",
		},
		{
			args: { query: '"root command"' },
			options: { repo: ["cli/cli"], language: ["go"], limit: 5 },
			description: "Search in a repository with qualifiers",
		},
		{
			args: { query: '"panic"' },
			options: { org: ["cli"], filename: "root.go", limit: 5 },
			description: "Search within an organization using GitHub code search qualifiers",
		},
	],
	async run(c) {
		try {
			return executeSearch(c.args.query, c.options);
		} catch (error) {
			if (error instanceof OctogrepError) {
				return handleOctogrepError(c, error);
			}

			throw error;
		}
	},
});

cli.command("fetch", {
	description: "Fetch raw file contents from a GitHub Contents API URL.",
	args: z.object({
		contentsUrl: z.string().describe("GitHub Contents API URL from octogrep search results."),
	}),
	output: z.string(),
	examples: [
		{
			args: {
				contentsUrl: "https://api.github.com/repositories/212613049/contents/pkg/cmd/root/root.go?ref=main",
			},
			description: "Fetch raw file contents from a search result contentsUrl",
		},
	],
	async run(c) {
		try {
			return executeFetch(c.args.contentsUrl);
		} catch (error) {
			if (error instanceof OctogrepError) {
				return handleOctogrepError(c, error);
			}

			throw error;
		}
	},
});
