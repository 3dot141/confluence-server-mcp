// src/presentation/mcp/tools/handlers.ts
import { spaceUseCases, pageUseCases, attachmentUseCases, commentUseCases, permissionUseCases, } from "../../../application/usecases/index.js";
import { publishCompleteUseCase } from '../../../application/usecases/publish-complete.js';
import { ConfluenceError } from "../../../infrastructure/errors.js";
export async function handleToolCall(name, args) {
    try {
        switch (name) {
            // Spaces
            case "confluence_list_spaces": {
                const result = await spaceUseCases.listSpaces({
                    type: args.type || "global"
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            // Pages
            case "confluence_create_page": {
                const result = await pageUseCases.createPage({
                    space: args.space,
                    title: args.title,
                    content: args.content,
                    parentId: args.parentId,
                    parentTitle: args.parentTitle,
                    atRoot: args.atRoot,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_update_page": {
                const result = await pageUseCases.updatePage({
                    pageId: args.pageId,
                    space: args.space,
                    title: args.title,
                    content: args.content,
                    newTitle: args.newTitle,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_upsert_page": {
                const result = await pageUseCases.upsertPage({
                    space: args.space,
                    title: args.title,
                    content: args.content,
                    parentId: args.parentId,
                    parentTitle: args.parentTitle,
                    atRoot: args.atRoot,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_get_page": {
                const result = await pageUseCases.getPage({
                    pageId: args.pageId,
                    space: args.space,
                    title: args.title,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_delete_page": {
                const result = await pageUseCases.deletePage({
                    pageId: args.pageId,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_search_pages": {
                const result = await pageUseCases.searchPages({
                    query: args.query,
                    space: args.space,
                    limit: args.limit,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_get_child_pages": {
                const result = await pageUseCases.getChildPages({
                    parentId: args.parentId,
                    limit: args.limit,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_get_page_history": {
                const result = await pageUseCases.getPageHistory({
                    pageId: args.pageId,
                    limit: args.limit,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_move_page": {
                const result = await pageUseCases.movePage({
                    pageId: args.pageId,
                    parentId: args.parentId,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            // Attachments
            case "confluence_upload_attachment": {
                const result = await attachmentUseCases.uploadAttachment({
                    pageId: args.pageId,
                    filePath: args.filePath,
                    filename: args.filename,
                    contentBase64: args.contentBase64,
                    comment: args.comment,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_get_page_attachments": {
                const result = await attachmentUseCases.getPageAttachments({
                    pageId: args.pageId,
                    limit: args.limit,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            // Comments
            case "confluence_add_comment": {
                const result = await commentUseCases.addComment({
                    pageId: args.pageId,
                    content: args.content,
                    parentCommentId: args.parentCommentId,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_get_page_comments": {
                const result = await commentUseCases.getPageComments({
                    pageId: args.pageId,
                    limit: args.limit,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            // Permissions
            case "confluence_set_page_restriction": {
                const result = await permissionUseCases.setPageRestriction({
                    pageId: args.pageId,
                    restrictionType: args.restrictionType,
                    username: args.username,
                });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            case "confluence_publish_complete": {
                const result = await publishCompleteUseCase.execute({
                    pageId: args.pageId,
                    space: args.space,
                    title: args.title,
                    markdown: args.markdown,
                    parentId: args.parentId,
                    basePath: args.basePath,
                    mermaidTheme: args.mermaidTheme || 'default'
                });
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify(result, null, 2)
                        }]
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        if (error instanceof ConfluenceError) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
        throw error;
    }
}
//# sourceMappingURL=handlers.js.map