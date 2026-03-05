import { Cli, z } from "incur";

import { OctogrepError } from "./gh.js";
import { executeSearch } from "./search.js";
import { searchOptionsSchema, searchOutputSchema } from "./types.js";

export const OCTOGREP_VERSION = "0.0.1";

export const cli = Cli.create("octogrep", {
	version: OCTOGREP_VERSION,
	description: "A lightweight GitHub code search CLI for AI agents, outputting token-efficient results.",
});

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
	],
	async run(c) {
		try {
			return executeSearch(c.args.query, c.options);
		} catch (error) {
			if (error instanceof OctogrepError) {
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

			throw error;
		}
	},
});
