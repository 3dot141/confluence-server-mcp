// Markdown to Confluence Types

export interface ExtractedImage {
  originalPath: string;
  absolutePath: string;
  altText: string;
  isBase64: boolean;
}

export interface ImageMapping {
  [originalPath: string]: string;
}

export interface MarkdownConverterOptions {
  addTocMacro?: boolean;
  imageMapping?: ImageMapping;
  basePath?: string;
}

export interface ConversionResult {
  storageFormat: string;
  title?: string;
}

export interface PublishRequest {
  markdown: string;
  space: string;
  title?: string;
  pageId?: string;
  parentId?: string;
  updateIfExists?: boolean;
  basePath?: string;
}

export interface PublishResult {
  success: boolean;
  pageId: string;
  title: string;
  url: string;
  version: number;
  operation: 'created' | 'updated';
  attachmentsUploaded: number;
}

export interface MermaidOptions {
  outputDir?: string;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  backgroundColor?: string;
  puppeteerConfig?: string;
}

export interface ProcessedMermaid {
  markdown: string;
  imagePaths: string[];
}
