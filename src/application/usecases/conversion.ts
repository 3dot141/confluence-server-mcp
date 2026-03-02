// src/application/usecases/conversion.ts
import { 
  MarkdownToConfluenceConverter, 
  MarkdownImageExtractor,
  ConversionResult,
  ExtractionResult 
} from '../../domain/markdown/index.js';

export interface ConvertMarkdownInput {
  markdown: string;
  addToc?: boolean;
  imageMapping?: Record<string, string>;
  basePath?: string;
}

export interface ConvertMarkdownOutput {
  storageFormat: string;
  extractedImages: Array<{
    alt: string;
    src: string;
    absolutePath: string;
    type: 'local' | 'url';
  }>;
  title?: string;
}

export interface ExtractImagesInput {
  markdown: string;
  basePath?: string;
}

export class ConversionUseCases {
  convertMarkdownToStorage(input: ConvertMarkdownInput): ConvertMarkdownOutput {
    const converter = new MarkdownToConfluenceConverter({
      addTocMacro: input.addToc ?? true,
      imageMapping: input.imageMapping || {},
      basePath: input.basePath
    });
    
    const result = converter.convertWithMetadata(input.markdown);
    
    return {
      storageFormat: result.storageFormat,
      extractedImages: result.extractedImages.map(img => ({
        alt: img.alt,
        src: img.src,
        absolutePath: img.absolutePath || img.src,
        type: img.type
      })),
      title: result.title
    };
  }

  extractImagesFromMarkdown(input: ExtractImagesInput): ExtractionResult {
    const extractor = new MarkdownImageExtractor(input.basePath);
    return extractor.extract(input.markdown);
  }
}

export const conversionUseCases = new ConversionUseCases();
