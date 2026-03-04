// src/application/usecases/publish.ts
import path from "node:path";
import { confluenceRepository } from "../../domain/confluence/repository.js";
import { ASTMarkdownToConfluenceConverter } from "../../domain/markdown/ast-converter.js";
import { RemarkMarkdownParser } from "../../infrastructure/markdown/remark-parser.js";
import { config } from "../../infrastructure/config.js";
import { logger } from "../../infrastructure/logger.js";
/**
 * Unified publish use case using AST-based converter
 * Now a thin wrapper around publish-complete with legacy interface
 */
export class PublishUseCases {
    async publishMarkdown(dto) {
        // 1. Extract front matter title if not provided
        let title = dto.title;
        if (!title) {
            title = this.extractTitleFromMarkdown(dto.markdown);
        }
        // 2. Check if page exists
        let pageId = dto.pageId;
        let existingVersion = 0;
        if (!pageId && dto.updateIfExists !== false) {
            const searchResults = await confluenceRepository.searchPages(title, dto.space);
            const existing = searchResults.find(p => p.title === title);
            if (existing) {
                pageId = existing.id;
                const page = await confluenceRepository.getPageById(pageId);
                existingVersion = page.version.number;
            }
        }
        else if (pageId) {
            const page = await confluenceRepository.getPageById(pageId);
            existingVersion = page.version.number;
        }
        // 3. Create page first if needed (to get pageId for attachments)
        let page;
        let operation;
        if (!pageId) {
            page = await confluenceRepository.createPage({
                space: dto.space,
                title,
                content: "",
                parentId: dto.parentId,
            });
            pageId = page.id;
            operation = "created";
        }
        else {
            operation = "updated";
        }
        // 4. Parse and extract resources using AST parser
        const parser = new RemarkMarkdownParser();
        const ast = parser.parse(dto.markdown);
        const resources = parser.extractResources(ast);
        // 5. Upload images
        const imageMapping = {};
        let attachmentsUploaded = 0;
        for (const image of resources.images) {
            if (image.isLocal) {
                try {
                    const fullPath = dto.basePath ? path.join(dto.basePath, image.src) : image.src;
                    await confluenceRepository.uploadAttachment(pageId, fullPath);
                    const filename = path.basename(image.src);
                    imageMapping[image.src] = filename;
                    attachmentsUploaded++;
                }
                catch (error) {
                    logger.error(`Failed to upload image ${image.src}:`, error);
                    imageMapping[image.src] = path.basename(image.src);
                }
            }
            else {
                // Remote images use original URL
                imageMapping[image.src] = image.src;
            }
        }
        // 6. Convert markdown using AST converter
        const converter = new ASTMarkdownToConfluenceConverter({
            addTocMacro: true,
            imageMapping,
            basePath: dto.basePath,
        });
        const content = converter.convert(dto.markdown);
        // 7. Update page with content
        const version = operation === "updated" ? existingVersion + 1 : 2;
        page = await confluenceRepository.updatePage({
            pageId,
            title,
            content,
            version,
        });
        return {
            success: true,
            pageId: page.id,
            title: page.title,
            url: `${config.baseUrl}/pages/viewpage.action?pageId=${page.id}`,
            version: page.version.number,
            operation,
            attachmentsUploaded,
        };
    }
    extractTitleFromMarkdown(markdown) {
        const parser = new RemarkMarkdownParser();
        return parser.extractTitle(markdown) || "Untitled";
    }
}
export const publishUseCases = new PublishUseCases();
//# sourceMappingURL=publish.js.map