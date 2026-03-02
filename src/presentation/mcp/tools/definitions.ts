// src/presentation/mcp/tools/definitions.ts

export const toolDefinitions = [
  {
    name: "confluence_list_spaces",
    description: "List all accessible Confluence spaces",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["global", "personal"],
          description: "Space type filter",
          default: "global"
        }
      }
    }
  },
  {
    name: "confluence_create_page",
    description: "Create a new Confluence page",
    inputSchema: {
      type: "object",
      properties: {
        space: { type: "string", description: "Space key" },
        title: { type: "string", description: "Page title" },
        content: { type: "string", description: "Page content (Confluence Storage Format)" },
        parentId: { type: "string", description: "Parent page ID (optional)" },
        parentTitle: { type: "string", description: "Parent page title (optional, will search for ID)" },
        atRoot: { type: "boolean", description: "Create at space root", default: false }
      },
      required: ["title", "content"]
    }
  },
  {
    name: "confluence_update_page",
    description: "Update an existing Confluence page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page ID (preferred)" },
        space: { type: "string", description: "Space key (if using title)" },
        title: { type: "string", description: "Page title (if not using pageId)" },
        content: { type: "string", description: "New page content" },
        newTitle: { type: "string", description: "New page title (optional)" }
      },
      required: ["content"]
    }
  },
  {
    name: "confluence_upsert_page",
    description: "Create or update a Confluence page",
    inputSchema: {
      type: "object",
      properties: {
        space: { type: "string", description: "Space key" },
        title: { type: "string", description: "Page title" },
        content: { type: "string", description: "Page content" },
        parentId: { type: "string", description: "Parent page ID (optional)" },
        parentTitle: { type: "string", description: "Parent page title (optional)" },
        atRoot: { type: "boolean", description: "Create at space root", default: false }
      },
      required: ["title", "content"]
    }
  },
  {
    name: "confluence_get_page",
    description: "Get a Confluence page by ID or title",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page ID" },
        space: { type: "string", description: "Space key (if using title)" },
        title: { type: "string", description: "Page title" }
      }
    }
  },
  {
    name: "confluence_delete_page",
    description: "Delete a Confluence page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page ID to delete" }
      },
      required: ["pageId"]
    }
  },
  {
    name: "confluence_search_pages",
    description: "Search Confluence pages by title",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        space: { type: "string", description: "Limit to space (optional)" },
        limit: { type: "number", description: "Max results", default: 25 }
      },
      required: ["query"]
    }
  },
  {
    name: "confluence_get_child_pages",
    description: "Get child pages of a parent page",
    inputSchema: {
      type: "object",
      properties: {
        parentId: { type: "string", description: "Parent page ID" },
        limit: { type: "number", description: "Max results", default: 50 }
      },
      required: ["parentId"]
    }
  },
  {
    name: "confluence_get_page_history",
    description: "Get page version history",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page ID" },
        limit: { type: "number", description: "Max results", default: 10 }
      },
      required: ["pageId"]
    }
  },
  {
    name: "confluence_upload_attachment",
    description: "Upload an attachment to a page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Target page ID" },
        filePath: { type: "string", description: "Local file path" },
        filename: { type: "string", description: "Custom filename (optional)" },
        contentBase64: { type: "string", description: "Base64 content (alternative to filePath)" },
        comment: { type: "string", description: "Attachment comment (optional)" }
      },
      required: ["pageId"]
    }
  },
  {
    name: "confluence_get_page_attachments",
    description: "Get attachments of a page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page ID" },
        limit: { type: "number", description: "Max results", default: 100 }
      },
      required: ["pageId"]
    }
  },
  {
    name: "confluence_add_comment",
    description: "Add a comment to a page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page ID" },
        content: { type: "string", description: "Comment content (HTML)" },
        parentCommentId: { type: "string", description: "Reply to comment (optional)" }
      },
      required: ["pageId", "content"]
    }
  },
  {
    name: "confluence_get_page_comments",
    description: "Get comments of a page",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page ID" },
        limit: { type: "number", description: "Max results", default: 50 }
      },
      required: ["pageId"]
    }
  },
  {
    name: "confluence_set_page_restriction",
    description: "Set page access restrictions",
    inputSchema: {
      type: "object",
      properties: {
        pageId: { type: "string", description: "Page ID" },
        restrictionType: {
          type: "string",
          enum: ["none", "edit_only", "view_only"],
          description: "Restriction type"
        },
        username: { type: "string", description: "Target user (optional, defaults to current user)" }
      },
      required: ["pageId", "restrictionType"]
    }
  },
  {
    name: "confluence_convert_markdown_to_storage",
    description: "Convert Markdown to Confluence Storage Format (HTML). Note: This is a conversion tool, not an API tool. Use the returned storageFormat with confluence_create_page or confluence_update_page.",
    inputSchema: {
      type: "object",
      properties: {
        markdown: { 
          type: "string", 
          description: "Markdown content to convert" 
        },
        addToc: { 
          type: "boolean", 
          description: "Add table of contents macro", 
          default: true 
        },
        imageMapping: { 
          type: "object", 
          description: "Optional mapping of local image paths to Confluence attachment URLs: {localPath: attachmentUrl}",
          additionalProperties: { type: "string" }
        },
        basePath: { 
          type: "string", 
          description: "Base path for resolving relative image paths (default: current working directory)" 
        }
      },
      required: ["markdown"]
    }
  },
  {
    name: "confluence_extract_images_from_markdown",
    description: "Extract image references from Markdown content. Returns a list of images with their paths, types (local/URL), and resolved absolute paths. Use this before uploading attachments.",
    inputSchema: {
      type: "object",
      properties: {
        markdown: { 
          type: "string", 
          description: "Markdown content to analyze" 
        },
        basePath: { 
          type: "string", 
          description: "Base path for resolving relative paths (default: current working directory)" 
        }
      },
      required: ["markdown"]
    }
  },
  {
    name: "confluence_build_code_macro",
    description: "[FORMAT CONVERSION TOOL] Generate a Confluence code macro in Storage Format. This is a utility for building Confluence content, not an API operation.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Code content" },
        language: { type: "string", description: "Programming language" },
        linenumbers: { type: "boolean", description: "Show line numbers", default: false },
        collapse: { type: "boolean", description: "Collapse by default", default: false }
      },
      required: ["code"]
    }
  }
];
