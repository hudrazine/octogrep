---
name: octogrep-cli
description: Use the octogrep CLI when searching GitHub code, looking up upstream implementations, collecting framework or API usage examples, sampling symbol usage across repositories, or fetching full file contents from octogrep search results.
---

# octogrep CLI

Use `octogrep` to search GitHub code, inspect promising matches, and fetch full file contents when a fragment is not enough.

## Quick Reference

```bash
# Step 1: Search GitHub code
octogrep search <query> [options]

# Step 2: Fetch the full file when needed
octogrep fetch <contentsUrl>
```

## Workflow

Use this workflow to keep searches small and easy to refine.

### 1. Start with a small search

Begin with a short literal query and a small limit.

```bash
octogrep search "useNavigate" --limit 5
octogrep search "root command" --repo cli/cli --limit 5
```

- Quote multi-word search terms.
- Prefer CLI options like `--repo`, `--org`, `--user`, `--language`, `--path`, `--filename`, and `--extension`.
- Keep the default TOON output unless the next step clearly needs structured parsing.

### 2. Pick the strongest candidates

Use `fragment`, `repository`, and `path` together to choose the best 1 to 3 files.

- Treat `fragment` as a hint, not the final source of truth.
- Refine one dimension at a time if the first search is weak.
- Read [`references/query-patterns.md`](./references/query-patterns.md) when you need ready-made search shapes.

### 3. Fetch the full file when needed

Use `items[].contentsUrl` from `octogrep search` when you need to confirm behavior or compare implementations.

```bash
octogrep fetch "$contentsUrl"
octogrep fetch "$contentsUrl" --token-count
octogrep fetch "$contentsUrl" --token-limit 400 --token-offset 400
```

- Pass the `contentsUrl` exactly as returned, including the `ref` query parameter.
- Do not pass `htmlUrl` to `fetch`.
- Use token controls when the fetched file is too large for one step.

## Query Rules

Use `octogrep search <query> [options]`.

Keep queries short and literal first. Add qualifiers only after the initial signal is weak.
Prefer option style for new commands, and do not mix option style with raw qualifiers for the same qualifier family.
Keep detailed search shapes in [`references/query-patterns.md`](./references/query-patterns.md).

Example:

```sh
octogrep search "useNavigate" --language ts --repo remix-run/react-router --limit 5
```

## Failure Handling

Use `octogrep`'s structured error output to decide the next step. Skip extra preflight checks unless setup itself is the task.

- Read `code`, `message`, and `retryable` from the CLI output first.
- Treat `cta` as a hint, not a guaranteed replay command.
- For zero results, relax the narrowest filter first and explain the single dimension you changed between attempts.
- If setup is the task, or the command is missing, use `octogrep --version` to verify availability.

## Typical Requests

- Find upstream implementations of a root command.
- Collect React Router `useNavigate` examples.
- Find repositories that emit a specific error string.
- Search `http client` usage inside repositories owned by `cli`.
