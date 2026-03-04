// src/application/usecases/publish-complete.ts
import path from 'node:path';
import { RemarkMarkdownParser } from '../../infrastructure/markdown/remark-parser.js';
import { ASTMarkdownToConfluenceConverter } from '../../domain/markdown/ast-converter.js';
import { confluenceRepository } from '../../domain/confluence/repository.js';
import { MermaidRenderer } from '../../domain/mermaid/renderer.js';
import { logger } from '../../infrastructure/logger.js';
/**
 * Optimized publish use case with parallel resource processing
 */
export class PublishCompleteUseCase {
    parser = new RemarkMarkdownParser();
    converter;
    mermaidRenderer = new MermaidRenderer();
    constructor() {
        this.converter = new ASTMarkdownToConfluenceConverter({
            addTocMacro: true,
        });
    }
    async execute(input) {
        const errors = [];
        try {
            logger.info('Starting publish-complete', { title: input.title, space: input.space });
            // 1. Preprocess markdown (Obsidian syntax)
            let markdown = input.markdown;
            markdown = this.parser.preprocessObsidianSyntax(markdown);
            // 2. Parse AST and extract resources (single-pass)
            const ast = this.parser.parse(markdown);
            const resources = this.parser.extractResources(ast);
            logger.info('Extracted resources', {
                images: resources.images.length,
                mermaids: resources.mermaids.length,
                confluenceMacros: resources.confluenceMacros.length,
            });
            // 3. Get or create page (need pageId for attachments)
            let pageId = input.pageId;
            let operation;
            let existingVersion = 0;
            if (!pageId) {
                // Check if page exists by title
                const searchResults = await confluenceRepository.searchPages(input.title, input.space);
                const existing = searchResults.find((p) => p.title === input.title);
                if (existing) {
                    pageId = existing.id;
                    const page = await confluenceRepository.getPageById(pageId);
                    existingVersion = page.version.number;
                    operation = 'updated';
                    logger.info('Found existing page', { pageId, version: existingVersion });
                }
                else {
                    // Create empty page first
                    const newPage = await confluenceRepository.createPage({
                        space: input.space,
                        title: input.title,
                        content: '', // Empty initially
                        parentId: input.parentId,
                    });
                    pageId = newPage.id;
                    operation = 'created';
                    logger.info('Created new page', { pageId });
                }
            }
            else {
                const page = await confluenceRepository.getPageById(pageId);
                existingVersion = page.version.number;
                operation = 'updated';
            }
            // 4. Process mermaids first (need pageId for upload)
            const mermaidMap = await this.processMermaids(resources.mermaids, input.mermaidTheme || 'default', pageId, errors);
            // 5. Process images
            const imageMap = await this.processImages(resources.images, pageId, input.basePath, errors);
            logger.info('Resources processed', {
                imagesUploaded: imageMap.size,
                mermaidsRendered: mermaidMap.size,
            });
            // 6. Convert markdown to Confluence with resource mappings
            const { storageFormat } = await this.converter.convertAsync(markdown, imageMap, mermaidMap);
            // 7. Update page with final content
            const version = operation === 'created' ? 2 : existingVersion + 1;
            const updatedPage = await confluenceRepository.updatePage({
                pageId,
                title: input.title,
                content: storageFormat,
                version,
            });
            logger.info('Page updated successfully', { pageId, version });
            // 8. Build result
            const baseUrl = process.env.CONFLUENCE_BASE_URL || '';
            const url = `${baseUrl}/pages/viewpage.action?pageId=${pageId}`;
            return {
                success: true,
                pageId,
                title: updatedPage.title,
                url,
                version: updatedPage.version.number,
                operation,
                imagesUploaded: imageMap.size,
                mermaidsRendered: mermaidMap.size,
                errors,
            };
        }
        catch (error) {
            logger.error('Publish complete failed', error);
            throw error;
        }
    }
    /**
     * Process images in parallel batches
     */
    async processImages(images, pageId, basePath, errors = []) {
        if (images.length === 0) {
            return new Map();
        }
        const results = new Map();
        const batchSize = 5;
        // Filter only local images
        const localImages = images.filter((img) => img.isLocal);
        for (let i = 0; i < localImages.length; i += batchSize) {
            const batch = localImages.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (img) => {
                try {
                    const fullPath = basePath ? path.join(basePath, img.src) : img.src;
                    // Get the file content and upload as base64
                    const fs = await import('node:fs');
                    const buffer = fs.readFileSync(fullPath);
                    const filename = path.basename(img.src);
                    await confluenceRepository.uploadAttachmentFromBase64(pageId, buffer.toString('base64'), filename);
                    return { placeholder: img.src, filename };
                }
                catch (error) {
                    const message = `Failed to upload image ${img.src}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    logger.error(message);
                    errors.push(message);
                    return { placeholder: img.src, filename: path.basename(img.src) };
                }
            }));
            batchResults.forEach(({ placeholder, filename }) => {
                results.set(placeholder, filename);
            });
        }
        // Add remote images as-is
        images
            .filter((img) => !img.isLocal)
            .forEach((img) => {
            results.set(img.src, img.src);
        });
        return results;
    }
    /**
     * Process mermaid diagrams in parallel batches
     */
    async processMermaids(mermaids, theme, pageId, errors = []) {
        if (mermaids.length === 0) {
            return new Map();
        }
        const results = new Map();
        const batchSize = 3;
        for (let i = 0; i < mermaids.length; i += batchSize) {
            const batch = mermaids.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (mermaid, index) => {
                try {
                    const id = i + index;
                    const renderResult = await this.mermaidRenderer.render(mermaid.content, {
                        id,
                        theme: theme,
                    });
                    if (!renderResult.success || !renderResult.imageBuffer) {
                        throw new Error(renderResult.error || 'Render failed');
                    }
                    const filename = `mermaid-diagram-${id}.png`;
                    const buffer = Buffer.from(renderResult.imageBuffer);
                    // Upload to Confluence
                    await confluenceRepository.uploadAttachmentFromBase64(pageId, buffer.toString('base64'), filename);
                    return {
                        content: mermaid.content,
                        filename,
                    };
                }
                catch (error) {
                    const message = `Failed to render mermaid: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    logger.error(message);
                    errors.push(message);
                    return { content: mermaid.content, filename: '' };
                }
            }));
            batchResults.forEach(({ content, filename }) => {
                if (filename) {
                    results.set(content, filename);
                }
            });
        }
        return results;
    }
}
export const publishCompleteUseCase = new PublishCompleteUseCase();
//# sourceMappingURL=publish-complete.js.map