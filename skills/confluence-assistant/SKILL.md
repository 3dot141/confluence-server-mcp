---
name: confluence-assistant
description: "Complete Confluence (KMS) operations assistant using the confluence CLI. Use for: searching pages, creating/updating pages, publishing Markdown with images and Mermaid diagrams, managing attachments. Triggers: 'Confluence/KMS', 'publish to', 'upload to', 'create page', 'update page', 'search Confluence', 'Confluence attachment'"
---

# Confluence Assistant

All Confluence operations through the `confluence` CLI tool.

## Setup

Requires environment variables (set in `.env` or shell):

| Variable | Required | Description |
|----------|----------|-------------|
| `CONF_BASE_URL` | Yes | Confluence base URL (e.g., `https://wiki.example.com`) |
| `CONF_TOKEN` | Yes* | Personal Access Token |
| `CONF_USERNAME` | Yes* | Username (Basic Auth alternative) |
| `CONF_PASSWORD` | Yes* | API Token (Basic Auth alternative) |
| `CONF_SPACE` | No | Default space key |

\* Either `CONF_TOKEN` or `CONF_USERNAME` + `CONF_PASSWORD` is required.

---

## Level 1: Quick Decision

| User Says | Command |
|-----------|---------|
| "List spaces" | `confluence list-spaces` |
| "Search/find pages" | `confluence search "query"` |
| "Get page content" | `confluence get-page <id-or-title>` |
| "Create page" | `confluence create-page "Title"` |
| "Update page" | `confluence update-page <id-or-title>` |
| "Delete page" | `confluence delete-page <id>` |
| **"Publish markdown"** | See [Level 3: Publishing Workflow](#level-3-publishing-markdown-workflow) |
| "Upload file" | `confluence upload <file> --page <id>` |

---

## Level 2: Basic Commands

### Query

```bash
# List all spaces
confluence list-spaces [--type global|personal] [--json]

# Search pages
confluence search "query" [--space KEY] [--limit 25] [--json]

# Get page by ID or title
confluence get-page <idOrTitle> [--space KEY] [--json]
```

### Page CRUD

```bash
# Create
confluence create-page "Page Title" --space KEY [--parent ID] [--file content.html]

# Update (auto-fetches current version)
confluence update-page <idOrTitle> [--space KEY] [--title "New Title"] [--file content.html]

# Delete
confluence delete-page <pageId>
```

### Publish Markdown

```bash
# Converts markdown → Confluence format, handles images + mermaid automatically
confluence publish README.md --space KEY [--title "Custom Title"] [--parent ID]
```

### Upload Attachment

```bash
confluence upload ./diagram.png --page <pageId> [--filename custom-name.png]
```

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for programmatic parsing) |
| `--debug` | Enable debug logging (default off) |

---

## Level 3: Publishing Markdown Workflow

**When user says "上传/同步/发布到 XX":**

### Step 1: Extract Information

#### 1.1 Extract Space and Target Page
解析用户请求获取 space 和 target title（用户指定的目标位置）

#### 1.2 Extract Page Title (for new pages)

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Frontmatter `title` | `title: "项目规划"` → "项目规划" |
| 2 | Filename pattern | `260303-fineReport-overview.md` → "260303" |
| 3 | First H1 heading | `# 项目概述` → "项目概述" |
| 4 | Full filename | `README.md` → "README" |

**Filename pattern:** `^(\d{6,8})-(\d+|[a-zA-Z-]+).*\.md$`

### Step 2: Check Page Existence

```bash
confluence search "页面标题" --space KEY --json
```

Parse JSON output to determine if page exists and get its ID.

### Step 3: Ask User for Intent (MANDATORY)

**无论页面是否存在，都必须询问用户意图：**

| Situation | Ask User |
|-----------|----------|
| **Page EXISTS** | "页面 `标题` 已存在，请选择：<br>1. **更新现有页面** - 覆盖原内容<br>2. **创建子页面** - 作为该页面的子页面" |
| **Page NOT EXISTS** | "页面 `标题` 不存在，请选择：<br>1. **创建到根目录** - 在 `Space` 空间根目录创建<br>2. **创建为子页面** - 需要先指定父页面" |

**CRITICAL RULES:**
1. **永远不要假设用户意图** - 即使看起来很明显
2. **页面存在 + 用户说"目录下"** → 仍然要问：是更新还是创建子页面
3. **等待用户明确回复** → 收到确认后再执行具体操作

### Step 4: Execute Based on User Choice

#### Option A: Update Existing Page
```bash
confluence publish ./doc.md --space KEY --title "项目规划"
```
`publish` 会自动检测同名页面并更新。

#### Option B: Create Child Page
```bash
# 1. 先查找父页面 ID
confluence search "父页面标题" --space KEY --json
# 2. 用 --parent 指定父页面
confluence publish ./doc.md --space KEY --title "子页面标题" --parent <parentId>
```

#### Option C: Create at Space Root
```bash
# 不指定 --parent，默认创建到空间根目录
confluence publish ./doc.md --space KEY --title "新页面标题"
```

### Intent Examples

| User Request | Page Exists? | Action Required |
|--------------|--------------|-----------------|
| "上传到 Teams/项目规划" | Yes | **ASK USER** → 选择更新或创建子页面 |
| "上传到 Teams/项目规划" | No | **ASK USER** → 选择根目录创建或指定父页面 |
| "上传到 Teams/设计 目录下" | Yes | **ASK USER** → 选择更新或在该页面下创建子页面 |
| "上传到 Teams/设计 目录下" | No | **ASK USER** → 父页面不存在，选择根目录创建或指定其他父页面 |

### What `publish` Handles Automatically

- Extracts local images from Markdown (`![alt](./path/to/image.png)`)
- Renders Mermaid diagrams to PNG and uploads as attachments
- Converts Markdown to Confluence Storage Format
- Creates new page OR updates existing (auto-detected by title)
- Supports: tables, task lists, code blocks, blockquotes → Confluence macros

---

## Level 4: Common Workflows

### Search then view page
```bash
confluence search "roadmap" --space DEV --json
confluence get-page 12345 --json
```

### Create page from HTML file
```bash
confluence create-page "Meeting Notes" --space DEV --file notes.html
```

### Update page content
```bash
confluence update-page 12345 --file updated.html
# or by title
confluence update-page "Meeting Notes" --space DEV --file updated.html
```

### Publish with debug logging
```bash
confluence publish README.md --space DEV --title "Project Docs" --debug
```

## References

- [troubleshooting.md](references/troubleshooting.md) - Common issues and solutions
