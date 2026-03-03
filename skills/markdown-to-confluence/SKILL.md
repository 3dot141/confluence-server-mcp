---
name: markdown-to-confluence
description: Convert Markdown to Confluence Storage Format and publish to Confluence. Use when converting Markdown documents to Confluence pages, including support for tables, code blocks, images, task lists, blockquotes, Mermaid diagrams, and automatic title extraction from front matter or H1 headings.
---

# Markdown to Confluence

## Overview

Convert Markdown documents to Confluence Storage Format and publish them to Confluence. Supports rich formatting including tables, code blocks with syntax highlighting, images, task lists, blockquotes (info/warning/tip/note), Mermaid diagrams, and more.

Requires the `confluence-client` skill for API operations.

## Quick Start

```typescript
import { MarkdownToConfluenceConverter, extractImagesFromMarkdown } from '../confluence-assistant/scripts/markdown-to-confluence/converter.js';
import { ConfluencePublisher } from '../confluence-assistant/scripts/markdown-to-confluence/publisher.js';

// Basic conversion
const converter = new MarkdownToConfluenceConverter();
const storageFormat = converter.convert(markdown);

// Extract images and publish
const images = extractImagesFromMarkdown(markdown, './docs');
const publisher = new ConfluencePublisher(confluenceClient);
const result = await publisher.publish({
  markdown,
  space: 'DEV',
  title: 'My Document',
  parentId: '123456'
});
```

## Core Capabilities

### 1. Markdown Conversion

Convert Markdown to Confluence Storage Format:

```typescript
import { MarkdownToConfluenceConverter } from '../confluence-assistant/scripts/markdown-to-confluence/converter.js';

const converter = new MarkdownToConfluenceConverter({
  addTocMacro: true,      // Add table of contents
  basePath: './docs'      // Base path for resolving image paths
});

// Convert and get title from front matter or H1
const result = converter.convertWithMetadata(markdown);
console.log(result.title);        // Extracted title
console.log(result.storageFormat); // Confluence XML
```

### 2. Image Processing

Extract and upload images from Markdown:

```typescript
import { extractImagesFromMarkdown } from '../confluence-assistant/scripts/markdown-to-confluence/extractor.js';

const images = extractImagesFromMarkdown(markdown, './docs');
// Returns: [{ originalPath, absolutePath, altText, isBase64 }]
```

### 3. Publishing

One-step publish to Confluence:

```typescript
import { ConfluencePublisher } from '../confluence-assistant/scripts/markdown-to-confluence/publisher.js';

const publisher = new ConfluencePublisher(confluenceClient);

// Create or update page
const result = await publisher.publish({
  markdown: '# Hello\n\nContent here',
  space: 'DEV',
  title: 'Optional Title',  // Or auto-extract from H1/front matter
  pageId: '123456',         // For updates
  parentId: '789012',       // Parent page
  updateIfExists: true      // Update if title exists
});

// Result: { success, pageId, title, url, version, operation, attachmentsUploaded }
```

## Supported Markdown Features

### Headings

```markdown
# H1 Title
## H2 Subtitle
### H3 Section
```

### Formatting

- **Bold**: `**text**` → `<strong>text</strong>`
- *Italic*: `*text*` or `_text_` → `<em>text</em>`
- `Inline code`: `` `code` `` → `<code>code</code>`
- [Links](url): `[text](url)` → `<a href="url">text</a>`

### Code Blocks

````markdown
```typescript
const x = 1;
```
````

Converts to Confluence code macro with syntax highlighting.

### Tables

```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

### Lists

Unordered:
```markdown
- Item 1
- Item 2
  - Nested
```

Ordered:
```markdown
1. First
2. Second
```

Task lists:
```markdown
- [ ] Todo item
- [x] Done item
```

Converts to Confluence task list macros.

### Blockquotes

```markdown
> Regular note (or use prefix)
> ! Warning message
> ? Tip message
> i Info message
```

Converts to Confluence info/warning/tip/note macros.

### Images

```markdown
![Alt text](./images/screenshot.png)
![[Obsidian format.png]]
```

Images are uploaded as attachments and referenced in content.

### Front Matter

```markdown
---
title: Document Title
---

# Content starts here
```

Title is extracted from front matter or first H1.

## Mermaid Diagrams

Convert Mermaid diagrams to images:

```typescript
import { MermaidProcessor } from '../confluence-assistant/scripts/markdown-to-confluence/mermaid.js';

const processor = new MermaidProcessor();

// Extract and render diagrams
const processedMarkdown = await processor.process(markdown, {
  outputDir: './temp',
  theme: 'default'
});
```

Requires `mermaid-cli` (`@mermaid-js/mermaid-cli`) for rendering.

## Complete Workflow

```typescript
import { ConfluenceClient } from '../confluence-assistant/scripts/confluence-client/confluence-client.js';
import { ConfluencePublisher } from '../confluence-assistant/scripts/markdown-to-confluence/publisher.js';

// 1. Setup client
const client = new ConfluenceClient({
  baseUrl: 'https://company.atlassian.net/wiki',
  username: 'user@example.com',
  apiToken: 'token'
});

// 2. Create publisher
const publisher = new ConfluencePublisher(client);

// 3. Read and publish
const markdown = readFileSync('./doc.md', 'utf-8');
const result = await publisher.publish({
  markdown,
  space: 'DEV',
  parentId: '123456'
});

console.log(`Published: ${result.url}`);
```

## Error Handling

```typescript
try {
  await publisher.publish({ markdown, space: 'DEV' });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Invalid input:', error.message);
  } else if (error instanceof ConfluenceError) {
    console.log('API error:', error.statusCode);
  }
}
```

## Resources

### scripts/

- `../scripts/markdown-to-confluence/converter.ts` - Markdown to Confluence Storage Format converter
- `../scripts/markdown-to-confluence/extractor.ts` - Image extraction from Markdown
- `../scripts/markdown-to-confluence/publisher.ts` - High-level publishing workflow
- `../scripts/markdown-to-confluence/mermaid.ts` - Mermaid diagram processing
- `../scripts/markdown-to-confluence/macros.ts` - Confluence macro builders
- `../scripts/markdown-to-confluence/types.ts` - TypeScript interfaces

### references/

- `supported-syntax.md` - Complete Markdown syntax reference
