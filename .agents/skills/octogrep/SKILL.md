---
name: octogrep
description: Stabilize GitHub code search workflows with octogrep. Use when investigating code on GitHub, looking up upstream implementations, gathering framework or API usage examples, sampling how a symbol is used across repositories, or when the user explicitly asks for octogrep.
---

# Octogrep

Use `octogrep` for GitHub code search workflows such as upstream example lookup, cross-repo comparison, GitHub-wide discovery, and confirming implementation details from the returned file URLs.

## Workflow

Use this workflow to keep searches small, explainable, and easy to refine.

### 1. Start with a small search

Begin with `octogrep search <query> --limit 5` to `--limit 20`.

- Keep the default TOON output for normal exploration
- Leave the page at its default unless you are intentionally continuing the same search
- Skip separate readiness checks in the normal path
- If setup is the task, or the search fails because `octogrep` is unavailable, use `octogrep --version` as a follow-up

### 2. Build the query carefully

Prefer literal phrases first, then add structure only when needed.

- Quote every multi-word search term
- Prefer CLI options for new qualifiers such as `--repo`, `--owner`, `--language`, `--path`, `--filename`, and `--extension`
- Use the detailed rules below when choosing between option style and raw qualifiers

### 3. Select candidate files

Use the result metadata to decide which files deserve a full read.

- Review `fragment`, `repository`, and `path` together
- Start with the strongest 1 to 3 candidates instead of trying to inspect every result
- Treat `fragment` as a hint, not as the final source of truth about the implementation

### 4. Fetch file contents when needed

Read full files when you need to confirm behavior, summarize an implementation, or compare approaches.

- Use `items[].htmlUrl` when you want the browser view of the matching file
- Use `items[].contentsUrl` with `octogrep fetch <contentsUrl>` when you want to fetch the file contents as text
- Pass the `https://...?...ref=...` `contentsUrl` returned by `octogrep search` without rewriting the host, path, or query
- Do not pass `htmlUrl` to `fetch`, and do not drop the `ref` query parameter
- If you need byte-exact raw output or lower-level control, use `gh api -H "Accept: application/vnd.github.raw+json" "$contentsUrl"` directly
- For light triage, `fragment` is often enough to delay this step

### 5. Refine one dimension at a time

Change one part of the query at a time so the effect is easy to explain.

- Narrow by repository or owner before adding filename or path constraints
- Add filename, path, or language filters one at a time

### 6. Change output format only when needed

Keep the output compact unless the task clearly needs structure for a follow-up step.

- Keep TOON output when reading results directly or passing them to another model step
- Use `--json` only when the same turn requires structured post-processing, counting, or deterministic extraction

Read [`references/query-patterns.md`](./references/query-patterns.md) when you need ready-made search shapes.

## Query Rules

Use `octogrep search <query> [options]`.

Keep free-text queries short and literal first. Add qualifiers only after the initial signal is weak.

Prefer option style for new commands. Preserve raw qualifier style only when the query already depends on it, and do not combine the two styles for the same qualifier family.

Preferred for new commands:

```sh
octogrep search "useNavigate" --language ts --repo remix-run/react-router --limit 5
```

Preserve raw qualifier style only when needed:

```sh
octogrep search '"panic" repo:cli/cli filename:root.go'
```

Avoid mixing the two styles for the same qualifier family:

```sh
# Avoid
octogrep search '"panic" repo:cli/cli' --repo cli/cli
```

## Failure Handling

Use `octogrep`'s public errors and observed results to decide the next step. Avoid extra preflight checks unless setup itself is the task.

- `octogrep` command is unavailable before the search starts: Tell the user how to install `octogrep`. Do not switch automatically to one-shot runners, but if they need a manual fallback, mention supported one-shot options such as `npx octogrep --version` or `pnpm dlx octogrep --version`.
- `GH_NOT_INSTALLED`: Tell the user that GitHub CLI (`gh`) is not installed or unavailable. Ask them to install `gh`, then rerun the same search.
- `GH_NOT_AUTHENTICATED`: Tell the user that GitHub CLI authentication is missing. Ask them to run `gh auth login`, then rerun the same search.
- `QUERY_CONFLICT`: Remove the duplicated qualifier source. Keep either the raw query qualifier or the matching CLI option, not both.
- `GH_SEARCH_FAILED`: Treat HTTP `408`, `429`, and `5xx` as temporary and retry only after a short pause or after reducing request scope. Treat `422` and similar validation failures as non-temporary and fix the query instead.
- `INVALID_CONTENTS_URL`: Use the `contentsUrl` returned by `octogrep search` as-is. Do not substitute `htmlUrl`, hand-build URLs, or remove the `ref` query parameter.
- `GH_FETCH_FAILED`: Try one alternate candidate before changing the search query. If the alternate candidate also fails, revisit the search scope or query terms.
- Zero results: Relax the narrowest filter first and explain which single dimension you changed between attempts. If the query is very specific, shorten the literal phrase before removing repo or owner scope.

## Common Tasks

- Find an upstream implementation pattern for a function, class, or CLI behavior.
- Collect a few representative examples of framework API usage.
- Search for error text or log lines across public repositories.
- Sample how a symbol is used in one owner or one repo before broadening to GitHub-wide search.
- Compare how multiple repositories structure the same concept.
