# Repository Guidelines

## Project Structure & Module Organization
Standalone Confluence CLI tool (`confluence`) with flat module structure:
- `src/config.ts`: environment config loading and auth helpers.
- `src/http-client.ts`: Axios instance factories for Confluence REST API.
- `src/confluence-api.ts`: all Confluence API operations (pages, spaces, attachments, comments, permissions).
- `src/publish.ts`: markdown-to-Confluence publish pipeline (images + mermaid).
- `src/commands/`: Commander.js command registrations (spaces, pages, publish, attachments).
- `src/markdown/`: AST converter, remark parser, macros, mermaid renderer, image extractor.
- `src/output.ts`: CLI output formatting (table + JSON).
- `src/logger.ts`: debug logger controlled by `--debug` flag.
- `src/cli.ts`: entry point.

Build output goes to `dist/`. Design/implementation notes are under `docs/plans/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run build`: compile TypeScript to `dist/` (NodeNext, strict mode).
- `npm run start`: run CLI from `dist/cli.js`.
- `npm run dev`: build then run CLI.
- `npm test`: run Vitest suite.
- `node dist/cli.js --help`: show all available commands.

## CLI Usage
```bash
confluence list-spaces [--type global|personal] [--json]
confluence get-page <idOrTitle> [--space KEY] [--json]
confluence create-page <title> --space KEY [--parent ID] [--file content.html]
confluence update-page <idOrTitle> [--space KEY] [--title "New"] [--file content.html]
confluence search <query> [--space KEY] [--limit 25] [--json]
confluence delete-page <id>
confluence publish <file.md> --space KEY [--title "Title"] [--parent ID]
confluence upload <file> --page <id> [--filename name]
```

Global flags: `--json`, `--debug`

## Coding Style & Naming Conventions
Use TypeScript ES modules (`"type": "module"`). Follow flat module structure:
- Commands: `src/commands/<feature>.ts`
- Tests: colocated `*.test.ts` or `*.spec.ts`

Match existing formatting in touched files (2-space indentation, semicolons). Keep functions small and explicit.

## Testing Guidelines
Framework: Vitest (`npm test`). Add/adjust tests for every behavior change, especially:
- Markdown/Mermaid conversion logic
- CLI command argument mapping and error paths
- Confluence API integration boundaries (mock external calls in unit tests)

Prefer deterministic unit tests and keep network-dependent checks in `dev/` scripts, not in CI test paths.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style: `feat:`, `fix:`, `refactor:`, `test:`, `build:` (scopes optional).

Mandatory rule: Before every commit, update the project version (for example in `package.json`), then commit, then push.
Example flow: `npm version patch --no-git-tag-version` -> `git add -A` -> `git commit -m "..."` -> `git push`.

For PRs:
- Explain user-visible behavior changes and impacted CLI commands.
- Link related issue/task.
- Include verification steps run locally (for example: `npm run build`, `npm test`).
- Include CLI input/output examples when changing command schemas or output format.

## Security & Configuration Tips
Never commit `.env` or credentials. Start from `env-example.txt`, and keep `CONF_PASSWORD` as an API token where applicable.
