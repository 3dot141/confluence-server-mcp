---
name: confluence
description: Manage Confluence pages, publish markdown, search, and upload attachments via the confluence CLI tool. Use when user mentions Confluence, wiki, publishing docs, or wants to interact with Confluence pages.
---

# Confluence CLI Skill

## Setup
The CLI requires these environment variables (set in `.env` or shell):
- `CONF_BASE_URL` — Confluence base URL (e.g., `https://wiki.example.com`)
- `CONF_TOKEN` — Personal Access Token (or use `CONF_USERNAME` + `CONF_PASSWORD`)
- `CONF_SPACE` — Default space key (optional)

## Commands

### List spaces
```bash
confluence list-spaces [--type global|personal] [--json]
```

### Get a page
```bash
confluence get-page <pageId-or-title> [--space KEY] [--json]
```

### Create a page
```bash
confluence create-page "Page Title" --space KEY [--parent ID] [--file content.html]
```

### Update a page
```bash
confluence update-page <pageId-or-title> [--space KEY] [--title "New Title"] [--file content.html]
```

### Search pages
```bash
confluence search "query" [--space KEY] [--limit 25] [--json]
```

### Delete a page
```bash
confluence delete-page <pageId>
```

### Publish markdown (advanced)
Converts markdown to Confluence format, handles images and mermaid diagrams automatically:
```bash
confluence publish README.md --space KEY [--title "Custom Title"] [--parent ID] [--mermaid-theme default]
```

### Upload attachment
```bash
confluence upload ./diagram.png --page <pageId> [--filename custom-name.png]
```

## Common Workflows

**Publish current README to Confluence:**
```bash
confluence publish README.md --space DEV --title "Project Documentation"
```

**Search and get page content:**
```bash
confluence search "API docs" --space DEV --json
confluence get-page 12345 --json
```

## Tips
- Use `--json` flag when you need to parse output programmatically
- Use `--debug` for debug logging (off by default)
- The `publish` command auto-detects title from H1 heading if `--title` is omitted
- Mermaid diagrams in markdown are rendered to PNG and uploaded as attachments
