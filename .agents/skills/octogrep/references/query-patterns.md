# Query Patterns

Use these patterns when you know the kind of code you want, but the first `octogrep search ...` command is still unclear.
Each pattern gives you a reliable starting point, then a single direction to refine.

## Implementation Lookup

When to use:
Find upstream implementations of a root command or another named behavior.

Command:

```sh
octogrep search "root command" --limit 5
```

How to refine:
If one repository becomes the clear target, add `--repo <owner/repo>` on the next attempt.

## Framework Usage Examples

When to use:
Collect framework API usage examples, such as React Router `useNavigate`.

Command:

```sh
octogrep search "useNavigate" --repo remix-run/react-router --language ts --limit 5
```

How to refine:
If the repo is too narrow, remove `--repo` before removing `--language`.

## Error String Search

When to use:
Find repositories that emit a specific error string or log line.

Command:

```sh
octogrep search "connection reset by peer" --limit 5
```

How to refine:
If the exact phrase is too specific, shorten the literal before adding any filters.

## File-Name Constrained Search

When to use:
Search for a symbol or message inside a known filename such as `root.go`.

Command:

```sh
octogrep search "panic" --filename root.go --limit 5
```

How to refine:
If the filename filter is useful but results are still broad, add `--repo`, `--org`, or `--user` next.

## Organization, User, or Repo Narrowing

When to use:
Search within one organization, user, or repository before broadening to GitHub-wide search.

Command:

```sh
octogrep search "http client" --org cli --limit 5
```

How to refine:
If one repository becomes the clear target, switch from `--org` or `--user` to `--repo owner/name`.
