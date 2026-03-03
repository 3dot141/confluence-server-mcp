# Markdown Publishing Workflow

Complete workflow for publishing Markdown with images to Confluence.

**Architecture Overview:**
```
Infrastructure Layer  → HTTP Client, Config
Domain Layer          → Confluence API Repository
Application Layer     → Use Cases (publish, upload)
Presentation Layer    → MCP Tool Handlers
```

## User Intent Decision Tree

**CRITICAL: First determine what user wants:**

```
User says "上传/同步到 XX":
  ↓
┌─────────────────────────────────────────────────────────────┐
│  Check if XX exists?                                        │
│  Use: confluence_search_pages or confluence_get_page        │
└─────────────────────────────────────────────────────────────┘
  ↓
  ├─ If EXISTS → "更新/同步页面" (Update existing page)
  │              ├─ Must call get_page first (get version)
  │              ├─ Extract new images
  │              ├─ Upload missing images
  │              └─ Update with new content
  │
  └─ If NOT EXISTS → "创建新页面" (Create new page)
    ↓
    Check for "目录下/under" keyword?
    ├─ NO "目录下" → Create at space root
    │   Use: confluence_create_page({ space, title, content })
    │
    └─ YES "目录下 XX" → Create as child of XX
        Use: confluence_create_page({ space, title, content, parentId: XX.id })
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

1. **Search/Verify** - Check if target exists (avoid duplicates)
2. **Extract Images** - Manually parse markdown for `![alt](path)` patterns (LLM extraction)
3. **Create Page** - Create placeholder to get pageId
4. **Upload Images** - Upload as attachments, capture filenames
5. **Convert & Update** - Use image mapping, save final content

**Why this order matters:**
- Confluence renames duplicates (e.g., `image.png` → `image (1).png`)
- Converter needs **actual** attachment filenames
- Images must exist before page references them

## The Update Workflow (Existing Page)

**For EXISTING pages:**

1. **Get Page** - MUST call first to get current version
2. **Get Attachments** - Check what images already exist
3. **Extract Images** - Manually parse markdown for `![alt](path)` patterns (LLM extraction)
4. **Upload Missing** - Only upload new/changed images
5. **Convert & Update** - Use full image mapping

```javascript
// Update workflow
async function updateExistingPage(pageId, markdown, basePath) {
  // 1. MUST get page first
  const page = await confluence_get_page({ pageId });
  
  // 2. Check existing attachments
  const existingAttachments = await confluence_get_page_attachments({ pageId });
  const existingFilenames = new Set(existingAttachments.map(a => a.title));
  
  // 3. Manual extract images - Parse markdown for ![alt](path) patterns
  //    Example: extractImagePathsFromMarkdown(markdown) returns ["./images/diagram.png"]
  const imagePaths = extractImagePathsFromMarkdown(markdown);
  const images = imagePaths.map(p => ({
    originalPath: p,
    absolutePath: resolvePath(p, basePath)
  }));
  
  // 4. Upload only new images
  const imageMapping = {};
  for (const img of images) {
    const filename = path.basename(img.absolutePath);
    if (existingFilenames.has(filename)) {
      // Already exists, use existing
      imageMapping[img.originalPath] = filename;
    } else {
      // Upload new
      const result = await confluence_upload_attachment({ pageId, filePath: img.absolutePath });
      imageMapping[img.originalPath] = result.filename;
    }
  }
  
  // 5. Convert and update
  const { storageFormat } = await confluence_convert_markdown_to_storage({ markdown, imageMapping });
  await confluence_update_page({ pageId, content: storageFormat });
}

## Quick Reference

### Scenario A: Create New Page (Space Root)

```javascript
async function publishToSpace(filePath, space, title) {
  const fs = require('fs');
  const path = require('path');
  
  // 1. Read and extract
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const basePath = path.dirname(filePath);
  const imagePaths = extractImagePathsFromMarkdown(markdown);
  const images = imagePaths.map(p => ({
    originalPath: p,
    absolutePath: path.resolve(basePath, p)
  }));
  
  // 2. Create placeholder at space root
  const { id: pageId } = await confluence_create_page({
    space, title,
    content: "<p>Uploading images...</p>"
  });
  
  // 3. Upload and build mapping
  const imageMapping = {};
  for (const img of images) {
    const result = await confluence_upload_attachment({ pageId, filePath: img.absolutePath });
    imageMapping[img.originalPath] = result.filename;
  }
  
  // 4. Convert with mapping
  const { storageFormat } = await confluence_convert_markdown_to_storage({
    markdown, imageMapping
  });
  
  // 5. Update page
  await confluence_update_page({ pageId, content: storageFormat });
  return pageId;
}
```

### Scenario B: Create Child Page (Under Parent)

