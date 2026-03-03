# Publishing Examples and Details

Detailed examples, edge cases, and supported Markdown syntax for Confluence publishing.

## Alternative: Update Existing Page

```javascript
// 1. Get existing page
const page = await confluence_get_page({ title: "My Page", space: "DEV" });
const pageId = page.id;

// 2. Manual extract images - Parse markdown for ![alt](path) patterns
const imagePaths = extractImagePathsFromMarkdown(newContent);
const images = imagePaths.map(p => ({
  originalPath: p,
  absolutePath: path.resolve("/path/to/file", p)
}));

// 3. Upload new images
const imageMapping = {};
for (const img of images) {
  const result = await confluence_upload_attachment({ pageId, filePath: img.absolutePath });
  imageMapping[img.originalPath] = result.filename;
}

// 4. Convert and update
const { storageFormat } = await confluence_convert_markdown_to_storage({
  markdown: newContent,
  imageMapping
});
await confluence_update_page({ pageId, content: storageFormat });
```

## Supported Markdown

### Front Matter
```markdown
---
title: My Document
description: A description
---

# Content
```

### Images
```markdown
![Alt text](./image.png)
![Diagram](../assets/diagram.jpg)
```

### Code Blocks
```markdown
```javascript
console.log("Hello");
```
```

### Tables
```markdown
| Col 1 | Col 2 |
|-------|-------|
| A     | B     |
```

### Blockquotes → Macros
```markdown
> This is a note
> ! Warning
> ? Tip
> i Info
```

### Task Lists
```markdown
- [ ] Task 1
- [x] Done
```

### Obsidian Links
```markdown
[[Another Page]]
[[Another Page|Display]]
```

## Edge Cases in Detail

### Duplicate Filenames
When uploading images with same name:
```javascript
// First upload: "image.png" → "image.png"
// Second upload: "image.png" → "image (1).png" (renamed!)

const mapping = {
  "./img1/image.png": "image.png",
  "./img2/image.png": "image (1).png"
};
```

### Large Images
Confluence limit: ~100MB per attachment. Compress before uploading.

### Missing Images
If file doesn't exist:
- Manual extraction includes it
- Upload fails with error
- Page shows placeholder text

Verify files exist:
```javascript
const fs = require('fs');
if (!fs.existsSync(img.absolutePath)) {
  console.error(`Missing: ${img.originalPath}`);
}
```

## Base64 Upload Example

For dynamically generated content (charts, diagrams):

```javascript
const { createCanvas } = require('canvas');

// Generate image
const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');
// ... draw on canvas ...

const buffer = canvas.toBuffer('image/png');
const base64 = buffer.toString('base64');

// Create page
const { id: pageId } = await confluence_create_page({
  space: "DEV",
  title: "Generated Report",
  content: "<p>Loading...</p>"
});

// Upload base64 content
await confluence_upload_attachment({
  pageId,
  filename: "chart.png",
  contentBase64: base64
});

// Convert markdown with image mapping
const markdown = `# Report\n\n![Chart](chart.png)`;
const { storageFormat } = await confluence_convert_markdown_to_storage({
  markdown,
  imageMapping: { "chart.png": "chart.png" }
});

await confluence_update_page({ pageId, content: storageFormat });
```

## Best Practices Summary

1. Follow order: Extract → Create → Upload → Map → Convert → Update
2. Always pass `imageMapping` to converter
3. Use returned filename from upload (`result.filename`)
4. Keep images in subdirectories (`./images/`)
5. Use front matter for explicit title
6. Test with one image first
