[![NPM Version](https://img.shields.io/npm/v/octogrep)](https://www.npmjs.com/package/octogrep)
[![NPM License](https://img.shields.io/npm/l/octogrep)](https://www.npmjs.com/package/octogrep)
[![Publish](https://github.com/hudrazine/octogrep/actions/workflows/publish.yml/badge.svg)](https://github.com/hudrazine/octogrep/actions/workflows/publish.yml)

# octogrep

octogrep is a lightweight CLI for GitHub code search optimized for AI agents.
It uses `incur` for structured output and emits TOON format by default.

## Why this tool

- Token-efficient output for LLM workflows (TOON by default)
- Minimal, normalized search result shape for fast downstream processing
- No auth credential handling in octogrep itself

Internally, octogrep calls GitHub Search API through GitHub CLI (`gh`).

## What is TOON?

TOON (Token-Oriented Object Notation) is a compact, human-readable encoding of the JSON data model.
It is designed for LLM input as a drop-in, lossless representation of existing JSON while reducing token usage.
In octogrep, using TOON by default keeps search output compact and model-friendly.

Learn more: https://github.com/toon-format/toon

## Requirements

- Node.js
- GitHub CLI (`gh`) installed
- GitHub CLI authenticated:

```sh
gh auth login
```

octogrep never stores GitHub tokens and relies on the authenticated `gh` session.

## Installation

Global install:

```sh
npm install -g octogrep
pnpm add -g octogrep
bun add -g octogrep
```

One-shot execution:

```sh
npx octogrep --version
pnpm dlx octogrep --version
yarn dlx octogrep --version
bunx octogrep --version
```

You can confirm the CLI is available with `octogrep --version`.

### Install the octogrep skill

This is separate from installing the `octogrep` CLI itself. To install the AI agent skill, use [`vercel-labs/skills`](https://github.com/vercel-labs/skills) via `npx skills add`.

```sh
# Generic install
npx skills add hudrazine/octogrep --skill octogrep

# Install for Codex
npx skills add hudrazine/octogrep --skill octogrep -a codex

# Install for Claude Code
npx skills add hudrazine/octogrep --skill octogrep -a claude-code
```

## Usage

```sh
octogrep search <query> [options]
octogrep fetch <contentsUrl>
```

Use quotes for multi-word queries (for example, `octogrep search "root command"`).
After installation, you can confirm the CLI is available with `octogrep --version`.

Examples:

```sh
octogrep search "root command"
octogrep search "http client" --repo cli/cli --language go --limit 5
octogrep search "panic" --org cli --filename root.go
octogrep search "createServer" --user vercel --language ts
octogrep fetch "https://api.github.com/repositories/212613049/contents/pkg/cmd/root/root.go?ref=59ba50885feeed63a6f31de06ced5a06a5a3930d"
```

### `search` options

- `--repo <owner/repo>` (repeatable)
- `--org <org>` (repeatable)
- `--user <user>` (repeatable)
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

### `fetch`

Use `fetch` with a `contentsUrl` returned by `octogrep search`.

```sh
octogrep fetch "$contentsUrl"
```

`fetch` is intentionally strict:

- accepts only GitHub Contents API URLs on authenticated GitHub hosts
- requires the `https://...?...ref=...` URL returned by `octogrep search`
- rejects browser `htmlUrl` values
- prints file contents for AI and human reading workflows

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
  - `htmlUrl` (GitHub browser URL)
  - `contentsUrl` (GitHub Contents API URL for `gh api`)
  - `fragment` (nullable)

Use `htmlUrl` for browsing and `contentsUrl` for fetching file contents as text:

```sh
octogrep fetch "$contentsUrl"
```

If you need byte-exact raw output or stable hashes, use `gh api` directly:

```sh
gh api -H "Accept: application/vnd.github.raw+json" "$contentsUrl"
```

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

## Acknowledgements

This project is built with the following tools:

- [`incur`](https://github.com/wevm/incur): TypeScript CLI framework used for structured command and output handling.
- [`TOON`](https://github.com/toon-format/toon): Token-Oriented Object Notation used as the default output format.
- [`GitHub CLI (gh)`](https://github.com/cli/cli): Used to execute GitHub code search through authenticated `gh` sessions.
