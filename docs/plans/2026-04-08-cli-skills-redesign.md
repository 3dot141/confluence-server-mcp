# Confluence CLI + Skills Redesign

## Goal
Replace the MCP server with a standalone Node.js CLI tool (Commander.js) + Claude Code skills. The CLI works independently in the terminal; skills teach Claude how to use it intelligently.

## Architecture: Flat Module Structure

```
src/
  cli.ts                  # Entry point, Commander program
  config.ts               # Env var loading (CONF_BASE_URL, CONF_TOKEN, etc.)
  http-client.ts          # Axios wrapper for Confluence REST API
  confluence-api.ts       # All Confluence API calls (merged from repository)
  markdown/
    converter.ts          # Markdown → Confluence Storage Format
    mermaid.ts            # Mermaid diagram rendering
  commands/
    spaces.ts             # list-spaces
    pages.ts              # get, create, update, upsert, delete, search
    publish.ts            # publish (advanced markdown publishing)
    attachments.ts        # upload, list

.claude/skills/
  confluence.md           # Main skill: teaches Claude how to use the CLI
```

## CLI Commands (Core 8)

| Command | Description |
|---------|-------------|
| `confluence list-spaces` | List accessible Confluence spaces |
| `confluence get-page <id-or-title> [--space KEY]` | Get page content |
| `confluence create-page <title> [--space KEY] [--parent ID] [--file path]` | Create a new page |
| `confluence update-page <id-or-title> [--space KEY] [--title NEW] [--file path]` | Update existing page |
| `confluence search <query> [--space KEY] [--limit N]` | Search pages by CQL |
| `confluence delete-page <id>` | Delete a page |
| `confluence publish <markdown-file> [--space KEY] [--title T] [--parent ID]` | Publish markdown with images/mermaid |
| `confluence upload <file> --page <id>` | Upload attachment |

Global flags: `--json` for machine-readable output, `--verbose` for debug logging.

## Output Format
- Default: human-readable tables/text
- `--json`: structured JSON (for Claude and scripting)

## Skill Design
Single file `.claude/skills/confluence.md` containing:
- CLI installation and configuration instructions
- Command reference with examples
- Common workflows (e.g., "publish current README to Confluence")
- Error handling guidance

## Dependency Changes
- Remove: `@modelcontextprotocol/sdk`, `express`
- Add: `commander`
- Keep: `axios`, `unified`, `remark-*`, `puppeteer`, `@mermaid-js/mermaid-cli`, `dotenv`

## Package Identity
```json
{
  "name": "confluence-cli",
  "bin": { "confluence": "./dist/cli.js" }
}
```

## Migration Notes
- Existing `domain/` and `application/` logic is flattened into `confluence-api.ts` and `commands/`
- `presentation/mcp/` is entirely removed
- `infrastructure/` is flattened to top-level `config.ts` and `http-client.ts`
- Markdown processing stays in its own subdirectory due to complexity
