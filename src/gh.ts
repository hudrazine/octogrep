import { spawnSync } from "node:child_process";

export type OctogrepErrorCode =
	| "GH_NOT_INSTALLED"
	| "GH_NOT_AUTHENTICATED"
	| "GH_SEARCH_FAILED"
	| "GH_RESPONSE_INVALID"
	| "QUERY_CONFLICT"
	| "INVALID_QUERY";

export class OctogrepError extends Error {
	readonly code: OctogrepErrorCode;
	readonly retryable: boolean;

	constructor(code: OctogrepErrorCode, message: string, retryable = false) {
		super(message);
		this.code = code;
		this.retryable = retryable;
	}
}

type GhResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
};

function extractHttpStatus(result: GhResult): number | undefined {
	const stderrMatch = result.stderr.match(/\(HTTP (\d{3})\)/i);
	if (stderrMatch?.[1]) return Number(stderrMatch[1]);

	try {
		const parsed = JSON.parse(result.stdout) as { status?: number | string };
		const status =
			typeof parsed.status === "number"
				? parsed.status
				: typeof parsed.status === "string"
					? Number(parsed.status)
					: Number.NaN;
		if (Number.isInteger(status)) return status;
	} catch {}

	return undefined;
}

function isRetryableGhFailure(status: number | undefined): boolean {
	if (status === undefined) return true;
	if (status === 408 || status === 429) return true;
	return status >= 500 && status <= 599;
}

function runGh(args: string[]): GhResult {
	const result = spawnSync("gh", args, {
		encoding: "utf8",
	});

	if (result.error) {
		if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new OctogrepError("GH_NOT_INSTALLED", "GitHub CLI (gh) is not installed.");
		}
		throw new OctogrepError("GH_SEARCH_FAILED", result.error.message, true);
	}

	return {
		exitCode: result.status ?? 1,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

export function ensureGhReady(): void {
	const version = runGh(["--version"]);
	if (version.exitCode !== 0) {
		throw new OctogrepError("GH_NOT_INSTALLED", "GitHub CLI (gh) is unavailable.");
	}

	const auth = runGh(["auth", "status"]);
	if (auth.exitCode !== 0) {
		throw new OctogrepError(
			"GH_NOT_AUTHENTICATED",
			"GitHub CLI is not authenticated. Run `gh auth login` first.",
			true,
		);
	}
}

export function searchCodeWithGh(options: { query: string; limit: number; page: number }): unknown {
	const result = runGh([
		"api",
		"-X",
		"GET",
		"search/code",
		"-H",
		"Accept: application/vnd.github.text-match+json",
		"-f",
		`q=${options.query}`,
		"-f",
		`per_page=${options.limit}`,
		"-f",
		`page=${options.page}`,
	]);

	if (result.exitCode !== 0) {
		const detail = result.stderr.trim() || result.stdout.trim() || "Unknown gh error";
		const status = extractHttpStatus(result);
		throw new OctogrepError("GH_SEARCH_FAILED", `GitHub search failed: ${detail}`, isRetryableGhFailure(status));
	}

	try {
		return JSON.parse(result.stdout);
	} catch {
		throw new OctogrepError("GH_RESPONSE_INVALID", "GitHub CLI returned invalid JSON.");
	}
}
