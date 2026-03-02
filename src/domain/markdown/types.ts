// src/domain/markdown/types.ts

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

export interface PublishMarkdownRequest {
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
  operation: "created" | "updated";
  attachmentsUploaded: number;
}
