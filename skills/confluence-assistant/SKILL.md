---
name: confluence-assistant
description: Complete Confluence operations assistant using direct TypeScript clients (confluence-client and markdown-to-confluence skills). Use for searching pages, creating/updating pages, publishing Markdown with images, managing attachments, comments, and permissions. Triggers - Confluence/KMS operations, publish to Confluence, upload to Confluence, create/update Confluence pages.
---

# Confluence Assistant

Complete Confluence operations using direct TypeScript clients. No MCP overhead - pure skill-to-skill communication for maximum performance.

## Architecture

```
User Request
    ↓
Confluence Assistant (this skill)
    ↓
┌─────────────────┐  ┌──────────────────────┐
│ confluence-client│  │ markdown-to-confluence│
│  - API calls     │  │  - Markdown conversion │
│  - Page management│ │  - Image processing    │
│  - Attachments   │  │  - Publishing workflow │
└─────────────────┘  └──────────────────────┘
```

**Benefits over MCP approach:**
- No tool call overhead
- Direct function calls
- Type-safe throughout
- Simpler error handling

## Prerequisites

**REQUIRED: Load these skills first:**
- `confluence-client` - For all Confluence API operations
- `markdown-to-confluence` - For Markdown publishing with images

## Quick Decision

| User Says | Primary Action |
|-----------|---------------|
| "Search/find pages" | `client.searchPages()` |
| "Get page content" | `client.getPageById()` or `client.getPageByTitle()` |
| "List spaces" | `client.listSpaces()` |
| "Create page" | `client.createPage()` or `client.upsertPage()` |
| "Update/sync page" | `client.getPageById()` → `client.updatePage()` |
| **"Publish markdown"** | See [Publishing Workflow](references/publishing-workflow.md) |
| "Upload file" | `client.uploadAttachment()` |
| "Delete page" | `client.deletePage()` |
| "Add comment" | `client.addComment()` |
| "Set permissions" | `client.setPageRestriction()` |

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

Use: `client.searchPages(query, space)`

### Step 3: Ask user for clarification (MANDATORY)
**无论页面是否存在，都必须询问用户意图：**

| 情况 | 询问内容 |
|------|----------|
| **页面存在** | "页面 `标题` 已存在，请选择：<br>1. **更新现有页面** - 覆盖原内容<br>2. **创建子页面** - 作为该页面的子页面" |
| **页面不存在** | "页面 `标题` 不存在，请选择：<br>1. **创建到根目录** - 在 `Space` 空间根目录创建<br>2. **创建为子页面** - 需要先指定父页面" |

**REQUIREMENT: 必须等待用户明确选择后才能继续操作**

## Core Usage

### Initialize Client

```typescript
import { ConfluenceClient } from '../confluence-client/scripts/confluence-client.js';

const client = new ConfluenceClient({
  baseUrl: 'https://company.atlassian.net/wiki',
  username: 'user@example.com',
  apiToken: 'your-api-token'
});
```

### Search and Get Page

```typescript
// Search pages
const results = await client.searchPages('roadmap', 'DEV', 10);

// Get by ID
const page = await client.getPageById('123456');

// Get by title
const page = await client.getPageByTitle('DEV', 'My Page');
```

### Create Page

```typescript
// Create at space root
const page = await client.createPage({
  space: 'DEV',
  title: 'New Page',
  content: '<h1>New Page</h1><p>Content</p>',
  parentId: '789012' // optional
});

// Or use upsert (create if not exists, update if exists)
const { page, created } = await client.upsertPage({
  space: 'DEV',
  title: 'My Page',
  content: '<h1>Content</h1>'
});
```

### Update Page

```typescript
// Must get page first to get version
const page = await client.getPageById('123456');

// Then update
const updated = await client.updatePage({
  pageId: '123456',
  title: 'Updated Title',
  content: '<h1>Updated</h1>',
  version: page.version.number + 1
});
```

### Upload Attachment

```typescript
// From file path
const attachment = await client.uploadAttachment(
  'page-id',
  '/path/to/file.pdf',
  'Optional comment'
);

// From buffer
const fs = await import('node:fs');
const buffer = fs.readFileSync('/path/to/file.pdf');
const attachment = await client.uploadAttachmentFromBuffer(
  'page-id',
  'file.pdf',
  buffer
);
```

## Publish Markdown (Complete Workflow)

**REQUIRED: Use `ConfluencePublisher` from markdown-to-confluence skill**

### Simple Publish

