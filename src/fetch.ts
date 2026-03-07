import { fetchFileContentsWithGh, getAuthenticatedGhHosts, OctogrepError } from "./gh.js";

function isContentsApiPath(pathname: string): boolean {
	return (
		/^(?:\/api\/v3)?\/repos\/[^/]+\/[^/]+\/contents\/.+/.test(pathname) ||
		/^(?:\/api\/v3)?\/repositories\/\d+\/contents\/.+/.test(pathname)
	);
}

function getAllowedApiHosts(authenticatedHosts: string[]): Set<string> {
	const hosts = new Set<string>();

	for (const host of authenticatedHosts) {
		if (host === "github.com") {
			hosts.add("api.github.com");
			continue;
		}

		hosts.add(host);
	}

	return hosts;
}

export function validateContentsUrl(contentsUrl: string, authenticatedHosts: string[]): string {
	const normalized = contentsUrl.trim();
	if (normalized.length === 0) {
		throw new OctogrepError("INVALID_CONTENTS_URL", "Contents URL must not be empty.");
	}

	let parsed: URL;
	try {
		parsed = new URL(normalized);
	} catch {
		throw new OctogrepError("INVALID_CONTENTS_URL", "Contents URL must be a valid absolute URL.");
	}

	if (parsed.protocol !== "https:") {
		throw new OctogrepError("INVALID_CONTENTS_URL", "Contents URL must use https.");
	}

	if (!getAllowedApiHosts(authenticatedHosts).has(parsed.host)) {
		throw new OctogrepError("INVALID_CONTENTS_URL", "Contents URL host must match an authenticated GitHub API host.");
	}

	if (!isContentsApiPath(parsed.pathname)) {
		throw new OctogrepError(
			"INVALID_CONTENTS_URL",
			"Contents URL must be a GitHub Contents API URL from octogrep search results.",
		);
	}

	const ref = parsed.searchParams.get("ref")?.trim();
	if (!ref) {
		throw new OctogrepError(
			"INVALID_CONTENTS_URL",
			"Contents URL must include a non-empty ref query parameter from octogrep search results.",
		);
	}

	return normalized;
}

export function executeFetch(contentsUrl: string): string {
	const authenticatedHosts = getAuthenticatedGhHosts();
	const validatedUrl = validateContentsUrl(contentsUrl, authenticatedHosts);
	return fetchFileContentsWithGh(validatedUrl);
}
