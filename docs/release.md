# Release and npm publish

Publishing is automated with GitHub Actions and runs when a GitHub Release is published.

1. Update `package.json` version.
2. Create and publish a GitHub Release with tag `vX.Y.Z` that matches `package.json` version.
3. The `publish` workflow runs `pnpm typecheck`, `pnpm test`, `pnpm build`, then publishes to npm.
4. If recovery is needed after an error, run the same workflow manually from GitHub Actions (`workflow_dispatch`) with `release_tag` (for example, `v0.1.0`).

Notes:

- Prerelease GitHub Releases are skipped and not published to npm.
- If the release tag and `package.json` version do not match, publishing fails.

## One-time npm setup (Trusted Publishing)

Configure npm Trusted Publisher to allow OIDC publishing from:

- GitHub repository: `hudrazine/octogrep`
- Workflow file: `.github/workflows/publish.yml`

After this setup, no long-lived `NPM_TOKEN` secret is required for publishing.
