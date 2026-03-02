// src/application/usecases/conversion.ts
import { MarkdownToConfluenceConverter, MarkdownImageExtractor } from '../../domain/markdown/index.js';
export class ConversionUseCases {
    convertMarkdownToStorage(input) {
        const converter = new MarkdownToConfluenceConverter({
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
        const extractor = new MarkdownImageExtractor(input.basePath);
        return extractor.extract(input.markdown);
    }
}
export const conversionUseCases = new ConversionUseCases();
//# sourceMappingURL=conversion.js.map