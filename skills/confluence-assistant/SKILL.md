---
name: confluence-assistant
description: "Complete Confluence (KMS) operations assistant using MCP tools. Use for: searching pages, creating/updating pages, publishing Markdown with images, managing attachments, comments, and permissions. Triggers: 'Confluence/KMS', 'publish to', 'upload to', 'create page', 'update page', 'search Confluence', 'Confluence attachment', 'page permission'"
---

# Confluence Assistant

All Confluence operations through MCP tools from `mcp-tools-layered`.

## Architecture Overview

```
Presentation Layer (MCP Tools)
    ↓
Application Layer (Use Cases)
    ↓
Domain Layer (Repository)
    ↓
Infrastructure Layer (HTTP Client)
```

**Layered Architecture Benefits:**
- Clear separation of concerns
- Independent testing of each layer
- Easy to extend with new tools

## Quick Decision

| User Says | Primary Tool |
|-----------|-------------|
| "Search/find pages" | `confluence_search_pages` |
| "Get page content" | `confluence_get_page` |
| "List spaces" | `confluence_list_spaces` |
| "Create page" | `confluence_create_page` or `confluence_upsert_page` |
| "Update/sync page" | `confluence_get_page` → `confluence_update_page` |
| **"Publish markdown"** | See [Publishing Workflow](references/publishing-workflow.md) |
| "Upload file" | `confluence_upload_attachment` |
| "Delete page" | `confluence_delete_page` |
| "Copy page" | `confluence_copy_page` |
| "Add comment" | `confluence_add_comment` |
| "Set permissions" | `confluence_set_page_restriction` |

## Publishing Intent Decision

**When user says "上传/同步/发布到 XX":**

### Step 1: Extract target information

#### 1.1 Extract Space and Target Page
解析用户请求获取 space 和 target title（用户指定的目标位置）

#### 1.2 Extract New Page Title (文件名规则)

**创建新页面时的标题提取优先级：**

| 优先级 | 来源 | 提取规则 | 示例 |
|--------|------|----------|------|
| 1 | Frontmatter | 使用 `title` 字段 | `title: "项目规划"` → "项目规划" |
| 2 | 文件名 | 提取 `yyyymmdd-xx` 部分 | `260303-fineReport-overview.md` → "260303" |
| 3 | H1 标题 | 使用文档第一个 H1 | `# 项目概述` → "项目概述" |
| 4 | 文件名 | 使用完整的文件名（不含扩展名） | `README.md` → "README" |

**文件名匹配规则：**
- 匹配模式：`^(\d{6,8})-(\d+|[a-zA-Z-]+).*\.md$`
- 提取 `yyyymmdd` 或 `yyyymmdd-xx` 作为标题
- 例如：`20240315-01.md` → "20240315-01"，`260302-smart-workshop.md` → "260302"

### Step 2: Check if target page exists

### Step 2: Check if target page exists
Use: `confluence_search_pages({ space, query: title })`

### Step 3: Ask user for clarification (MANDATORY)
**无论页面是否存在，都必须询问用户意图：**

| 情况 | 询问内容 |
|------|----------|
| **页面存在** | "页面 `标题` 已存在，请选择：<br>1. **更新现有页面** - 覆盖原内容<br>2. **创建子页面** - 作为该页面的子页面" |
| **页面不存在** | "页面 `标题` 不存在，请选择：<br>1. **创建到根目录** - 在 `Space` 空间根目录创建<br>2. **创建为子页面** - 需要先指定父页面" |

**REQUIREMENT: 必须等待用户明确选择后才能继续操作**

### Intent Examples

| User Request | Page Exists? | Action Required | Result |
|--------------|--------------|-----------------|--------|
| "上传到 Teams/项目规划" | Yes | **ASK USER** → 选择更新或创建子页面 | 根据用户选择 |
| "上传到 Teams/项目规划" | No | **ASK USER** → 选择根目录创建或指定父页面 | 根据用户选择 |
| "上传到 Teams/设计 目录下" | Yes | **ASK USER** → 选择更新或在该页面下创建子页面 | 根据用户选择 |
| "上传到 Teams/设计 目录下" | No | **ASK USER** → 父页面不存在，选择根目录创建或指定其他父页面 | 根据用户选择 |
| "同步到 https://.../TEST" | Yes | **ASK USER** → 通常更新，但需确认 | 根据用户选择 |

**CRITICAL RULES:**
1. **永远不要假设用户意图** - 即使看起来很明显
2. **页面存在 + 用户说"目录下"** → 仍然要问：是更新还是创建子页面
3. **等待用户明确回复** → 收到确认后再执行具体操作

## Available Tools

**Query:** `confluence_list_spaces`, `confluence_search_pages`, `confluence_get_page`, `confluence_get_child_pages`, `confluence_get_page_history`

**Pages:** `confluence_create_page`, `confluence_update_page`, `confluence_upsert_page`, `confluence_delete_page`, `confluence_copy_page`

**Attachments:** `confluence_upload_attachment`, `confluence_get_page_attachments`

**Comments:** `confluence_add_comment`, `confluence_get_page_comments`

**Permissions:** `confluence_set_page_restriction`

**Markdown:** `confluence_convert_markdown_to_storage`, `confluence_build_code_macro`

**注意**: 图片抽取需通过大模型手动分析 Markdown 内容完成，工具本身不提供自动图片抽取功能。

## CRITICAL Constraints

