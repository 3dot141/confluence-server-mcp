---
name: confluence-client
description: A comprehensive TypeScript client for Atlassian Confluence REST API. Use when working with Confluence programmatically - creating/updating pages, managing spaces, uploading attachments, adding comments, setting permissions, or searching content. Supports both Confluence Cloud and Data Center.
---

# Confluence Client

## Overview

A robust TypeScript client for interacting with the Confluence REST API. Provides type-safe methods for all common Confluence operations including page management, space operations, attachments, comments, permissions, and search.

## Quick Start

```typescript
import { ConfluenceClient } from './scripts/confluence-client.js';

const client = new ConfluenceClient({
  baseUrl: 'https://your-instance.atlassian.net/wiki',
  username: 'email@example.com',
  apiToken: 'your-api-token'
});

// Create a page
const page = await client.createPage({
  space: 'DEV',
  title: 'My New Page',
  content: '<h1>Hello World</h1><p>This is my page content.</p>'
});
```

## Configuration

The client requires:
- `baseUrl`: Your Confluence instance URL (e.g., `https://company.atlassian.net/wiki` for Cloud)
- `username`: Your email (Cloud) or username (Data Center)
- `apiToken`: API token (Cloud) or password (Data Center)

Optional:
- `defaultSpace`: Default space key for operations

## Core Capabilities

### 1. Page Management

Create, read, update, delete, and search pages:

```typescript
// Create page
const page = await client.createPage({
  space: 'DEV',
  title: 'New Page',
  content: '<h1>Title</h1>',
  parentId: '123456'  // optional
});

// Get page by ID
const page = await client.getPageById('123456');

// Get page by title
const page = await client.getPageByTitle('DEV', 'Page Title');

// Update page
const updated = await client.updatePage({
  pageId: '123456',
  title: 'Updated Title',
  content: '<h1>New Content</h1>',
  version: 2
});

// Delete page
await client.deletePage('123456');

// Search pages
const results = await client.searchPages('search query', 'DEV', 10);

// Get child pages
const children = await client.getChildPages('123456', 25);

// Get page history
const history = await client.getPageHistory('123456');
```

### 2. Space Management

List and query spaces:

```typescript
const spaces = await client.listSpaces();
```

### 3. Attachments

Upload and manage file attachments:

```typescript
// Upload attachment
const attachment = await client.uploadAttachment(
  'page-id',
  '/path/to/file.pdf'
);

// List attachments
const attachments = await client.getPageAttachments('page-id', 50);
```

### 4. Comments

Add and retrieve page comments:

```typescript
// Add comment
const comment = await client.addComment(
  'page-id',
  '<p>This is a comment</p>'
);

// List comments
const comments = await client.getPageComments('page-id', 25);
```

### 5. Permissions

Manage page access restrictions:

```typescript
// Set page restrictions
await client.setPageRestriction(
  'page-id',
  'edit',  // or 'read'
  { users: ['user1'], groups: ['group1'] }
);

// Get page restrictions
const restrictions = await client.getPageRestrictions('page-id');
```

### 6. Batch Operations

For efficient bulk processing:

```typescript
// Update multiple pages
const updates = pageIds.map(id => ({
  pageId: id,
  title: 'New Title',
  content: '<p>Content</p>',
  version: 2
}));

const results = await Promise.allSettled(
  updates.map(u => client.updatePage(u))
);
```

## Error Handling

The client throws typed errors:

```typescript
import { ConfluenceError, NotFoundError, ValidationError, AuthenticationError } from './scripts/confluence-client.js';

try {
  await client.getPageById('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Page not found');
  } else if (error instanceof AuthenticationError) {
    console.log('Check credentials');
  }
}
```

## Working with Storage Format

Confluence uses a specific XML-based storage format. When publishing content:

```typescript
// Use proper Confluence storage format
const content = `
  <h1>Page Title</h1>
  <p>Normal paragraph with <strong>bold</strong> and <em>italic</em>.</p>
  <ul>
    <li>List item 1</li>
    <li>List item 2</li>
  </ul>
  <ac:image><ri:attachment ri:filename="screenshot.png" /></ac:image>
`;

await client.createPage({ space: 'DEV', title: 'Page', content });
```

For converting Markdown to Confluence storage format, use the `markdown-to-confluence` skill.

## Rate Limiting

The client handles rate limits automatically:
- Retries on 429 responses with exponential backoff
- Respects `Retry-After` headers

## Resources

### scripts/

- `confluence-client.ts` - Main client class with all API methods
- `errors.ts` - Error classes for different failure scenarios
- `types.ts` - TypeScript interfaces and types

Load `scripts/confluence-client.ts` for the complete implementation with all methods and types.
