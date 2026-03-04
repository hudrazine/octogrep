# octogrep

octogrep is a lightweight CLI tool designed to help AI agents efficiently search for code on GitHub.
It provides search results in a token-efficient TOON format, optimized for LLM code search workflows.

Internally, octogrep uses the GitHub CLI (`gh`) to call GitHub's code search API, filters the results to the necessary file metadata, and then outputs them in the TOON format.
This allows AI agents to quickly extract relevant information from large codebases while minimizing token usage.

Because octogrep leverages GitHub's code search functionality via the GitHub CLI, the GitHub CLI must be installed and properly authenticated.
octogrep does not hold any authentication credentials itself, so users need to run `gh auth login` to configure the GitHub CLI beforehand.
