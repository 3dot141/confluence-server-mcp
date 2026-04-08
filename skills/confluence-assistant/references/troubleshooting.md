# Troubleshooting Guide

Common issues and solutions for the `confluence` CLI.

## Configuration Issues

### Missing Environment Variables

**Symptoms:**
```
Error: Missing required environment variable: CONF_BASE_URL
```

**Solution:** Ensure required env vars are set:
```bash
export CONF_BASE_URL="https://wiki.example.com"
export CONF_TOKEN="your-api-token"
# or
export CONF_USERNAME="user@example.com"
export CONF_PASSWORD="your-api-token"
```

Tip: Use `.env` file in the project root for persistent configuration.

---

## Page Operations

### "Page not found" Error

**Symptoms:**
```
Error: Page with ID 12345 not found
```

**Solutions:**

1. **Verify page exists by searching:**
   ```bash
   confluence search "page title" --space KEY --json
   ```

2. **Try by title instead of ID:**
   ```bash
   confluence get-page "Page Title" --space KEY
   ```

---

### "Version conflict" Error

**Symptoms:**
```
Error: Version conflict - page has been modified
```

**Cause:** Page was modified between read and update.

**Solution:** The `update-page` and `publish` commands handle version automatically. If the error persists, retry the command — it will fetch the latest version.

---

### "Permission denied" Error

**Solutions:**

1. **Verify space access:**
   ```bash
   confluence list-spaces --json
   ```

2. **Contact space admin** to grant permissions.

---

### "Space not found" Error

**Solution:** List available spaces to get the correct key:

```bash
confluence list-spaces
```

Space keys are case-sensitive!

---

## Publishing Issues

### Images not displaying

**Causes:**
1. Markdown references relative paths that don't exist
2. Running `publish` from a different directory than the markdown file

**Solution:** Run publish from the directory containing the markdown, or use absolute paths in markdown:

```bash
cd /path/to/docs
confluence publish README.md --space KEY
```

---

### Mermaid diagrams not rendering

**Cause:** Mermaid syntax error or unsupported diagram type.

**Solutions:**
- Verify Mermaid syntax at [mermaid.live](https://mermaid.live)
- Use `--debug` to see rendering details:
  ```bash
  confluence publish doc.md --space KEY --debug
  ```

---

## Debugging

For any unexpected behavior, enable debug logging:

```bash
confluence <command> --debug
```

This outputs detailed request/response information to stderr.
