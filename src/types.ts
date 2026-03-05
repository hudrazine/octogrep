import { z } from "incur";

export const searchOptionsSchema = z.object({
	repo: z.array(z.string()).optional().describe("Filter by repository (owner/repo). Repeatable."),
	owner: z.array(z.string()).optional().describe("Filter by owner. Repeatable."),
	language: z.array(z.string()).optional().describe("Filter by language. Repeatable."),
	path: z.string().optional().describe("Filter by path qualifier."),
	filename: z.string().optional().describe("Filter by filename qualifier."),
	extension: z.string().optional().describe("Filter by extension qualifier."),
	limit: z.number().int().min(1).max(100).default(20).describe("Max number of results per page (1-100)."),
	page: z.number().int().min(1).default(1).describe("Page number (1-based)."),
});

export type SearchOptions = z.output<typeof searchOptionsSchema>;

export const searchItemSchema = z.object({
	repository: z.string(),
	path: z.string(),
	sha: z.string(),
	url: z.string(),
	fragment: z.string().nullable(),
});

export const searchOutputSchema = z.object({
	query: z.string(),
	compiledQuery: z.string(),
	meta: z.object({
		totalCount: z.number(),
		incompleteResults: z.boolean(),
		page: z.number(),
		limit: z.number(),
		returnedCount: z.number(),
	}),
	items: z.array(searchItemSchema),
});

export type SearchOutput = z.output<typeof searchOutputSchema>;
