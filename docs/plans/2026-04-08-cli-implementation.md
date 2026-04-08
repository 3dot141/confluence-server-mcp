# Confluence CLI + Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the MCP server with a standalone Node.js CLI (Commander.js) + Claude Code skill, flattening the architecture.

**Architecture:** Flat module structure — `src/config.ts`, `src/http-client.ts`, `src/confluence-api.ts` for core logic; `src/commands/*.ts` for CLI commands; `src/markdown/` for conversion. Single entry point `src/cli.ts`. One skill file `.claude/skills/confluence.md`.

**Tech Stack:** Node.js, TypeScript, Commander.js, Axios, unified/remark, puppeteer/@mermaid-js/mermaid-cli, Vitest

---

### Task 1: Update package.json and install Commander.js

**Files:**
- Modify: `package.json`

**Step 1: Update package.json**

Remove MCP/express deps, add commander, rename package:

```json
{
  "name": "confluence-cli",
  "version": "3.0.0",
  "description": "Confluence CLI tool with Claude Code skill integration",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/cli.js",
    "dev": "npm run build && node dist/cli.js",
    "test": "vitest"
  },
  "bin": {
    "confluence": "./dist/cli.js"
  },
  "files": ["dist"],
  "dependencies": {
    "@mermaid-js/mermaid-cli": "^11.12.0",
    "axios": "^1.6.0",
    "commander": "^13.0.0",
    "dotenv": "^16.4.0",
    "form-data": "^4.0.5",
    "puppeteer": "^23.11.1",
    "remark-frontmatter": "^5.0.0",
    "remark-gfm": "^4.0.1",
    "remark-parse": "^11.0.0",
    "remark-stringify": "^11.0.0",
    "unified": "^11.0.5",
    "unist-util-visit": "^5.1.0"
  },
  "devDependencies": {
    "@types/mdast": "^4.0.4",
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2",
    "vitest": "^4.0.18"
  }
}
```

**Step 2: Install dependencies**

