# Troubleshooting Guide

Common issues and solutions for Confluence operations.

## Page Operations

### "Page not found" Error

**Symptoms:**
```
Error: Page with ID 12345 not found
```

**Causes:**
- Page ID doesn't exist
- Page was deleted
- Wrong Confluence instance

**Solutions:**

1. **Verify page ID:**
   ```javascript
   const { results } = await confluence_search_pages({
     query: "page title"
   });
   ```

2. **Search by title:**
   ```javascript
   const page = await confluence_get_page({
     title: "Page Title",
     space: "DEV"
   });
   ```

3. **Check URL:** If user provided URL, extract ID from `/pages/viewpage.action?pageId=12345`

---

### "Version conflict" Error

**Symptoms:**
```
Error: Version conflict - page has been modified
```

**Cause:** Attempted to update page without current version number.

**Solution:**
Always get page before updating:

```javascript
// CORRECT
await confluence_get_page({ pageId: "12345" });
await confluence_update_page({
  pageId: "12345",
  content: "..."
});

// WRONG - Don't do this
await confluence_update_page({
  pageId: "12345",
  content: "..."
});  // May fail with version conflict
```

**Alternative:** Use `confluence_upsert_page` which handles version automatically.

---

### "Permission denied" Error

**Symptoms:**
```
Error: Permission denied to access page
```

**Causes:**
- User doesn't have edit access
- Page is restricted
- Space permissions issue

**Solutions:**

1. **Verify space access:**
   ```javascript
   const { spaces } = await confluence_list_spaces();
   // Check if target space is in list
   ```

2. **Check page restrictions:**
   ```javascript
   const page = await confluence_get_page({ pageId: "12345" });
   // Check page.restrictions
   ```

3. **Contact space admin** to grant permissions.

---

### "Space not found" Error

**Symptoms:**
```
Error: Space with key DEV not found
```

**Solution:**
List available spaces to get correct key:

```javascript
const { spaces } = await confluence_list_spaces();
// spaces = [{ key: "DEV", name: "Development" }, ...]
```

Space keys are case-sensitive!

---

## Attachment Issues

### "Images not displaying"

**Symptoms:**
Images show as broken links or text placeholders.

**Causes:**
1. Images not uploaded
2. Wrong attachment names
3. Page updated before images uploaded

**Solution:**

Follow correct order:

```javascript
// 1. Extract images
const { images } = await confluence_extract_images_from_markdown({
  markdown, basePath
});

// 2. Create page (optional placeholder)
const { id: pageId } = await confluence_create_page({
  space, title, content: "Loading..."
});

// 3. Upload images BEFORE final update
for (const img of images) {
  await confluence_upload_attachment({ pageId, filePath: img.absolutePath });
}

// 4. Update with final content
await confluence_update_page({ pageId, content: storageFormat });
```

**Verification:**
Check attachments uploaded:
```javascript
const { attachments } = await confluence_get_page_attachments({ pageId });
console.log(attachments.map(a => a.filename));
```

---

### "File not found" on Upload

**Symptoms:**
```
Error: File /path/to/image.png not found
```

**Causes:**
- Wrong basePath provided
- File doesn't exist
- Relative path incorrect

**Solutions:**

1. **Verify basePath:**
   ```javascript
   const path = require('path');
   const basePath = path.dirname(filePath);  // Directory containing markdown
   ```

2. **Check file exists:**
   ```javascript
   const fs = require('fs');
   if (!fs.existsSync(img.absolutePath)) {
     console.error(`Missing: ${img.originalPath}`);
   }
   ```

3. **Use absolute paths in markdown:**
   ```markdown
   ![Alt](/absolute/path/to/image.png)
   ```

---

### "Attachment too large" Error

**Symptoms:**
```
Error: Attachment exceeds maximum size limit
```

**Solution:**
Compress images before upload:

```javascript
// For images, resize/compress first
// Then upload
await confluence_upload_attachment({
  pageId,
  filePath: "/path/to/compressed-image.jpg"
});
```

---

## Markdown Conversion Issues

### "Invalid content format" Error

**Symptoms:**
```
Error: Invalid Storage Format
```

**Cause:** Content not in valid Confluence Storage Format.

**Solution:**
Always use conversion tool:

