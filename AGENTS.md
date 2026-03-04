# AGENTS.md

Guidance for AI coding agents working in this repository.

## Repository Overview

octogrep is a lightweight CLI tool designed to help AI agents efficiently search for code on GitHub. It provides search results in a token-efficient TOON format, optimized for LLM code search workflows.

## Dev Commands

- `pnpm build` - Compile TypeScript sources into `dist/`.
- `pnpm format` - Format code with Biome (`--write`).
- `pnpm lint` - Run Biome linter and apply auto-fixes (`--write`).
- `pnpm check` - Run Biome checks with auto-fixes (`--write`).
- `pnpm typecheck` - Run TypeScript type checking without emitting files.

## Branching & Commit Conventions

- Name branches as `<type>/<short-kebab>` (for example, `feat/add-user-authentication`) with `type` limited to `feat|fix|docs|chore|refactor|test`.
- Write commit messages in Conventional Commits style as `<type>(<scope>): <summary>` (`scope` optional), keep `type` in English, and use body/footer only for rationale, issue references, or breaking changes.
