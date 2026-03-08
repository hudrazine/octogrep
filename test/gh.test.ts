import { describe, expect, it, vi } from "vitest";

const { spawnSync } = vi.hoisted(() => ({
	spawnSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
	spawnSync,
}));

import { fetchFileContentsWithGh, getAuthenticatedGhHosts, OctogrepError, searchCodeWithGh } from "../src/gh.js";

function mockGhFailure(stdout: string, stderr: string): void {
	spawnSync.mockReturnValue({
		status: 1,
		stdout,
		stderr,
		error: undefined,
	});
}

function expectSearchGhFailure(input: { message: string; retryable: boolean }): void {
	try {
		searchCodeWithGh({ query: "test", limit: 20, page: 1 });
		expect.unreachable("Expected GH_SEARCH_FAILED to be thrown");
	} catch (error) {
		expect(error).toBeInstanceOf(OctogrepError);
		const octogrepError = error as OctogrepError;
		expect(octogrepError.code).toBe("GH_SEARCH_FAILED");
		expect(octogrepError.retryable).toBe(input.retryable);
		expect(octogrepError.message).toBe(input.message);
	}
}

describe("searchCodeWithGh retryable classification", () => {
	it("marks HTTP 422 as non-retryable", () => {
		mockGhFailure(
			'{"message":"Validation Failed","errors":[{"resource":"Search","field":"q","code":"missing"}],"status":"422"}',
			"gh: Validation Failed (HTTP 422)",
		);

		expectSearchGhFailure({
			retryable: false,
			message: "GitHub search failed: Validation Failed (HTTP 422)",
		});
	});

	it("marks HTTP 503 as retryable", () => {
		mockGhFailure('{"message":"Service Unavailable","status":"503"}', "gh: Service Unavailable (HTTP 503)");

		expectSearchGhFailure({
			retryable: true,
			message: "GitHub search failed: Service Unavailable (HTTP 503)",
		});
	});

	it("falls back to retryable when status is unavailable", () => {
		mockGhFailure("temporary transport error", "gh: request failed");

		expectSearchGhFailure({
			retryable: true,
			message: "GitHub search failed: gh: request failed",
		});
	});
});

describe("fetchFileContentsWithGh", () => {
	it("requests raw file contents with the GitHub raw accept header", () => {
		spawnSync.mockReturnValue({
			status: 0,
			stdout: "package main\n",
			stderr: "",
			error: undefined,
		});

		const result = fetchFileContentsWithGh("https://api.github.com/repositories/1/contents/src/index.ts?ref=main");

		expect(result).toBe("package main\n");
		expect(spawnSync).toHaveBeenCalledWith(
			"gh",
			[
				"api",
				"-H",
				"Accept: application/vnd.github.raw+json",
				"https://api.github.com/repositories/1/contents/src/index.ts?ref=main",
			],
			{ encoding: "utf8" },
		);
	});

	it("marks HTTP 422 fetch failures as non-retryable", () => {
		mockGhFailure('{"message":"Validation Failed","status":"422"}', "gh: Validation Failed (HTTP 422)");

		try {
			fetchFileContentsWithGh("https://api.github.com/repositories/1/contents/src/index.ts?ref=main");
			expect.unreachable("Expected GH_FETCH_FAILED to be thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(OctogrepError);
			const octogrepError = error as OctogrepError;
			expect(octogrepError.code).toBe("GH_FETCH_FAILED");
			expect(octogrepError.retryable).toBe(false);
			expect(octogrepError.message).toBe("GitHub fetch failed: Validation Failed (HTTP 422)");
		}
	});

	it("marks HTTP 503 fetch failures as retryable", () => {
		mockGhFailure('{"message":"Service Unavailable","status":"503"}', "gh: Service Unavailable (HTTP 503)");

		try {
			fetchFileContentsWithGh("https://api.github.com/repositories/1/contents/src/index.ts?ref=main");
			expect.unreachable("Expected GH_FETCH_FAILED to be thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(OctogrepError);
			const octogrepError = error as OctogrepError;
			expect(octogrepError.code).toBe("GH_FETCH_FAILED");
			expect(octogrepError.retryable).toBe(true);
			expect(octogrepError.message).toBe("GitHub fetch failed: Service Unavailable (HTTP 503)");
		}
	});
});

describe("getAuthenticatedGhHosts", () => {
	it("returns active authenticated hosts and maps public GitHub through github.com auth", () => {
		spawnSync.mockReturnValueOnce({
			status: 0,
			stdout: JSON.stringify({
				hosts: {
					"github.com": [{ host: "github.com", active: true, state: "success" }],
					"ghe.example.com": [{ host: "ghe.example.com", active: true, state: "success" }],
				},
			}),
			stderr: "",
			error: undefined,
		});

		const result = getAuthenticatedGhHosts();

		expect(result).toEqual(["github.com", "ghe.example.com"]);
	});

	it("rejects when no active authenticated hosts are available", () => {
		spawnSync.mockReturnValueOnce({
			status: 0,
			stdout: JSON.stringify({
				hosts: {
					"github.com": [{ host: "github.com", active: false, state: "success" }],
				},
			}),
			stderr: "",
			error: undefined,
		});

		try {
			getAuthenticatedGhHosts();
			expect.unreachable("Expected GH_NOT_AUTHENTICATED to be thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(OctogrepError);
			const octogrepError = error as OctogrepError;
			expect(octogrepError.code).toBe("GH_NOT_AUTHENTICATED");
		}
	});
});
