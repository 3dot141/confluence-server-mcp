// src/domain/markdown/index.ts
// Re-export AST converter as the primary converter
export { ASTMarkdownToConfluenceConverter } from './ast-converter.js';
export type { ASTConverterOptions, ASTConverterResult } from './ast-converter.js';

// Macros
export {
  escapeXml,
  escapeXmlAttr,
  codeMacro,
  info,
  warning,
  tip,
  note,
  tocMacro,
  table
} from './macros.js';

// Image processor (legacy support)
export { extractImagesFromMarkdown } from './image-processor.js';

// Extractor with explicit naming to avoid conflicts
export {
  MarkdownImageExtractor,
  type ExtractedImage as MarkdownExtractorImage,
  type ExtractionResult as MarkdownExtractionResult
} from './extractor.js';

// Types
export type {
  ImageMapping,
  MarkdownConverterOptions,
  PublishMarkdownRequest,
  PublishResult
} from './types.js';
