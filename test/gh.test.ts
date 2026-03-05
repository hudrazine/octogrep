import { describe, expect, it, vi } from "vitest";

const { spawnSync } = vi.hoisted(() => ({
	spawnSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
	spawnSync,
}));

import { OctogrepError, searchCodeWithGh } from "../src/gh.js";

function mockGhFailure(stdout: string, stderr: string): void {
	spawnSync.mockReturnValue({
		status: 1,
		stdout,
		stderr,
		error: undefined,
	});
}

function expectGhFailureRetryable(value: boolean): void {
	try {
		searchCodeWithGh({ query: "test", limit: 20, page: 1 });
		expect.unreachable("Expected GH_SEARCH_FAILED to be thrown");
	} catch (error) {
		expect(error).toBeInstanceOf(OctogrepError);
		const octogrepError = error as OctogrepError;
		expect(octogrepError.code).toBe("GH_SEARCH_FAILED");
		expect(octogrepError.retryable).toBe(value);
	}
}

describe("searchCodeWithGh retryable classification", () => {
	it("marks HTTP 422 as non-retryable", () => {
		mockGhFailure(
			'{"message":"Validation Failed","errors":[{"resource":"Search","field":"q","code":"missing"}],"status":"422"}',
			"gh: Validation Failed (HTTP 422)",
		);

		expectGhFailureRetryable(false);
	});

	it("marks HTTP 503 as retryable", () => {
		mockGhFailure('{"message":"Service Unavailable","status":"503"}', "gh: Service Unavailable (HTTP 503)");

		expectGhFailureRetryable(true);
	});

	it("falls back to retryable when status is unavailable", () => {
		mockGhFailure("temporary transport error", "gh: request failed");

		expectGhFailureRetryable(true);
	});
});
