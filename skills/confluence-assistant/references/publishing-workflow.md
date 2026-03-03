# Markdown Publishing Workflow

Complete workflow for publishing Markdown with images to Confluence using direct TypeScript clients.

**Architecture:**
```
User Request
    ↓
ConfluencePublisher (markdown-to-confluence skill)
    ↓
ConfluenceClient (confluence-client skill)
    ↓
Confluence REST API
```

**Benefits over MCP approach:**
- Direct function calls (no tool overhead)
- Type-safe throughout
- Simpler error handling
- Better performance

## User Intent Decision Tree

**CRITICAL: First determine what user wants:**

```
User says "上传/同步到 XX":
  ↓
┌─────────────────────────────────────────────────────────────┐
│  Check if XX exists?                                        │
│  Use: client.searchPages() or client.getPageByTitle()       │
└─────────────────────────────────────────────────────────────┘
  ↓
  ├─ If EXISTS → "更新/同步页面" (Update existing page)
  │              ├─ Must call getPageById first (get version)
  │              ├─ Extract new images
  │              ├─ Upload missing images
  │              └─ Update with new content
  │
  └─ If NOT EXISTS → "创建新页面" (Create new page)
    ↓
    Check for "目录下/under" keyword?
    ├─ NO "目录下" → Create at space root
    │   Use: client.createPage({ space, title, content })
    │
    └─ YES "目录下 XX" → Create as child of XX
        Use: client.createPage({ space, title, content, parentId: XX.id })
```

### Intent Examples

| User Says | Interpretation | Action |
|-----------|---------------|--------|
| "上传到 Teams/测试页" | 更新 Teams 空间下的"测试页" | Search → Get → Update |
| "同步到 https://.../TEST" | 更新 TEST 页面 | Get by URL/title → Update |
| "上传到 Teams/项目 目录下" | 在"项目"页面下创建子页面 | Search parent → Create with parentId |
| "发布到 Teams/文档 下面" | 在"文档"页面下创建子页面 | Search parent → Create with parentId |
| "创建到 Teams 空间" | 在 Teams 空间根目录创建 | Create at root |

## The 5-Step Workflow (Create New Page)

**For NEW pages (create + upload):**

```typescript
import { ConfluenceClient } from '../../confluence-client/scripts/confluence-client.js';
import { MarkdownToConfluenceConverter } from '../../markdown-to-confluence/scripts/converter.js';
import { extractImagesFromMarkdown } from '../../markdown-to-confluence/scripts/extractor.js';
import * as path from 'node:path';

const client = new ConfluenceClient(config);

// 1. Search/Verify - Check if target exists (avoid duplicates)
const existing = await client.searchPages(title, space);

// 2. Extract Images - Parse markdown for ![alt](path) patterns
const images = extractImagesFromMarkdown(markdown, basePath);

// 3. Create Page - Create placeholder to get pageId
const page = await client.createPage({
  space, title,
  content: "<p>Uploading images...</p>"
});

// 4. Upload Images - Upload as attachments, capture filenames
const imageMapping: Record<string, string> = {};
for (const image of images) {
  const attachment = await client.uploadAttachment(page.id, image.absolutePath);
  imageMapping[image.originalPath] = attachment.title;
}

// 5. Convert & Update - Use image mapping, save final content
const converter = new MarkdownToConfluenceConverter({ imageMapping });
const content = converter.convert(markdown);
await client.updatePage({
  pageId: page.id,
  title,
  content,
  version: 2
});
```

**Why this order matters:**
- Confluence renames duplicates (e.g., `image.png` → `image (1).png`)
- Converter needs **actual** attachment filenames
- Images must exist before page references them

## The Update Workflow (Existing Page)

**For EXISTING pages:**

```typescript
import { ConfluenceClient } from '../../confluence-client/scripts/confluence-client.js';
import { MarkdownToConfluenceConverter } from '../../markdown-to-confluence/scripts/converter.js';
import { extractImagesFromMarkdown } from '../../markdown-to-confluence/scripts/extractor.js';
import * as path from 'node:path';

// 1. MUST get page first to get current version
const page = await client.getPageById(pageId);

// 2. Get existing attachments
const existingAttachments = await client.getPageAttachments(page.id);
const existingFilenames = new Set(existingAttachments.map(a => a.title));

// 3. Extract images from markdown
const images = extractImagesFromMarkdown(markdown, basePath);

// 4. Upload only new images
const imageMapping: Record<string, string> = {};
for (const image of images) {
  const filename = path.basename(image.absolutePath);
  if (existingFilenames.has(filename)) {
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
  title,
  content,
  version: page.version.number + 1
});
```

## Quick Reference

### Scenario A: Create New Page (Space Root)

**Using ConfluencePublisher (Recommended):**

```typescript
import { ConfluencePublisher } from '../../markdown-to-confluence/scripts/publisher.js';

const publisher = new ConfluencePublisher(client);

const result = await publisher.publish({
  markdown,
  space: 'DEV',
  title: 'My Page'  // Optional - auto-extracted from H1/front matter
});

// Returns: { success, pageId, title, url, version, operation, attachmentsUploaded }
```

**Manual workflow:**

