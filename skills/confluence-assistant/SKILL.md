---
name: confluence-assistant
description: "Complete Confluence (KMS) operations assistant using MCP tools. Use for: searching pages, creating/updating pages, publishing Markdown with images and Mermaid diagrams, managing attachments, comments, and permissions. Triggers: 'Confluence/KMS', 'publish to', 'upload to', 'create page', 'update page', 'search Confluence', 'Confluence attachment', 'page permission'"
---

# Confluence Assistant

All Confluence operations through MCP tools from `mcp-tools-layered`.

## Quick Decision

| User Says | Primary Tool |
|-----------|-------------|
| "Search/find pages" | `confluence_search_pages` |
| "Get page content" | `confluence_get_page` |
| "List spaces" | `confluence_list_spaces` |
| "Create page" | `confluence_create_page` or `confluence_upsert_page` |
| "Update/sync page" | `confluence_update_page` or `confluence_upsert_page` |
| **"Publish markdown"** | See [Publishing Workflow](#publishing-markdown-workflow) |
| "Upload file" | `confluence_upload_attachment` |
| "Delete page" | `confluence_delete_page` |
| "Add comment" | `confluence_add_comment` |
| "Set permissions" | `confluence_set_page_restriction` |

## Available Tools

**Query:** `confluence_list_spaces`, `confluence_search_pages`, `confluence_get_page`, `confluence_get_child_pages`, `confluence_get_page_history`

**Pages:** `confluence_create_page`, `confluence_update_page`, `confluence_upsert_page`, `confluence_delete_page`

**Publishing:** `confluence_publish_complete` (auto extracts images, renders Mermaid, converts Markdown)

**Attachments:** `confluence_upload_attachment`, `confluence_get_page_attachments`

**Comments:** `confluence_add_comment`, `confluence_get_page_comments`

**Permissions:** `confluence_set_page_restriction`

## CRITICAL Constraints

1. **MUST get page before update**: Always call `confluence_get_page` before `confluence_update_page`
2. **For Markdown publishing**: Follow the [Publishing Workflow](#publishing-markdown-workflow) - MUST ask user for intent confirmation

---

## Publishing Markdown Workflow

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

```javascript
const results = await confluence_search_pages({ space, query: title });
const exists = results.length > 0;
const pageId = exists ? results[0].id : null;
```

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
```javascript
// User chose to update existing page
await confluence_publish_complete({
  pageId: "12345",           // Existing page ID
  space: "Teams",
  title: "项目规划",
  markdown: content,
  basePath: "/path/to/file"  // For resolving relative image paths
});
```

#### Option B: Create Child Page
```javascript
// User chose to create as child
// 1. Find parent page
const parentResults = await confluence_search_pages({ space, query: parentTitle });
const parentId = parentResults[0].id;

// 2. Publish with parentId
await confluence_publish_complete({
  space: "Teams",
  title: "子页面标题",       // Extracted from markdown
  markdown: content,
  basePath: "/path/to/file",
  parentId: parentId         // Creates as child page
});
```

#### Option C: Create at Space Root
```javascript
// User chose to create at root
await confluence_publish_complete({
  space: "Teams",
  title: "新页面标题",
  markdown: content,
  basePath: "/path/to/file"
  // No parentId = creates at root
});
```

### Intent Examples

| User Request | Page Exists? | Action Required |
|--------------|--------------|-----------------|
| "上传到 Teams/项目规划" | Yes | **ASK USER** → 选择更新或创建子页面 |
| "上传到 Teams/项目规划" | No | **ASK USER** → 选择根目录创建或指定父页面 |
| "上传到 Teams/设计 目录下" | Yes | **ASK USER** → 选择更新或在该页面下创建子页面 |
| "上传到 Teams/设计 目录下" | No | **ASK USER** → 父页面不存在，选择根目录创建或指定其他父页面 |

### What `confluence_publish_complete` Handles

- Extracts local images from Markdown (`![alt](./path/to/image.png)`)
- Renders Mermaid diagrams to images and uploads
- Converts Markdown to Confluence Storage Format
- Creates new page OR updates existing (auto-detected by title)
- Supports: tables, task lists, code blocks, blockquotes → macros

---

## Common Examples

### Search and get page
```javascript
const { results } = await confluence_search_pages({ query: "roadmap", limit: 5 });
const page = await confluence_get_page({ pageId: results[0].id });
```

### Create page
```javascript
await confluence_create_page({
  space: "DEV",
  title: "Meeting Notes",
  content: "<h1>Meeting Notes</h1><p></p>"
});
```

### Update page (MUST get first!)
```javascript
await confluence_get_page({ pageId: "12345" });  // Get version
await confluence_update_page({
  pageId: "12345",
  content: "<h1>Updated</h1>..."
});
```

### Upload attachment
```javascript
await confluence_upload_attachment({
  pageId: "12345",
  filePath: "/path/to/file.pdf"
});
```

## References

- [troubleshooting.md](references/troubleshooting.md) - Common issues and solutions