Run: `npm install`
Expected: Clean install, no errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: replace MCP deps with commander, rename to confluence-cli"
```

---

### Task 2: Create flattened config module

**Files:**
- Create: `src/config.ts`
- Test: `src/config.test.ts`

**Step 1: Write the failing test**

```typescript
// src/config.test.ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('loads config from env vars with token auth', async () => {
    process.env.CONF_BASE_URL = 'https://wiki.example.com';
    process.env.CONF_TOKEN = 'my-token';
    process.env.CONF_SPACE = 'DEV';

    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();

    expect(cfg.baseUrl).toBe('https://wiki.example.com');
    expect(cfg.token).toBe('my-token');
    expect(cfg.defaultSpace).toBe('DEV');
  });

  test('loads config with basic auth', async () => {
    process.env.CONF_BASE_URL = 'https://wiki.example.com';
    process.env.CONF_USERNAME = 'user';
    process.env.CONF_PASSWORD = 'pass';

    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();

    expect(cfg.username).toBe('user');
    expect(cfg.password).toBe('pass');
  });

  test('throws if CONF_BASE_URL missing', async () => {
    delete process.env.CONF_BASE_URL;
    delete process.env.CONF_TOKEN;
    delete process.env.CONF_USERNAME;
    delete process.env.CONF_PASSWORD;

    const { loadConfig } = await import('./config.js');
    expect(() => loadConfig()).toThrow('CONF_BASE_URL');
  });

  test('throws if no auth provided', async () => {
    process.env.CONF_BASE_URL = 'https://wiki.example.com';
    delete process.env.CONF_TOKEN;
    delete process.env.CONF_USERNAME;
    delete process.env.CONF_PASSWORD;

    const { loadConfig } = await import('./config.js');
    expect(() => loadConfig()).toThrow('authentication');
  });

  test('getAuthHeader returns Bearer for token auth', async () => {
    process.env.CONF_BASE_URL = 'https://wiki.example.com';
    process.env.CONF_TOKEN = 'my-token';

    const { loadConfig, getAuthHeader } = await import('./config.js');
    loadConfig();
    expect(getAuthHeader()).toBe('Bearer my-token');
  });

  test('getAuthHeader returns Basic for user/pass auth', async () => {
    process.env.CONF_BASE_URL = 'https://wiki.example.com';
    process.env.CONF_USERNAME = 'user';
    process.env.CONF_PASSWORD = 'pass';

    const { loadConfig, getAuthHeader } = await import('./config.js');
    loadConfig();
    const expected = `Basic ${Buffer.from('user:pass').toString('base64')}`;
    expect(getAuthHeader()).toBe(expected);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/config.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/config.ts
import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  baseUrl: string;
  username: string;
  password: string;
  token?: string;
  defaultSpace?: string;
  mermaidInkUrl: string;
}

let _config: Config | null = null;

export function loadConfig(): Config {
  const { CONF_BASE_URL, CONF_USERNAME, CONF_PASSWORD, CONF_TOKEN, CONF_SPACE, MERMAID_INK_URL } = process.env;

  if (!CONF_BASE_URL) {
    throw new Error('Missing required environment variable: CONF_BASE_URL');
  }

  if (!CONF_TOKEN && (!CONF_USERNAME || !CONF_PASSWORD)) {
    throw new Error('Missing authentication: Provide CONF_TOKEN or both CONF_USERNAME and CONF_PASSWORD');
  }

  _config = {
    baseUrl: CONF_BASE_URL,
    username: CONF_USERNAME || '',
    password: CONF_PASSWORD || '',
    token: CONF_TOKEN,
    defaultSpace: CONF_SPACE,
    mermaidInkUrl: MERMAID_INK_URL || 'https://mermaid.ink',
  };

  return _config;
}

export function getConfig(): Config {
  if (!_config) _config = loadConfig();
  return _config;
}

export function isPatAuth(): boolean {
  return Boolean(getConfig().token);
}

export function getAuthHeader(): string {
  const cfg = getConfig();
  if (cfg.token) return `Bearer ${cfg.token}`;
  return `Basic ${Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/config.test.ts`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/config.ts src/config.test.ts
git commit -m "feat: add flattened config module with tests"
```

---

### Task 3: Create flattened http-client module

**Files:**
- Create: `src/http-client.ts`

**Step 1: Write implementation**

```typescript
// src/http-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getConfig, isPatAuth } from './config.js';

export function createHttpClient(): AxiosInstance {
  const cfg = getConfig();
  const authConfig: AxiosRequestConfig = cfg.token
    ? { headers: { Authorization: `Bearer ${cfg.token}` } }
    : { auth: { username: cfg.username, password: cfg.password } };

  return axios.create({
    baseURL: `${cfg.baseUrl}/rest/api`,
    ...authConfig,
    headers: { 'Content-Type': 'application/json', ...authConfig.headers },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

export function createExperimentalHttpClient(): AxiosInstance {
  const cfg = getConfig();
  const authConfig: AxiosRequestConfig = cfg.token
    ? { headers: { Authorization: `Bearer ${cfg.token}` } }
    : { auth: { username: cfg.username, password: cfg.password } };

  return axios.create({
    baseURL: `${cfg.baseUrl}/rest/experimental`,
    ...authConfig,
    headers: { 'Content-Type': 'application/json', ...authConfig.headers },
  });
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit src/http-client.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add src/http-client.ts
git commit -m "feat: add flattened http-client module"
```

---

### Task 4: Create flattened confluence-api module

**Files:**
- Create: `src/confluence-api.ts`

This merges the old `ConfluenceRepository` class and `ConfluenceMapper` into a single API module. Keep the same method signatures but import from new flat config/http-client.

**Step 1: Write implementation**

Copy the full `ConfluenceRepository` class from `src/domain/confluence/repository.ts` but change imports:
- `import { createHttpClient, createExperimentalHttpClient } from './http-client.js';`
- `import { getConfig, getAuthHeader } from './config.js';`
- Keep all types inline or import from a new `src/types.ts`

Also copy the types from `src/domain/confluence/types.ts` into a new `src/types.ts`.

**Step 2: Create `src/types.ts`**

Copy all interfaces from `src/domain/confluence/types.ts` verbatim.

**Step 3: Create `src/confluence-api.ts`**

Same as old `repository.ts` but with updated imports from `./config.js` and `./http-client.js` and `./types.js`. Export singleton `confluenceApi`.

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors (may have errors from old src — that's ok, we'll clean up later)

**Step 5: Commit**

```bash
git add src/types.ts src/confluence-api.ts
git commit -m "feat: add flattened confluence-api and types modules"
```

---

### Task 5: Copy markdown processing modules

**Files:**
- Create: `src/markdown/converter.ts` (copy from `src/domain/markdown/ast-converter.ts`)
- Create: `src/markdown/macros.ts` (copy from `src/domain/markdown/macros.ts`)
- Create: `src/markdown/parser.ts` (copy from `src/infrastructure/markdown/remark-parser.ts`)
- Create: `src/markdown/mermaid.ts` (copy from `src/domain/mermaid/renderer.ts`)
- Create: `src/markdown/extractor.ts` (copy from `src/domain/markdown/extractor.ts`)
- Create: `src/markdown/index.ts`

**Step 1: Copy files and update imports**

Each file needs import paths updated to reference sibling files (`./macros.js`, `./parser.js`, etc.) instead of the old deep paths.

`src/markdown/index.ts`:
```typescript
export { ASTMarkdownToConfluenceConverter } from './converter.js';
export { RemarkMarkdownParser } from './parser.js';
export { MermaidRenderer } from './mermaid.js';
```

**Step 2: Copy existing tests**

Copy test files alongside, updating imports:
- `src/markdown/converter.test.ts`
- `src/markdown/macros.spec.ts`
- `src/markdown/parser.test.ts`

**Step 3: Run tests**

Run: `npx vitest run src/markdown/`
Expected: All existing tests pass

**Step 4: Commit**

```bash
git add src/markdown/
git commit -m "feat: copy markdown processing modules to flat structure"
```

---

### Task 6: Create output formatter utility

**Files:**
- Create: `src/output.ts`
- Test: `src/output.test.ts`

**Step 1: Write the failing test**

```typescript
// src/output.test.ts
import { describe, test, expect } from 'vitest';
import { formatOutput, formatTable } from './output.js';

describe('formatOutput', () => {
  test('outputs JSON when json flag is true', () => {
    const data = { id: '123', title: 'Test' };
    const result = formatOutput(data, true);
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  test('outputs string as-is when json flag is false', () => {
    const result = formatOutput('hello', false);
    expect(result).toBe('hello');
  });
});

describe('formatTable', () => {
  test('formats array of objects as aligned table', () => {
    const data = [
      { key: 'DEV', name: 'Development' },
      { key: 'PROD', name: 'Production' },
    ];
    const result = formatTable(data, ['key', 'name']);
    expect(result).toContain('KEY');
    expect(result).toContain('DEV');
    expect(result).toContain('Development');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/output.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/output.ts
export function formatOutput(data: unknown, json: boolean): string {
  if (json) return JSON.stringify(data, null, 2);
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

export function formatTable(rows: Record<string, unknown>[], columns: string[]): string {
  if (rows.length === 0) return '(no results)';

  const headers = columns.map(c => c.toUpperCase());
  const widths = columns.map((col, i) =>
    Math.max(headers[i].length, ...rows.map(r => String(r[col] ?? '').length))
  );

  const header = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  const separator = widths.map(w => '-'.repeat(w)).join('  ');
  const body = rows.map(row =>
    columns.map((col, i) => String(row[col] ?? '').padEnd(widths[i])).join('  ')
  ).join('\n');

  return `${header}\n${separator}\n${body}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/output.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/output.ts src/output.test.ts
git commit -m "feat: add output formatter for CLI (table + JSON)"
```

---

### Task 7: Create CLI entry point and list-spaces command

**Files:**
- Create: `src/cli.ts`
- Create: `src/commands/spaces.ts`

**Step 1: Write `src/commands/spaces.ts`**

```typescript
// src/commands/spaces.ts
import { Command } from 'commander';
import { ConfluenceApi } from '../confluence-api.js';
import { formatOutput, formatTable } from '../output.js';

export function registerSpacesCommand(program: Command): void {
  program
    .command('list-spaces')
    .description('List accessible Confluence spaces')
    .option('--type <type>', 'Space type: global or personal', 'global')
    .action(async (opts) => {
      const api = new ConfluenceApi();
      const spaces = await api.listSpaces(opts.type);
      const json = program.opts().json;

      if (json) {
        console.log(formatOutput(spaces, true));
      } else {
        console.log(formatTable(
          spaces.map(s => ({ key: s.key, name: s.name, type: s.type })),
          ['key', 'name', 'type']
        ));
      }
    });
}
```

**Step 2: Write `src/cli.ts`**

```typescript
#!/usr/bin/env node
// src/cli.ts
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { registerSpacesCommand } from './commands/spaces.js';

const program = new Command();

program
  .name('confluence')
  .description('Confluence CLI — manage pages, publish markdown, search')
  .version('3.0.0')
  .option('--json', 'Output as JSON', false)
  .option('--verbose', 'Enable verbose logging', false)
  .hook('preAction', () => {
    loadConfig();
    if (program.opts().verbose) {
      process.env.DEBUG = '1';
    }
  });

registerSpacesCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
```

**Step 3: Build and verify help output**

Run: `npm run build && node dist/cli.js --help`
Expected: Shows help with `list-spaces` command

**Step 4: Commit**

```bash
git add src/cli.ts src/commands/spaces.ts
git commit -m "feat: add CLI entry point with list-spaces command"
```

---

### Task 8: Add page commands (get, create, update, search, delete)

**Files:**
- Create: `src/commands/pages.ts`
- Modify: `src/cli.ts` (register pages commands)

**Step 1: Write `src/commands/pages.ts`**

```typescript
// src/commands/pages.ts
import { Command } from 'commander';
import fs from 'node:fs';
import { ConfluenceApi } from '../confluence-api.js';
import { getConfig } from '../config.js';
import { formatOutput, formatTable } from '../output.js';

export function registerPageCommands(program: Command): void {
  const json = () => program.opts().json;
  const api = new ConfluenceApi();
  const space = () => getConfig().defaultSpace;

  program
    .command('get-page <idOrTitle>')
    .description('Get a page by ID or title')
    .option('-s, --space <key>', 'Space key')
    .action(async (idOrTitle, opts) => {
      const spaceKey = opts.space || space();
      const isId = /^\d+$/.test(idOrTitle);
      const page = isId
        ? await api.getPageById(idOrTitle)
        : await api.getPageByTitle(spaceKey!, idOrTitle);

      if (!page) {
        console.error(`Page not found: ${idOrTitle}`);
        process.exit(1);
      }

      if (json()) {
        console.log(formatOutput(page, true));
      } else {
        console.log(`ID:      ${page.id}`);
        console.log(`Title:   ${page.title}`);
        console.log(`Space:   ${page.space.key}`);
        console.log(`Version: ${page.version.number}`);
        console.log(`URL:     ${getConfig().baseUrl}${page._links.webui}`);
      }
    });

  program
    .command('create-page <title>')
    .description('Create a new page')
    .option('-s, --space <key>', 'Space key')
    .option('--parent <id>', 'Parent page ID')
    .option('-f, --file <path>', 'HTML content file')
    .option('-c, --content <html>', 'Inline HTML content')
    .action(async (title, opts) => {
      const spaceKey = opts.space || space();
      if (!spaceKey) { console.error('Space required (--space or CONF_SPACE)'); process.exit(1); }
      const content = opts.file ? fs.readFileSync(opts.file, 'utf-8') : (opts.content || '');
      const page = await api.createPage({ space: spaceKey, title, content, parentId: opts.parent });

      if (json()) {
        console.log(formatOutput(page, true));
      } else {
        console.log(`Created: ${page.title} (ID: ${page.id})`);
        console.log(`URL:     ${getConfig().baseUrl}${page._links.webui}`);
      }
    });

  program
    .command('update-page <idOrTitle>')
    .description('Update an existing page')
    .option('-s, --space <key>', 'Space key')
    .option('--title <newTitle>', 'New title')
    .option('-f, --file <path>', 'HTML content file')
    .option('-c, --content <html>', 'Inline HTML content')
    .action(async (idOrTitle, opts) => {
      const spaceKey = opts.space || space();
      const isId = /^\d+$/.test(idOrTitle);
      const existing = isId
        ? await api.getPageById(idOrTitle)
        : await api.getPageByTitle(spaceKey!, idOrTitle);

      if (!existing) { console.error(`Page not found: ${idOrTitle}`); process.exit(1); }

      const content = opts.file ? fs.readFileSync(opts.file, 'utf-8') : (opts.content || existing.body?.storage?.value || '');
      const page = await api.updatePage({
        pageId: existing.id,
        title: opts.title || existing.title,
        content,
        version: existing.version.number + 1,
      });

      if (json()) {
        console.log(formatOutput(page, true));
      } else {
        console.log(`Updated: ${page.title} (v${page.version.number})`);
      }
    });

  program
    .command('search <query>')
    .description('Search pages by title')
    .option('-s, --space <key>', 'Space key')
    .option('-l, --limit <n>', 'Max results', '25')
    .action(async (query, opts) => {
      const results = await api.searchPages(query, opts.space, parseInt(opts.limit));

      if (json()) {
        console.log(formatOutput(results, true));
      } else {
        console.log(formatTable(
          results.map(r => ({ id: r.id, title: r.title, space: r.space.key })),
          ['id', 'title', 'space']
        ));
      }
    });

  program
    .command('delete-page <id>')
    .description('Delete a page by ID')
    .action(async (id) => {
      await api.deletePage(id);
      if (json()) {
        console.log(formatOutput({ success: true, message: 'Deleted' }, true));
      } else {
        console.log(`Deleted page ${id}`);
      }
    });
}
```

**Step 2: Register in `src/cli.ts`**

Add import and call `registerPageCommands(program)` after `registerSpacesCommand`.

**Step 3: Build and verify**

Run: `npm run build && node dist/cli.js --help`
Expected: Shows all page commands

**Step 4: Commit**

```bash
git add src/commands/pages.ts src/cli.ts
git commit -m "feat: add page commands (get, create, update, search, delete)"
```

---

### Task 9: Add publish command

**Files:**
- Create: `src/commands/publish.ts`
- Modify: `src/cli.ts`

**Step 1: Write `src/commands/publish.ts`**

Port the `PublishCompleteUseCase` logic into a CLI command. Read markdown file from disk, use the existing converter/mermaid pipeline.

```typescript
// src/commands/publish.ts
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from '../config.js';
import { formatOutput } from '../output.js';
import { PublishCompleteUseCase } from '../publish.js';

export function registerPublishCommand(program: Command): void {
  program
    .command('publish <markdownFile>')
    .description('Publish a markdown file to Confluence (with images + mermaid)')
    .option('-s, --space <key>', 'Space key')
    .option('-t, --title <title>', 'Page title (default: filename or H1)')
    .option('--parent <id>', 'Parent page ID')
    .option('--page-id <id>', 'Existing page ID to update')
    .option('--mermaid-theme <theme>', 'Mermaid theme', 'default')
    .action(async (markdownFile, opts) => {
      const spaceKey = opts.space || getConfig().defaultSpace;
      if (!spaceKey) { console.error('Space required (--space or CONF_SPACE)'); process.exit(1); }

      const filePath = path.resolve(markdownFile);
      if (!fs.existsSync(filePath)) { console.error(`File not found: ${filePath}`); process.exit(1); }

      const markdown = fs.readFileSync(filePath, 'utf-8');
      const title = opts.title || path.basename(filePath, path.extname(filePath));
      const basePath = path.dirname(filePath);

      const useCase = new PublishCompleteUseCase();
      const result = await useCase.execute({
        space: spaceKey,
        title,
        markdown,
        pageId: opts.pageId,
        parentId: opts.parent,
        basePath,
        mermaidTheme: opts.mermaidTheme,
      });

      if (program.opts().json) {
        console.log(formatOutput(result, true));
      } else {
        console.log(`${result.operation === 'created' ? 'Created' : 'Updated'}: ${result.title}`);
        console.log(`Page ID: ${result.pageId}`);
        console.log(`Version: ${result.version}`);
        console.log(`Images:  ${result.imagesUploaded}`);
        console.log(`Mermaid: ${result.mermaidsRendered}`);
        if (result.errors.length > 0) {
          console.warn(`Warnings: ${result.errors.join(', ')}`);
        }
      }
    });
}
```

**Step 2: Create `src/publish.ts`**

Copy `PublishCompleteUseCase` from `src/application/usecases/publish-complete.ts`, update imports to use `./confluence-api.js`, `./markdown/parser.js`, `./markdown/converter.js`, `./markdown/mermaid.js`.

**Step 3: Register in `src/cli.ts`**

Add import and call `registerPublishCommand(program)`.

**Step 4: Build and verify**

Run: `npm run build && node dist/cli.js publish --help`
Expected: Shows publish command options

**Step 5: Commit**

```bash
git add src/commands/publish.ts src/publish.ts src/cli.ts
git commit -m "feat: add publish command for markdown-to-confluence"
```

---

### Task 10: Add upload attachment command

**Files:**
- Create: `src/commands/attachments.ts`
- Modify: `src/cli.ts`

**Step 1: Write `src/commands/attachments.ts`**

```typescript
// src/commands/attachments.ts
import { Command } from 'commander';
import { ConfluenceApi } from '../confluence-api.js';
import { formatOutput } from '../output.js';

export function registerAttachmentCommands(program: Command): void {
  program
    .command('upload <file>')
    .description('Upload a file as attachment to a page')
    .requiredOption('--page <id>', 'Page ID to attach to')
    .option('--filename <name>', 'Override filename')
    .option('--comment <text>', 'Attachment comment')
    .action(async (file, opts) => {
      const api = new ConfluenceApi();
      const attachment = await api.uploadAttachment(opts.page, file, opts.filename, opts.comment);

      if (program.opts().json) {
        console.log(formatOutput(attachment, true));
      } else {
        console.log(`Uploaded: ${attachment.title} (ID: ${attachment.id})`);
      }
    });
}
```

**Step 2: Register in `src/cli.ts`**

**Step 3: Build and verify**

Run: `npm run build && node dist/cli.js upload --help`

**Step 4: Commit**

```bash
git add src/commands/attachments.ts src/cli.ts
git commit -m "feat: add upload attachment command"
```

---

### Task 11: Remove old MCP code and clean up

**Files:**
- Delete: `src/presentation/` (entire directory)
- Delete: `src/domain/` (entire directory)
- Delete: `src/application/` (entire directory)
- Delete: `src/infrastructure/` (entire directory)
- Delete: `src/main.ts`

**Step 1: Remove old directories**

```bash
rm -rf src/presentation src/domain src/application src/infrastructure src/main.ts
```

**Step 2: Update tsconfig.json if needed**

Verify `tsconfig.json` still has `"rootDir": "src"` — should be fine.

**Step 3: Build**

Run: `npm run build`
Expected: Clean build with no errors

**Step 4: Run tests**

Run: `npm test -- --run`
Expected: All new tests pass, old tests are gone

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove old MCP server code, complete CLI migration"
```

---

### Task 12: Create Claude Code skill file

**Files:**
- Create: `.claude/skills/confluence.md`

**Step 1: Write the skill**

```markdown
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
- Use `--verbose` for debug logging
- The `publish` command auto-detects title from H1 heading if `--title` is omitted
- Mermaid diagrams in markdown are rendered to PNG and uploaded as attachments
```

**Step 2: Commit**

```bash
git add .claude/skills/confluence.md
git commit -m "feat: add Claude Code skill for confluence CLI"
```

---

### Task 13: Update CLAUDE.md and README

**Files:**
- Modify: `CLAUDE.md`
- Modify: `package.json` (version bump)

**Step 1: Update CLAUDE.md**

Update the project description, commands section, and bin name to reflect CLI instead of MCP.

**Step 2: Version bump**

Run: `npm version minor --no-git-tag-version`

**Step 3: Final build + test**

Run: `npm run build && npm test -- --run`
Expected: All pass

**Step 4: Commit**

```bash
git add -A
git commit -m "docs: update CLAUDE.md and bump version for CLI release"
```

---

### Task 14: End-to-end smoke test

**Step 1: Test help output**

Run: `node dist/cli.js --help`
Expected: Shows all 8 commands

**Step 2: Test list-spaces (requires real config)**

Run: `node dist/cli.js list-spaces --json`
Expected: JSON array of spaces

**Step 3: Test search**

Run: `node dist/cli.js search "test" --json`
Expected: JSON array of results

**Step 4: Test publish dry run**

Create a test markdown file and publish it:
```bash
echo "# Test Page\n\nHello from CLI" > /tmp/test-cli.md
node dist/cli.js publish /tmp/test-cli.md --space DEV --title "CLI Smoke Test"
```

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "test: verify CLI end-to-end smoke test"
```
