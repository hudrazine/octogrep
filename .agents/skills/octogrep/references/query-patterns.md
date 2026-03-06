# Query Patterns

Use these patterns when turning a user request into a stable `octogrep search ...` command.

## Implementation Lookup

Prompt:
`Find upstream implementations of a root command`

Command shape:

```sh
octogrep search "root command" --limit 5
```

Add `--repo <owner/repo>` after the first pass when the target project is known.

## Framework Usage Examples

Prompt:
`Collect React Router useNavigate examples`

Command shape:

```sh
octogrep search "useNavigate" --repo remix-run/react-router --language ts --limit 5
```

Broaden by removing `--repo` before removing `--language`.

## Error String Search

Prompt:
`Find repositories that emit a specific error string`

Command shape:

```sh
octogrep search "connection reset by peer" --limit 10
```

If the phrase is too specific, shorten the literal before adding filters.

## File-Name Constrained Search

Prompt:
`Find panic handling in root.go`

Command shape:

```sh
octogrep search "panic" --filename root.go --limit 10
```

Add `--repo` or `--owner` only after confirming the filename filter is useful.

## Owner or Repo Narrowing

Prompt:
`Search http client usage inside cli-owned repositories`

Command shape:

```sh
octogrep search "http client" --owner cli --limit 10
```

When one repository becomes the clear target, switch to `--repo owner/name`.