1. **MUST get page before update**: Always call `confluence_get_page` before `confluence_update_page`
2. **Markdown publishing order** (see [publishing-workflow.md](references/publishing-workflow.md)):
   - Manual extract images (LLM parse) → Create page → Upload images → Build mapping → Convert with mapping → Update
3. **Image mapping required**: Pass `imageMapping` to `confluence_convert_markdown_to_storage` so paths are replaced with attachment references
4. **Upload before convert**: Must upload images first to get actual attachment filenames (Confluence may rename duplicates)

See [references/mcp-tools-complete.md](references/mcp-tools-complete.md) for all tool parameters.

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

### Upload attachment (File Path)
```javascript
await confluence_upload_attachment({
  pageId: "12345",
  filePath: "/path/to/file.pdf"
});
```

### Upload attachment (Base64 Content)
```javascript
const fs = require('fs');
const buffer = fs.readFileSync("/path/to/file.pdf");
const base64 = buffer.toString('base64');

await confluence_upload_attachment({
  pageId: "12345",
  filename: "file.pdf",
  contentBase64: base64
});
```

### Publish Markdown with images

**完整流程（必须先询问用户）：**

```javascript
// === PHASE 1: 意图确认 (MANDATORY) ===
// 1. 搜索目标页面
const results = await confluence_search_pages({ space: "Teams", query: "项目规划" });
const exists = results.length > 0;

// 2. 询问用户意图
if (exists) {
  // 询问：更新还是创建子页面？
  const userChoice = await askUser("页面已存在，请选择：\n1. 更新现有页面\n2. 在该页面下创建子页面");
} else {
  // 询问：创建到根目录还是指定父页面？
  const userChoice = await askUser("页面不存在，请选择：\n1. 创建到空间根目录\n2. 作为其他页面的子页面");
}

// === PHASE 2: 根据选择执行 ===

// **选项 A: 更新现有页面**
if (userChoice === "update") {
  const page = await confluence_get_page({ space: "Teams", title: "项目规划" });
  const existing = await confluence_get_page_attachments({ pageId: page.id });
  const existingFiles = new Set(existing.map(a => a.title));
  
  // 提取并上传图片
  const imagePaths = extractImagePathsFromMarkdown(markdown);
  const imageMapping = {};
  for (const imgPath of imagePaths) {
    const absolutePath = resolvePath(imgPath, basePath);
    const filename = path.basename(absolutePath);
    if (existingFiles.has(filename)) {
      imageMapping[imgPath] = filename;
    } else {
      const result = await confluence_upload_attachment({ pageId: page.id, filePath: absolutePath });
      imageMapping[imgPath] = result.filename;
    }
  }
  
  // 更新页面
  const { storageFormat } = await confluence_convert_markdown_to_storage({ markdown, imageMapping });
  await confluence_update_page({ pageId: page.id, content: storageFormat });
}

// **选项 B: 创建子页面**
else if (userChoice === "create_child") {
  // 1. 找到父页面
  const parentResults = await confluence_search_pages({ space: "Teams", query: "项目规划" });
  const parentId = parentResults[0].id;

  // 2. 提取新页面标题（按优先级：frontmatter title > 文件名 yyyymmdd-xx > H1 > 文件名）
  const newTitle = extractTitleFromMarkdown(markdown, sourceFilePath);
  // 例如：文件 260303-fineReport-overview.md → 标题 "260303"

  // 3. 创建子页面
  const { id: pageId } = await confluence_create_page({
    space: "Teams",
    title: newTitle,
    parentId,
    content: "<p>Loading...</p>"
  });
  
  // 3. 提取并上传图片
  const imagePaths = extractImagePathsFromMarkdown(markdown);
  const imageMapping = {};
  for (const imgPath of imagePaths) {
    const absolutePath = resolvePath(imgPath, basePath);
    const result = await confluence_upload_attachment({ pageId, filePath: absolutePath });
    imageMapping[imgPath] = result.filename;
  }
  
  // 4. 更新页面内容
  const { storageFormat } = await confluence_convert_markdown_to_storage({ markdown, imageMapping });
  await confluence_update_page({ pageId, content: storageFormat });
}

// **选项 C: 创建到根目录**
else if (userChoice === "create_root") {
  // 1. 提取新页面标题（按优先级：frontmatter title > 文件名 yyyymmdd-xx > H1 > 文件名）
  const newTitle = extractTitleFromMarkdown(markdown, sourceFilePath);

  // 2. 在根目录创建页面
  const { id: pageId } = await confluence_create_page({
    space: "Teams",
    title: newTitle,
    content: "<p>Loading...</p>"
  });
  
  // 2. 提取并上传图片
  const imagePaths = extractImagePathsFromMarkdown(markdown);
  const imageMapping = {};
  for (const imgPath of imagePaths) {
    const absolutePath = resolvePath(imgPath, basePath);
    const result = await confluence_upload_attachment({ pageId, filePath: absolutePath });
    imageMapping[imgPath] = result.filename;
  }
  
  // 3. 更新页面内容
  const { storageFormat } = await confluence_convert_markdown_to_storage({ markdown, imageMapping });
  await confluence_update_page({ pageId, content: storageFormat });
}
```

## References

- [mcp-tools-complete.md](references/mcp-tools-complete.md) - All MCP tools with full parameters
- [publishing-workflow.md](references/publishing-workflow.md) - Core workflow (REQUIRED for image uploads)
- [publishing-examples.md](references/publishing-examples.md) - Detailed examples and edge cases
- [troubleshooting.md](references/troubleshooting.md) - Common issues and solutions
