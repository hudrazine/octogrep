# octogrep

octogrep is a lightweight CLI for GitHub code search optimized for AI agents.
It uses `incur` for structured output and emits TOON format by default.

## Why this tool

- Token-efficient output for LLM workflows (TOON by default)
- Minimal, normalized search result shape for fast downstream processing
- No auth credential handling in octogrep itself

Internally, octogrep calls GitHub Search API through GitHub CLI (`gh`).

## Requirements

- Node.js
- GitHub CLI (`gh`) installed
- GitHub CLI authenticated:

```sh
gh auth login
```

octogrep never stores GitHub tokens and relies on the authenticated `gh` session.

## Usage

```sh
octogrep search <query> [options]
```

Use quotes for multi-word queries (for example, `octogrep search "root command"`).
After installation, you can confirm the CLI is available with `octogrep --version`.

Examples:

```sh
octogrep search "root command"
octogrep search "http client" --repo cli/cli --language go --limit 5
octogrep search "panic" --owner cli --filename root.go
```

### Migration note

Legacy root-query style (`octogrep <query>`) is no longer supported.
Use `octogrep search <query>` explicitly.

### `search` options

- `--repo <owner/repo>` (repeatable)
- `--owner <owner>` (repeatable)
- `--language <language>` (repeatable)
- `--path <path>`
- `--filename <filename>`
- `--extension <extension>`
- `--limit <1..100>` (default: `20`)
- `--page <>=1` (default: `1`)

### Query conflict rule

If raw query already includes a qualifier (for example `repo:`) and the corresponding option is also provided (for example `--repo`), octogrep returns `QUERY_CONFLICT`.

Use either:

- raw qualifier style: `octogrep search 'term repo:owner/name'`
- option style: `octogrep search term --repo owner/name`

## Output

Default output is TOON (`incur` standard behavior).
You can also use `--format json|yaml|md` or `--json`.

Returned fields are intentionally minimal:

- `query`
- `compiledQuery`
- `meta.totalCount`
- `meta.incompleteResults`
- `meta.page`
- `meta.limit`
- `meta.returnedCount`
- `items[]` with:
  - `repository`
  - `path`
  - `sha`
  - `url`
  - `fragment` (nullable)

When no results are found, octogrep returns an empty list and exits with code `0`.

## Development

```sh
pnpm build
pnpm typecheck
pnpm test
```

Run real GitHub integration smoke test:

```sh
OCTOGREP_E2E=1 pnpm test
```
