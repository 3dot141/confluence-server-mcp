// src/presentation/mcp/tools/handlers.ts
import {
  spaceUseCases,
  pageUseCases,
  attachmentUseCases,
  commentUseCases,
  permissionUseCases,
  conversionUseCases,
} from "../../../application/usecases/index.js";
import { codeMacro } from "../../../domain/markdown/macros.js";
import { ConfluenceError } from "../../../infrastructure/errors.js";

export async function handleToolCall(name: string, args: Record<string, unknown>) {
  try {
    switch (name) {
      // Spaces
      case "confluence_list_spaces": {
        const result = await spaceUseCases.listSpaces({
          type: (args.type as "global" | "personal") || "global"
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Pages
      case "confluence_create_page": {
        const result = await pageUseCases.createPage({
          space: args.space as string,
          title: args.title as string,
          content: args.content as string,
          parentId: args.parentId as string | undefined,
          parentTitle: args.parentTitle as string | undefined,
          atRoot: args.atRoot as boolean | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_update_page": {
        const result = await pageUseCases.updatePage({
          pageId: args.pageId as string | undefined,
          space: args.space as string | undefined,
          title: args.title as string | undefined,
          content: args.content as string,
          newTitle: args.newTitle as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_upsert_page": {
        const result = await pageUseCases.upsertPage({
          space: args.space as string,
          title: args.title as string,
          content: args.content as string,
          parentId: args.parentId as string | undefined,
          parentTitle: args.parentTitle as string | undefined,
          atRoot: args.atRoot as boolean | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_get_page": {
        const result = await pageUseCases.getPage({
          pageId: args.pageId as string | undefined,
          space: args.space as string | undefined,
          title: args.title as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_delete_page": {
        const result = await pageUseCases.deletePage({
          pageId: args.pageId as string,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_search_pages": {
        const result = await pageUseCases.searchPages({
          query: args.query as string,
          space: args.space as string | undefined,
          limit: args.limit as number | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_get_child_pages": {
        const result = await pageUseCases.getChildPages({
          parentId: args.parentId as string,
          limit: args.limit as number | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_get_page_history": {
        const result = await pageUseCases.getPageHistory({
          pageId: args.pageId as string,
          limit: args.limit as number | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Attachments
      case "confluence_upload_attachment": {
        const result = await attachmentUseCases.uploadAttachment({
          pageId: args.pageId as string,
          filePath: args.filePath as string | undefined,
          filename: args.filename as string | undefined,
          contentBase64: args.contentBase64 as string | undefined,
          comment: args.comment as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_get_page_attachments": {
        const result = await attachmentUseCases.getPageAttachments({
          pageId: args.pageId as string,
          limit: args.limit as number | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Comments
      case "confluence_add_comment": {
        const result = await commentUseCases.addComment({
          pageId: args.pageId as string,
          content: args.content as string,
          parentCommentId: args.parentCommentId as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "confluence_get_page_comments": {
        const result = await commentUseCases.getPageComments({
          pageId: args.pageId as string,
          limit: args.limit as number | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Permissions
      case "confluence_set_page_restriction": {
        const result = await permissionUseCases.setPageRestriction({
          pageId: args.pageId as string,
          restrictionType: args.restrictionType as "none" | "edit_only" | "view_only",
          username: args.username as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Conversion tools
      case "confluence_convert_markdown_to_storage": {
        const result = conversionUseCases.convertMarkdownToStorage({
          markdown: args.markdown as string,
          addToc: args.addToc as boolean | undefined,
          imageMapping: args.imageMapping as Record<string, string> | undefined,
          basePath: args.basePath as string | undefined
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      // Code macro
      case "confluence_build_code_macro": {
        const macro = codeMacro(
          args.code as string,
          args.language as string | undefined
        );
        return { content: [{ type: "text", text: macro }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof ConfluenceError) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
    throw error;
  }
}
