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
        name: "confluence_publish_complete",
        description: "一键发布 Markdown 到 Confluence：自动提取图片和 Mermaid 图表，并行上传渲染，转换为 Confluence 格式并发布。支持 !info/!warning/!tip/!note 标记和表格。",
        inputSchema: {
            type: "object",
            properties: {
                pageId: {
                    type: "string",
                    description: "现有页面 ID（可选，不提供则按标题搜索或创建新页面）"
                },
                space: {
                    type: "string",
                    description: "Confluence Space Key（必填）"
                },
                title: {
                    type: "string",
                    description: "页面标题（必填）"
                },
                markdown: {
                    type: "string",
                    description: "Markdown 内容，支持本地图片路径、Mermaid 图表、表格、任务列表等"
                },
                parentId: {
                    type: "string",
                    description: "父页面 ID（可选，仅创建新页面时有效）"
                },
                basePath: {
                    type: "string",
                    description: "本地图片基础路径（可选，用于解析相对路径如 ./images/pic.png）"
                },
                mermaidTheme: {
                    type: "string",
                    enum: ["default", "forest", "dark", "neutral"],
                    default: "default",
                    description: "Mermaid 图表主题"
                }
            },
            required: ["space", "title", "markdown"]
        }
    }
];
//# sourceMappingURL=definitions.js.map