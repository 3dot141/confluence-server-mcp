# Publishing Examples and Details

Detailed examples, edge cases, and supported Markdown syntax for Confluence publishing using direct TypeScript clients.

## Alternative: Update Existing Page

```typescript
import { ConfluenceClient } from '../../scripts/confluence-client/confluence-client.js';
import { MarkdownToConfluenceConverter } from '../../scripts/markdown-to-confluence/converter.js';
import { extractImagesFromMarkdown } from '../../scripts/markdown-to-confluence/extractor.js';

const client = new ConfluenceClient(config);

// 1. Get existing page
const page = await client.getPageByTitle('My Page', 'DEV');

// 2. Extract images from markdown
const images = extractImagesFromMarkdown(newContent, '/path/to/file');

// 3. Upload new images
const imageMapping: Record<string, string> = {};
for (const image of images) {
  const attachment = await client.uploadAttachment(page.id, image.absolutePath);
  imageMapping[image.originalPath] = attachment.title;
}

// 4. Convert and update
const converter = new MarkdownToConfluenceConverter({ imageMapping });
const content = converter.convert(newContent);
await client.updatePage({
  pageId: page.id,
  content,
  version: page.version.number + 1
});
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

```typescript
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
- Extraction includes it
- Upload fails with error
- Page shows placeholder text

Verify files exist:

```typescript
import * as fs from 'node:fs';

if (!fs.existsSync(image.absolutePath)) {
  console.error(`Missing: ${image.originalPath}`);
}
```

## Base64 Upload Example

For dynamically generated content (charts, diagrams):

```typescript
import { ConfluenceClient } from '../../scripts/confluence-client/confluence-client.js';
import { createCanvas } from 'canvas';

const client = new ConfluenceClient(config);

// Generate image
const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');
// ... draw on canvas ...

const buffer = canvas.toBuffer('image/png');

// Create page
const page = await client.createPage({
  space: "DEV",
  title: "Generated Report",
  content: "<p>Loading...</p>"
});

// Upload buffer
await client.uploadAttachmentFromBuffer(
  page.id,
  'chart.png',
  buffer,
  'Generated chart'
);

// Convert markdown with image mapping
const markdown = `# Report\n\n![Chart](chart.png)`;
const converter = new MarkdownToConfluenceConverter({
  imageMapping: { "chart.png": "chart.png" }
});
const content = converter.convert(markdown);

await client.updatePage({
  pageId: page.id,
  content,
  version: 2
});
```

## Mermaid Diagram Support

For Mermaid diagrams, render them to images first:

```typescript
import { MermaidProcessor } from '../../scripts/markdown-to-confluence/mermaid.js';

const processor = new MermaidProcessor({
  outputDir: './temp',
  theme: 'default'
});

// Process mermaid diagrams in markdown
const processed = await processor.process(markdown);
// Returns: { markdown, imagePaths }

// Now publish the processed markdown
const result = await publisher.publish({
  markdown: processed.markdown,
  space: 'DEV'
});

// Cleanup temp files
processor.cleanup();
```

Requires `@mermaid-js/mermaid-cli`:
```bash
npm install -g @mermaid-js/mermaid-cli
```

## Best Practices Summary

1. **Follow order:** Extract → Create → Upload → Map → Convert → Update
2. **Always pass `imageMapping`** to converter
3. **Use returned filename** from upload (`attachment.title`)
4. **Keep images in subdirectories** (`./images/`)
5. **Use front matter** for explicit title
6. **Test with one image** first
7. **Handle errors gracefully** - don't let one failed upload break the whole process