```typescript
import { ConfluencePublisher } from '../markdown-to-confluence/scripts/publisher.js';

const publisher = new ConfluencePublisher(client);

// Publish with auto title extraction
const result = await publisher.publish({
  markdown: '# Hello\n\nContent here',
  space: 'DEV',
  title: 'Optional Title',  // Or auto-extract from H1/front matter
  parentId: '123456'        // Optional
});

// Result:
// {
//   success: true,
//   pageId: '123456',
//   title: 'Hello',
//   url: 'https://...',
//   version: 1,
//   operation: 'created',
//   attachmentsUploaded: 2
// }
```

### Multi-page Publish

```typescript
const requests = [
  { markdown: '# Page 1', space: 'DEV', title: 'Page 1' },
  { markdown: '# Page 2', space: 'DEV', title: 'Page 2' }
];

const results = await publisher.publishMultiple(requests, { concurrency: 3 });
```

## Step-by-Step Manual Workflow

If you need fine-grained control over the publishing process:

```typescript
import { ConfluenceClient } from '../confluence-client/scripts/confluence-client.js';
import { MarkdownToConfluenceConverter } from '../markdown-to-confluence/scripts/converter.js';
import { extractImagesFromMarkdown } from '../markdown-to-confluence/scripts/extractor.js';

// 1. Setup client
const client = new ConfluenceClient(config);

// 2. Extract images
const images = extractImagesFromMarkdown(markdown, './docs');

// 3. Create page first (to get pageId for attachments)
let page = await client.createPage({
  space: 'DEV',
  title: 'My Document',
  content: '<p>Loading...</p>'
});

// 4. Upload images and build mapping
const imageMapping: Record<string, string> = {};
for (const image of images) {
  const attachment = await client.uploadAttachment(page.id, image.absolutePath);
  imageMapping[image.originalPath] = attachment.title;
}

// 5. Convert markdown with image mapping
const converter = new MarkdownToConfluenceConverter({
  addTocMacro: true,
  imageMapping
});
const content = converter.convert(markdown);

// 6. Update page with content
page = await client.updatePage({
  pageId: page.id,
  title: 'My Document',
  content,
  version: 2
});
```

## Complete Publishing Examples

### Example 1: Update Existing Page with Images

```typescript
import { ConfluenceClient } from '../confluence-client/scripts/confluence-client.js';
import { MarkdownToConfluenceConverter } from '../markdown-to-confluence/scripts/converter.js';
import { extractImagesFromMarkdown } from '../markdown-to-confluence/scripts/extractor.js';
import * as path from 'node:path';

const client = new ConfluenceClient(config);

// 1. Get existing page
const page = await client.getPageByTitle('DEV', 'My Page');

// 2. Get existing attachments
const existing = await client.getPageAttachments(page.id);
const existingFiles = new Set(existing.map(a => a.title));

// 3. Extract images from markdown
const images = extractImagesFromMarkdown(markdown, './docs');

// 4. Upload only new images
const imageMapping: Record<string, string> = {};
for (const image of images) {
  const filename = path.basename(image.absolutePath);
  if (existingFiles.has(filename)) {
    imageMapping[image.originalPath] = filename;
  } else {
    const attachment = await client.uploadAttachment(page.id, image.absolutePath);
    imageMapping[image.originalPath] = attachment.title;
  }
}

// 5. Convert and update
const converter = new MarkdownToConfluenceConverter({ imageMapping });
const content = converter.convert(markdown);

await client.updatePage({
  pageId: page.id,
  title: page.title,
  content,
  version: page.version.number + 1
});
```

### Example 2: Create Child Page

```typescript
// 1. Find parent page
const parentResults = await client.searchPages('项目规划', 'Teams', 1);
const parentId = parentResults[0].id;

// 2. Extract title from markdown
import { extractTitleFromMarkdown } from '../markdown-to-confluence/scripts/extractor.js';
const title = extractTitleFromMarkdown(markdown) || 'Untitled';

// 3. Create child page
const { id: pageId } = await client.createPage({
  space: 'Teams',
  title,
  parentId,
  content: '<p>Loading...</p>'
});

// 4. Upload images and finalize (see Example 1)
```

## Error Handling

```typescript
import { NotFoundError, ValidationError, AuthenticationError } from '../confluence-client/scripts/confluence-client.js';

try {
  await client.getPageById('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Page not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Check your credentials');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## References

- [publishing-workflow.md](references/publishing-workflow.md) - Core workflow (REQUIRED for image uploads)
- [publishing-examples.md](references/publishing-examples.md) - Detailed examples and edge cases
- [troubleshooting.md](references/troubleshooting.md) - Common issues and solutions
- `../confluence-client/SKILL.md` - Full API reference
- `../markdown-to-confluence/SKILL.md` - Markdown conversion reference
