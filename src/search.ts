import { z } from "incur";
import { ensureGhReady, OctogrepError, searchCodeWithGh } from "./gh.js";
import { compileQuery } from "./query.js";
import type { SearchOptions, SearchOutput } from "./types.js";

const githubResponseSchema = z.object({
	total_count: z.number(),
	incomplete_results: z.boolean(),
	items: z.array(
		z.object({
			path: z.string(),
			sha: z.string(),
			html_url: z.string(),
			repository: z.object({
				full_name: z.string(),
			}),
			text_matches: z
				.array(
					z.object({
						fragment: z.string(),
					}),
				)
				.optional(),
		}),
	),
});

export function executeSearch(inputQuery: string, options: SearchOptions): SearchOutput {
	const query = inputQuery.trim();
	if (query.length === 0) {
		throw new OctogrepError("INVALID_QUERY", "Search query must not be empty.");
	}

	const { compiledQuery, conflicts } = compileQuery(query, options);
	if (conflicts.length > 0) {
		const details = conflicts.map((item) => `--${item.option} conflicts with ${item.qualifier}:`).join(", ");
		throw new OctogrepError("QUERY_CONFLICT", `Qualifier conflict detected: ${details}`);
	}

	ensureGhReady();
	const raw = searchCodeWithGh({
		query: compiledQuery,
		limit: options.limit,
		page: options.page,
	});

	const parsed = githubResponseSchema.safeParse(raw);
	if (!parsed.success) {
		throw new OctogrepError("GH_RESPONSE_INVALID", "GitHub search response shape was invalid.");
	}

	const items = parsed.data.items.map((item) => ({
		repository: item.repository.full_name,
		path: item.path,
		sha: item.sha,
		url: item.html_url,
		fragment: item.text_matches?.[0]?.fragment ?? null,
	}));

	return {
		query,
		compiledQuery,
		meta: {
			totalCount: parsed.data.total_count,
			incompleteResults: parsed.data.incomplete_results,
			page: options.page,
			limit: options.limit,
			returnedCount: items.length,
		},
		items,
	};
}
