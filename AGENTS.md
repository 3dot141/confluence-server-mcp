# Repository Guidelines

## Project Structure & Module Organization
Core source lives in `src/` with a layered architecture:
- `src/infrastructure/`: config, logging, HTTP client, parser adapters.
- `src/domain/`: Confluence API/domain logic, Markdown + Mermaid processing.
- `src/application/`: DTOs, mappers, and use cases.
- `src/presentation/`: MCP server, tool definitions/handlers, stdio transport.

Build output goes to `dist/`. Utility scripts are in `dev/` and `scripts/`. Design/implementation notes are under `docs/plans/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run build`: compile TypeScript to `dist/` (NodeNext, strict mode).
- `npm run start`: run compiled server from `dist/main.js`.
- `npm run mcp`: build then run MCP server (recommended local run path).
- `npm test`: run Vitest suite.
- `node dev/test-connection.js`: verify Confluence env/config connectivity.

## Coding Style & Naming Conventions
Use TypeScript ES modules (`"type": "module"`) and preserve the existing layered boundaries. Follow current file patterns:
- Use cases: `src/application/usecases/<feature>.ts`
- Tool handlers/definitions: `src/presentation/mcp/tools/`
- Tests: colocated `*.test.ts` or `__tests__/*.spec.ts`

Match existing formatting in touched files (2-space indentation, semicolon usage as present). Keep functions small and explicit; export via nearby `index.ts` where established.

## Testing Guidelines
Framework: Vitest (`npm test`). Add/adjust tests for every behavior change, especially:
- Markdown/Mermaid conversion logic
- MCP tool handler argument mapping and error paths
- Confluence repository integration boundaries (mock external calls in unit tests)

Prefer deterministic unit tests and keep network-dependent checks in `dev/` scripts, not in CI test paths.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style: `feat:`, `fix:`, `refactor:`, `test:`, `build:` (scopes optional, e.g. `refactor(skills): ...`).

Mandatory rule: Before every commit, update the project version (for example in `package.json`), then commit, then push.
Example flow: `npm version patch --no-git-tag-version` -> `git add -A` -> `git commit -m "..."` -> `git push`.

For PRs:
- Explain user-visible behavior changes and impacted MCP tools.
- Link related issue/task.
- Include verification steps run locally (for example: `npm run build`, `npm test`).
- Include request/response examples when changing tool schemas or output format.

## Security & Configuration Tips
Never commit `.env` or credentials. Start from `env-example.txt`, and keep `CONF_PASSWORD` as an API token where applicable. Validate MCP config paths with `mcp-config-example.json` using absolute `dist/main.js` paths.
