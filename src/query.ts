import type { SearchOptions } from "./types.js";

const QUALIFIER_KEYS = {
	repo: "repo",
	owner: "owner",
	language: "language",
	path: "path",
	filename: "filename",
	extension: "extension",
} as const;

export type QueryConflict = {
	option: keyof typeof QUALIFIER_KEYS;
	qualifier: string;
};

export type CompiledQueryResult = {
	compiledQuery: string;
	conflicts: QueryConflict[];
};

function quoteQualifierValue(value: string): string {
	if (/\s|"/.test(value)) return JSON.stringify(value);
	return value;
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasQualifier(query: string, qualifier: string): boolean {
	const escapedQualifier = escapeRegex(qualifier);
	const pattern = new RegExp(`(^|[\\s()\\[\\]{}"'])[-+]?${escapedQualifier}:`, "i");
	return pattern.test(query);
}

export function compileQuery(inputQuery: string, options: SearchOptions): CompiledQueryResult {
	const query = inputQuery.trim();

	const conflicts: QueryConflict[] = [];
	for (const [option, qualifier] of Object.entries(QUALIFIER_KEYS) as Array<[keyof typeof QUALIFIER_KEYS, string]>) {
		const value = options[option];
		if (value === undefined) continue;
		if (Array.isArray(value) && value.length === 0) continue;
		if (typeof value === "string" && value.length === 0) continue;

		if (hasQualifier(query, qualifier)) {
			conflicts.push({ option, qualifier });
		}
	}

	const segments = [query];
	for (const repo of options.repo ?? []) segments.push(`repo:${quoteQualifierValue(repo)}`);
	for (const owner of options.owner ?? []) segments.push(`owner:${quoteQualifierValue(owner)}`);
	for (const language of options.language ?? []) segments.push(`language:${quoteQualifierValue(language)}`);
	if (options.path) segments.push(`path:${quoteQualifierValue(options.path)}`);
	if (options.filename) segments.push(`filename:${quoteQualifierValue(options.filename)}`);
	if (options.extension) segments.push(`extension:${quoteQualifierValue(options.extension)}`);

	return {
		compiledQuery: segments.join(" ").trim(),
		conflicts,
	};
}
