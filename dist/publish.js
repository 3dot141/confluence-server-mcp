// src/publish.ts
import path from 'node:path';
import { RemarkMarkdownParser } from './markdown/parser.js';
import { ASTMarkdownToConfluenceConverter } from './markdown/converter.js';
import { ConfluenceApi } from './confluence-api.js';
import { MermaidRenderer } from './markdown/mermaid.js';
import { logger } from './logger.js';
export class PublishCompleteUseCase {
    parser = new RemarkMarkdownParser();
    converter;
    mermaidRenderer = new MermaidRenderer();
    api = new ConfluenceApi();
    constructor() {
        this.converter = new ASTMarkdownToConfluenceConverter({
            addTocMacro: true,
        });
    }
    async execute(input) {
        const errors = [];
        const sanitizedTitle = this.sanitizeTitle(input.title);
        if (!sanitizedTitle) {
            throw new Error('Title is empty after removing emojis. Please provide a non-emoji title.');
        }
        logger.info('Starting publish', { title: sanitizedTitle, space: input.space });
        // 1. Preprocess markdown
        let markdown = input.markdown;
        markdown = this.parser.preprocessObsidianSyntax(markdown);
        markdown = this.parser.preprocessBlockquoteMarkers(markdown);
        markdown = this.parser.stripYamlFrontmatter(markdown);
        // 2. Parse AST and extract resources
        const ast = this.parser.parse(markdown);
        const resources = this.parser.extractResources(ast);
        logger.debug('Extracted resources', {
            images: resources.images.length,
            mermaids: resources.mermaids.length,
        });
        // 3. Get or create page
        let pageId = input.pageId;
        let operation;
        let existingVersion = 0;
        if (!pageId) {
            const searchResults = await this.api.searchPages(sanitizedTitle, input.space);
            const existing = searchResults.find((p) => p.title === sanitizedTitle);
            if (existing) {
                pageId = existing.id;
                const page = await this.api.getPageById(pageId);
                existingVersion = page.version.number;
                operation = 'updated';
            }
            else {
                const newPage = await this.api.createPage({
                    space: input.space,
                    title: sanitizedTitle,
                    content: '',
                    parentId: input.parentId,
                });
                pageId = newPage.id;
                operation = 'created';
            }
        }
        else {
            const page = await this.api.getPageById(pageId);
            existingVersion = page.version.number;
            operation = 'updated';
        }
        // 4. Process mermaids
        const mermaidMap = await this.processMermaids(resources.mermaids, input.mermaidTheme || 'default', pageId, errors);
        // 5. Process images
        const imageMap = await this.processImages(resources.images, pageId, input.basePath, errors);
        logger.debug('Resources processed', {
            imagesUploaded: imageMap.size,
            mermaidsRendered: mermaidMap.size,
        });
        // 6. Convert markdown to Confluence with resource mappings
        const { storageFormat } = await this.converter.convertAsync(markdown, imageMap, mermaidMap);
        // 7. Update page with final content
        const version = operation === 'created' ? 2 : existingVersion + 1;
        const updatedPage = await this.api.updatePage({
            pageId,
            title: sanitizedTitle,
            content: storageFormat,
            version,
        });
        logger.info('Page updated', { pageId, version: updatedPage.version.number });
        // 8. Build result
        const baseUrl = process.env.CONF_BASE_URL || '';
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
    sanitizeTitle(title) {
        return this.parser.stripEmojis(title).replace(/\s+/g, ' ').trim();
    }
    async processImages(images, pageId, basePath, errors = []) {
        if (images.length === 0) {
            return new Map();
        }
        const results = new Map();
        const batchSize = 5;
        const localImages = images.filter((img) => img.isLocal);
        for (let i = 0; i < localImages.length; i += batchSize) {
            const batch = localImages.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (img) => {
                try {
                    const fullPath = basePath ? path.join(basePath, img.src) : img.src;
                    const fs = await import('node:fs');
                    const buffer = fs.readFileSync(fullPath);
                    const filename = path.basename(img.src);
                    await this.api.uploadAttachmentFromBase64(pageId, buffer.toString('base64'), filename);
                    return { placeholder: img.src, filename };
                }
                catch (error) {
                    const message = `Failed to upload image ${img.src}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    errors.push(message);
                    return { placeholder: img.src, filename: path.basename(img.src) };
                }
            }));
            batchResults.forEach(({ placeholder, filename }) => {
                results.set(placeholder, filename);
            });
        }
        images
            .filter((img) => !img.isLocal)
            .forEach((img) => {
            results.set(img.src, img.src);
        });
        return results;
    }
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
                    await this.api.uploadAttachmentFromBase64(pageId, buffer.toString('base64'), filename);
                    return {
                        placeholder: mermaid.placeholder,
                        filename,
                    };
                }
                catch (error) {
                    const message = `Failed to render mermaid: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    errors.push(message);
                    return { placeholder: mermaid.placeholder, filename: '' };
                }
            }));
            batchResults.forEach(({ placeholder, filename }) => {
                if (filename) {
                    results.set(placeholder, filename);
                }
            });
        }
        return results;
    }
}
//# sourceMappingURL=publish.js.map