```typescript
import { ConfluenceClient } from '../../confluence-client/scripts/confluence-client.js';
import { MarkdownToConfluenceConverter } from '../../markdown-to-confluence/scripts/converter.js';
import { extractImagesFromMarkdown } from '../../markdown-to-confluence/scripts/extractor.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

const client = new ConfluenceClient(config);

// 1. Read and extract
const markdown = fs.readFileSync(filePath, 'utf-8');
const basePath = path.dirname(filePath);
const images = extractImagesFromMarkdown(markdown, basePath);

// 2. Create placeholder at space root
const page = await client.createPage({
  space, title,
  content: "<p>Uploading images...</p>"
});

// 3. Upload and build mapping
const imageMapping: Record<string, string> = {};
for (const image of images) {
  const attachment = await client.uploadAttachment(page.id, image.absolutePath);
  imageMapping[image.originalPath] = attachment.title;
}

// 4. Convert with mapping
const converter = new MarkdownToConfluenceConverter({ imageMapping });
const content = converter.convert(markdown);

// 5. Update page
await client.updatePage({
  pageId: page.id,
  title,
  content,
  version: 2
});
```

### Scenario B: Create Child Page (Under Parent)

```typescript
// 1. Find parent page
const parentResults = await client.searchPages(parentTitle, space, 1);
const parentId = parentResults[0].id;

// 2. Read and extract
const markdown = fs.readFileSync(filePath, 'utf-8');
const basePath = path.dirname(filePath);
const images = extractImagesFromMarkdown(markdown, basePath);

// 3. Create as child page
const page = await client.createPage({
  space, title,
  parentId,  // Key difference: specify parent
  content: "<p>Uploading images...</p>"
});

// 4. Upload images and finalize (same as Scenario A)
```

### Scenario C: Update Existing Page

```typescript
// 1. MUST get page first (for version)
const page = await client.getPageById(pageId);

// 2. Get existing attachments
const existing = await client.getPageAttachments(page.id);
const existingFiles = new Set(existing.map(a => a.title));

// 3. Read and extract
const markdown = fs.readFileSync(filePath, 'utf-8');
const basePath = path.dirname(filePath);
const images = extractImagesFromMarkdown(markdown, basePath);

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
  title,
  content,
  version: page.version.number + 1
});
```

## Image Mapping Explained

The `imageMapping` tells the converter how to replace local paths:

```typescript
// Original markdown:
// ![Screenshot](./images/screenshot.png)

// After upload:
const imageMapping = {
  "./images/screenshot.png": "screenshot.png",  // Or "screenshot (1).png" if renamed
  "../assets/diagram.jpg": "diagram.jpg"
};

// Converter generates:
// <ac:image><ri:attachment ri:filename="screenshot.png" /></ac:image>
```

**Without mapping:** Images won't display because paths are not valid Confluence references.

## Attachment Upload Methods

### Method 1: File Path (Local Files)

```typescript
const attachment = await client.uploadAttachment(
  pageId,
  '/path/to/image.png',
  'Optional comment'
);
// Returns: { id, title, mediaType, fileSize, _links }
```

### Method 2: Buffer (Generated/Remote)

```typescript
const fs = await import('node:fs');
const buffer = fs.readFileSync('/path/to/image.png');

const attachment = await client.uploadAttachmentFromBuffer(
  pageId,
  'image.png',
  buffer,
  'Optional comment'
);
```

**Use buffer method when:**
- Generating images dynamically (charts, diagrams)
- Processing remote URLs
- Working with in-memory buffers

## Common Mistakes

| Mistake | Why It Fails | Correct |
|---------|-------------|---------|
| Convert before upload | Paths not replaced | Upload first, then convert with mapping |
| No imageMapping param | Local paths remain | Always pass imageMapping |
| Use original filenames | Confluence may rename | Use `attachment.title` from upload result |
| Forget to get page before update | Version conflict | Always get page first to get current version |

## Edge Cases

- **Missing images:** Upload fails, shows placeholder
- **Duplicates:** Confluence auto-renames, use returned filename
- **Network images:** Not extracted, remain as external links
- **Large files:** 100MB limit, compress first

## Error Handling Best Practices

### Pre-flight Checks

```typescript
import * as fs from 'node:fs';

// Check files exist before upload
for (const image of images) {
  if (!fs.existsSync(image.absolutePath)) {
    throw new Error(`Missing image: ${image.originalPath}`);
  }
}

// Check file size (< 100MB)
for (const image of images) {
  const stats = fs.statSync(image.absolutePath);
  if (stats.size > 100 * 1024 * 1024) {
    throw new Error(`File too large: ${image.originalPath}`);
  }
}
```

### Graceful Upload with Fallback

```typescript
const imageMapping: Record<string, string> = {};

for (const image of images) {
  try {
    const attachment = await client.uploadAttachment(pageId, image.absolutePath);
    imageMapping[image.originalPath] = attachment.title;
  } catch (err) {
    console.warn(`Failed to upload ${image.originalPath}: ${err.message}`);
    // Image will remain as text in final page
  }
}
```

See [publishing-examples.md](publishing-examples.md) for detailed examples, alternative workflows, and supported Markdown syntax.
