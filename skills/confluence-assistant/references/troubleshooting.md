# Troubleshooting Guide

Common issues and solutions for Confluence operations.

## Page Operations

### "Page not found" Error

**Symptoms:**
```
Error: Page with ID 12345 not found
```

**Solutions:**

1. **Verify page ID:**
   ```javascript
   const { results } = await confluence_search_pages({ query: "page title" });
   ```

2. **Search by title:**
   ```javascript
   const page = await confluence_get_page({ title: "Page Title", space: "DEV" });
   ```

---

### "Version conflict" Error

**Symptoms:**
```
Error: Version conflict - page has been modified
```

**Cause:** Attempted to update page without current version number.

**Solution:** Always get page before updating:

```javascript
// CORRECT
await confluence_get_page({ pageId: "12345" });
await confluence_update_page({ pageId: "12345", content: "..." });

// WRONG - Don't do this
await confluence_update_page({ pageId: "12345", content: "..." });
```

**Alternative:** Use `confluence_publish_complete` or `confluence_upsert_page` which handle version automatically.

---

### "Permission denied" Error

**Solutions:**

1. **Verify space access:**
   ```javascript
   const { spaces } = await confluence_list_spaces();
   ```

2. **Contact space admin** to grant permissions.

---

### "Space not found" Error

**Solution:** List available spaces to get correct key:

```javascript
const { spaces } = await confluence_list_spaces();
// spaces = [{ key: "DEV", name: "Development" }, ...]
```

Space keys are case-sensitive!

---

## Publishing Issues

### Images not displaying

**Causes:**
1. Wrong basePath provided
2. File doesn't exist

**Solution:**

```javascript
// Verify basePath points to directory containing markdown
await confluence_publish_complete({
  space: "Teams",
  title: "My Doc",
  markdown: content,
  basePath: "/absolute/path/to/markdown/directory"
});
```

---

### Mermaid diagrams not rendering

**Cause:** Mermaid syntax error or unsupported diagram type.

**Solution:**
- Verify Mermaid syntax at [mermaid.live](https://mermaid.live)
- Try different theme: `mermaidTheme: "forest"`

---

## Connection Issues

### MCP Tools Not Available

**Symptoms:**
```
Error: Tool confluence_search_pages not found
```

**Solutions:**

1. **Check MCP config:**
   ```bash
   cat ~/.cursor/mcp.json
   ```

2. **Verify server starts:**
   ```bash
   cd /path/to/mcp-tools-layered
   npm run mcp
   ```

3. **Restart Cursor completely** (Cmd+Q then reopen)

---

## Performance Issues

### Slow Page Updates

**Cause:** Large content or many attachments.

**Solutions:**

1. **Compress images** before publishing
2. **Split large documents** into multiple pages
