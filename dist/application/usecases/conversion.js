// src/application/usecases/conversion.ts
import { ASTMarkdownToConfluenceConverter } from '../../domain/markdown/ast-converter.js';
import { RemarkMarkdownParser } from '../../infrastructure/markdown/remark-parser.js';
/**
 * Unified conversion use cases using AST-based converter
 */
export class ConversionUseCases {
    convertMarkdownToStorage(input) {
        const converter = new ASTMarkdownToConfluenceConverter({
            addTocMacro: input.addToc ?? true,
            imageMapping: input.imageMapping || {},
            basePath: input.basePath
        });
        const result = converter.convertWithMetadata(input.markdown);
        return {
            storageFormat: result.storageFormat,
            title: result.title
        };
    }
    extractImagesFromMarkdown(input) {
        const parser = new RemarkMarkdownParser();
        const ast = parser.parse(input.markdown);
        const resources = parser.extractResources(ast);
        return {
            images: resources.images.map(img => ({
                src: img.src,
                isLocal: img.isLocal
            })),
            localCount: resources.images.filter(img => img.isLocal).length,
            urlCount: resources.images.filter(img => !img.isLocal).length
        };
    }
}
export const conversionUseCases = new ConversionUseCases();
//# sourceMappingURL=conversion.js.map