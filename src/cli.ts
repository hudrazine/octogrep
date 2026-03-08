import { Cli, z } from "incur";

import { executeFetch } from "./fetch.js";
import { OctogrepError } from "./gh.js";
import { executeSearch } from "./search.js";
import { searchOptionsSchema, searchOutputSchema } from "./types.js";

export const OCTOGREP_VERSION = "0.3.0";

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

type PublicErrorResponse = Parameters<ErrorContext["error"]>[0];

export function formatOctogrepError(error: OctogrepError): PublicErrorResponse {
	switch (error.code) {
		case "GH_NOT_INSTALLED":
			return {
				code: error.code,
				message: `${error.message} Install GitHub CLI from https://cli.github.com/ and rerun the same command.`,
				retryable: false,
			};
		case "GH_NOT_AUTHENTICATED":
			return {
				code: error.code,
				message: `${error.message} Run \`gh auth login\`, then rerun the same command.`,
				retryable: true,
			};
		case "QUERY_CONFLICT":
			return {
				code: error.code,
				message: error.message,
				retryable: false,
				cta: {
					// Keep commands only for deterministic octogrep-owned errors. GH/gh failures
					// stay in message form because we cannot safely synthesize a replay command.
					description:
						"Use either raw query qualifiers or the corresponding options. Do not specify the same qualifier family in both places.",
					commands: ["search 'term org:my-org'", "search term --org my-org"],
				},
			};
		case "INVALID_QUERY":
			return {
				code: error.code,
				message: error.message,
				retryable: false,
				cta: {
					description: "Provide a non-empty query first, then add filters with CLI options if needed.",
					commands: ['search "http client" --limit 5'],
				},
			};
		case "INVALID_CONTENTS_URL":
			return {
				code: error.code,
				message: `${error.message} Use the contentsUrl returned by octogrep search as-is.`,
				retryable: false,
			};
		case "GH_SEARCH_FAILED":
			return {
				code: error.code,
				message: error.retryable
					? `${error.message} Retry the same search after a short pause or with a narrower scope.`
					: `${error.message} Check the message, then verify auth or permissions or adjust the query before retrying.`,
				retryable: error.retryable,
			};
		case "GH_FETCH_FAILED":
			return {
				code: error.code,
				message: error.retryable
					? `${error.message} Retry the same fetch after a short pause.`
					: `${error.message} Check the message, then verify auth or permissions or use a fresh contentsUrl before retrying.`,
				retryable: error.retryable,
			};
		case "GH_RESPONSE_INVALID":
			return {
				code: error.code,
				message: "GitHub CLI returned an unexpected response. Check gh directly and report the issue if it persists.",
				retryable: false,
			};
		default:
			return {
				code: error.code,
				message: error.message,
				retryable: error.retryable,
			};
	}
}

function handleOctogrepError(c: ErrorContext, error: OctogrepError) {
	return c.error(formatOctogrepError(error));
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
			options: { org: ["cli"], filename: "option.go", limit: 5 },
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