```javascript
// CORRECT
const { storageFormat } = await confluence_convert_markdown_to_storage({
  markdown: "# Hello\n\nWorld"
});
await confluence_create_page({
  content: storageFormat
});

// WRONG - Don't do this
await confluence_create_page({
  content: "# Hello\n\nWorld"  // Raw markdown won't work
});
```

---

### Formatting Not Applied

**Symptoms:**
Markdown formatting (tables, lists) not rendering correctly.

**Cause:** Syntax not supported or incorrectly formatted.

**Solutions:**

1. **Check markdown syntax:**
   ```markdown
   // Correct table
   | Col 1 | Col 2 |
   |-------|-------|
   | A     | B     |
   
   // Correct list
   - Item 1
   - Item 2
   ```

2. **Preview conversion:**
   ```javascript
   const { storageFormat } = await confluence_convert_markdown_to_storage({
     markdown
   });
   console.log(storageFormat);  // Check output
   ```

---

## Search Issues

### "No results" for Known Page

**Symptoms:**
Search returns empty but page exists.

**Causes:**
- Indexing delay
- Wrong space filter
- Permission restrictions

**Solutions:**

1. **Remove space filter:**
   ```javascript
   // Try without space
   const { results } = await confluence_search_pages({
     query: "page title"
     // no space parameter
   });
   ```

2. **Increase limit:**
   ```javascript
   const { results } = await confluence_search_pages({
     query: "title",
     limit: 100
   });
   ```

3. **Use partial match:**
   ```javascript
   const { results } = await confluence_search_pages({
     query: "roadmap"  // Part of title
   });
   ```

---

## Permission Issues

### Can't Set Restrictions

**Symptoms:**
```
Error: Cannot set page restrictions
```

**Causes:**
- User not space admin
- Page belongs to another user

**Solution:**
Page creator or space admin can set restrictions:

```javascript
// Check if you can modify page
const page = await confluence_get_page({ pageId });
// Check page.permissions or page.restrictions
```

---

## Connection Issues

### MCP Tools Not Available

**Symptoms:**
```
Error: Tool confluence_search_pages not found
```

**Causes:**
- MCP server not configured
- Cursor not restarted
- Wrong MCP configuration

**Solutions:**

1. **Check MCP config:**
   ```bash
   cat ~/.cursor/mcp.json
   ```

2. **Verify server starts:**
   ```bash
   cd /path/to/mcp-tools-layered
   npm run mcp
   # Should start without errors
   ```

3. **Restart Cursor completely** (Cmd+Q then reopen)

4. **Check logs:**
   ```bash
   tail -f ~/Library/Logs/Cursor/mcp.log
   ```

---

## Performance Issues

### Slow Page Updates

**Cause:** Large content or many attachments.

**Solutions:**

1. **Batch uploads:**
   ```javascript
   // Upload in parallel
   await Promise.all(
     images.map(img =>
       confluence_upload_attachment({ pageId, filePath: img.absolutePath })
     )
   );
   ```

2. **Compress content:**
   - Reduce image sizes
   - Split large documents

---

## Debugging Tips

### Enable Verbose Logging

Add logging at each step:

```javascript
console.log("Step 1: Extracting images...");
const { images } = await confluence_extract_images_from_markdown({ markdown, basePath });
console.log(`Found ${images.length} images:`, images.map(i => i.originalPath));

console.log("Step 2: Converting markdown...");
const { storageFormat, title } = await confluence_convert_markdown_to_storage({ markdown });
console.log(`Title: ${title}`);
console.log(`Content length: ${storageFormat.length}`);

console.log("Step 3: Creating page...");
const { id, url } = await confluence_create_page({ space, title, content: storageFormat });
console.log(`Created: ${url}`);

console.log("Step 4: Uploading images...");
for (const img of images) {
  try {
    await confluence_upload_attachment({ pageId: id, filePath: img.absolutePath });
    console.log(`✓ Uploaded: ${img.originalPath}`);
  } catch (err) {
    console.error(`✗ Failed: ${img.originalPath}`, err.message);
  }
}
```

### Test Individual Steps

Isolate problems:

```javascript
// Test just conversion
const result = await confluence_convert_markdown_to_storage({
  markdown: "# Test\n\n![img](./test.png)"
});
console.log(result.storageFormat);

// Test just upload
await confluence_upload_attachment({
  pageId: "12345",
  filePath: "/path/to/test.png"
});
```

### Verify MCP Connection

```javascript
// Simple test
await confluence_list_spaces();
// If this works, MCP is connected
```
