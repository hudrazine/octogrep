import { spawnSync } from "node:child_process";

export type OctogrepErrorCode =
	| "GH_NOT_INSTALLED"
	| "GH_NOT_AUTHENTICATED"
	| "GH_SEARCH_FAILED"
	| "GH_FETCH_FAILED"
	| "GH_RESPONSE_INVALID"
	| "QUERY_CONFLICT"
	| "INVALID_QUERY"
	| "INVALID_CONTENTS_URL";

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

type GhAuthStatus = {
	hosts?: Record<
		string,
		Array<{
			active?: boolean;
			host?: string;
			state?: string;
		}>
	>;
};

type GhErrorPayload = {
	message?: string;
	status?: number | string;
};

function parseGhErrorPayload(stdout: string): GhErrorPayload | undefined {
	try {
		return JSON.parse(stdout) as GhErrorPayload;
	} catch {
		return undefined;
	}
}

function extractHttpStatus(result: GhResult, payload?: GhErrorPayload): number | undefined {
	const stderrMatch = result.stderr.match(/\(HTTP (\d{3})\)/i);
	if (stderrMatch?.[1]) return Number(stderrMatch[1]);

	const status =
		typeof payload?.status === "number"
			? payload.status
			: typeof payload?.status === "string"
				? Number(payload.status)
				: Number.NaN;
	if (Number.isInteger(status)) return status;

	return undefined;
}

function isRetryableGhFailure(status: number | undefined): boolean {
	// Keep this classification intentionally coarse. octogrep exposes a retryability hint,
	// but it does not try to fully re-implement GitHub/gh failure semantics.
	if (status === undefined) return true;
	if (status === 408 || status === 429) return true;
	return status >= 500 && status <= 599;
}

function getGhFailureContext(result: GhResult): {
	detail: string;
	status: number | undefined;
} {
	const payload = parseGhErrorPayload(result.stdout);
	const apiMessage = payload?.message?.trim();
	const status = extractHttpStatus(result, payload);

	return {
		// Prefer the API body's message when available, but keep the HTTP status so
		// non-retryable failures still retain useful gh diagnostic context.
		detail:
			apiMessage && status
				? `${apiMessage} (HTTP ${status})`
				: apiMessage || result.stderr.trim() || result.stdout.trim() || "Unknown gh error",
		status,
	};
}

function runGh(args: string[], errorCode: "GH_SEARCH_FAILED" | "GH_FETCH_FAILED" = "GH_SEARCH_FAILED"): GhResult {
	const result = spawnSync("gh", args, {
		encoding: "utf8",
	});

	if (result.error) {
		if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new OctogrepError("GH_NOT_INSTALLED", "GitHub CLI (gh) is not installed.");
		}
		throw new OctogrepError(errorCode, result.error.message, true);
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

	void getAuthenticatedGhHosts();
}

export function getAuthenticatedGhHosts(): string[] {
	const auth = runGh(["auth", "status", "--json", "hosts"]);

	if (auth.exitCode !== 0) {
		throw new OctogrepError(
			"GH_NOT_AUTHENTICATED",
			"GitHub CLI is not authenticated. Run `gh auth login` first.",
			true,
		);
	}

	let parsed: GhAuthStatus;
	try {
		parsed = JSON.parse(auth.stdout) as GhAuthStatus;
	} catch {
		throw new OctogrepError("GH_RESPONSE_INVALID", "GitHub CLI returned invalid auth status JSON.");
	}

	const hosts = Object.values(parsed.hosts ?? {})
		.flat()
		.filter((entry) => entry.active === true && entry.state === "success" && typeof entry.host === "string")
		.map((entry) => entry.host as string);

	if (hosts.length === 0) {
		throw new OctogrepError(
			"GH_NOT_AUTHENTICATED",
			"GitHub CLI is not authenticated. Run `gh auth login` first.",
			true,
		);
	}

	return hosts;
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
		const { detail, status } = getGhFailureContext(result);
		throw new OctogrepError("GH_SEARCH_FAILED", `GitHub search failed: ${detail}`, isRetryableGhFailure(status));
	}

	try {
		return JSON.parse(result.stdout);
	} catch {
		throw new OctogrepError("GH_RESPONSE_INVALID", "GitHub CLI returned invalid JSON.");
	}
}

export function fetchFileContentsWithGh(contentsUrl: string): string {
	const result = runGh(["api", "-H", "Accept: application/vnd.github.raw+json", contentsUrl], "GH_FETCH_FAILED");

	if (result.exitCode !== 0) {
		const { detail, status } = getGhFailureContext(result);
		throw new OctogrepError("GH_FETCH_FAILED", `GitHub fetch failed: ${detail}`, isRetryableGhFailure(status));
	}

	return result.stdout;
}