```javascript
async function publishUnderParent(filePath, space, title, parentTitle) {
  const fs = require('fs');
  const path = require('path');
  
  // 1. Find parent page
  const parentResults = await confluence_search_pages({ query: parentTitle, space });
  if (parentResults.length === 0) throw new Error(`Parent page not found: ${parentTitle}`);
  const parentId = parentResults[0].id;
  
  // 2. Read and extract
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const basePath = path.dirname(filePath);
  const imagePaths = extractImagePathsFromMarkdown(markdown);
  const images = imagePaths.map(p => ({
    originalPath: p,
    absolutePath: path.resolve(basePath, p)
  }));
  
  // 3. Create as child page
  const { id: pageId } = await confluence_create_page({
    space, title,
    parentId,  // Key difference: specify parent
    content: "<p>Uploading images...</p>"
  });
  
  // 4. Upload images
  const imageMapping = {};
  for (const img of images) {
    const result = await confluence_upload_attachment({ pageId, filePath: img.absolutePath });
    imageMapping[img.originalPath] = result.filename;
  }
  
  // 5. Convert and update
  const { storageFormat } = await confluence_convert_markdown_to_storage({ markdown, imageMapping });
  await confluence_update_page({ pageId, content: storageFormat });
  return pageId;
}
```

### Scenario C: Update Existing Page

```javascript
async function updateExistingPage(filePath, pageId) {
  const fs = require('fs');
  const path = require('path');
  
  // 1. MUST get page first (for version)
  const page = await confluence_get_page({ pageId });
  
  // 2. Get existing attachments
  const existing = await confluence_get_page_attachments({ pageId });
  const existingFiles = new Set(existing.map(a => a.title));
  
  // 3. Read and extract
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const basePath = path.dirname(filePath);
  const imagePaths = extractImagePathsFromMarkdown(markdown);
  const images = imagePaths.map(p => ({
    originalPath: p,
    absolutePath: path.resolve(basePath, p)
  }));
  
  // 4. Upload only new images
  const imageMapping = {};
  for (const img of images) {
    const filename = path.basename(img.absolutePath);
    if (existingFiles.has(filename)) {
      imageMapping[img.originalPath] = filename;
    } else {
      const result = await confluence_upload_attachment({ pageId, filePath: img.absolutePath });
      imageMapping[img.originalPath] = result.filename;
    }
  }
  
  // 5. Convert and update
  const { storageFormat } = await confluence_convert_markdown_to_storage({ markdown, imageMapping });
  await confluence_update_page({ pageId, content: storageFormat });
}
```

## Image Mapping Explained

The `imageMapping` tells the converter how to replace local paths:

```javascript
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
```javascript
await confluence_upload_attachment({
  pageId: "12345",
  filePath: "/path/to/image.png"
});
```

### Method 2: Base64 Content (Generated/Remote)
```javascript
const fs = require('fs');
const imageBuffer = fs.readFileSync('/path/to/image.png');
const base64Content = imageBuffer.toString('base64');

await confluence_upload_attachment({
  pageId: "12345",
  filename: "image.png",
  contentBase64: base64Content
});
```

**Use base64 when:**
- Generating images dynamically (charts, diagrams)
- Processing remote URLs
- Working with in-memory buffers

## Common Mistakes

| Mistake | Why It Fails | Correct |
|---------|-------------|---------|
| Convert before upload | Paths not replaced | Upload first, then convert with mapping |
| No imageMapping param | Local paths remain | Always pass imageMapping |
| Use original filenames | Confluence may rename | Use `result.filename` from upload |

## Edge Cases

- **Missing images:** Upload fails, shows placeholder
- **Duplicates:** Confluence auto-renames, use returned filename
- **Network images:** Not extracted, remain as external links
- **Large files:** 100MB limit, compress first

## Error Handling Best Practices

### Pre-flight Checks
```javascript
const fs = require('fs');

// Check files exist before upload
for (const img of images) {
  if (!fs.existsSync(img.absolutePath)) {
    throw new Error(`Missing image: ${img.originalPath}`);
  }
}

// Check file size (< 100MB)
for (const img of images) {
  const stats = fs.statSync(img.absolutePath);
  if (stats.size > 100 * 1024 * 1024) {
    throw new Error(`File too large: ${img.originalPath}`);
  }
}
```

### Graceful Upload with Fallback
```javascript
const imageMapping = {};

for (const img of images) {
  try {
    const result = await confluence_upload_attachment({
      pageId,
      filePath: img.absolutePath
    });
    imageMapping[img.originalPath] = result.filename;
  } catch (err) {
    console.warn(`Failed to upload ${img.originalPath}: ${err.message}`);
    // Image will remain as text in final page
  }
}
```

See [publishing-examples.md](publishing-examples.md) for detailed examples, alternative workflows, and supported Markdown syntax.
