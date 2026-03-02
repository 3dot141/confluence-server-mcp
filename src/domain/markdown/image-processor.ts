// src/domain/markdown/image-processor.ts
import * as path from "path";
import { ExtractedImage } from "./types.js";

export function extractImagesFromMarkdown(
  markdown: string,
  basePath: string = process.cwd()
): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const seen = new Set<string>();

  // Markdown format: ![alt](path)
  const markdownPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownPattern.exec(markdown)) !== null) {
    const originalPath = match[2];
    if (!seen.has(originalPath)) {
      seen.add(originalPath);
      images.push({
        originalPath,
        absolutePath: path.resolve(basePath, originalPath),
        altText: match[1],
        isBase64: originalPath.startsWith("data:")
      });
    }
  }

  // HTML format: <img src="path" />
  const htmlPattern = /<img[^\u003e]+src=["']([^"']+)["'][^\u003e]*>/gi;
  while ((match = htmlPattern.exec(markdown)) !== null) {
    const originalPath = match[1];
    if (!seen.has(originalPath)) {
      seen.add(originalPath);
      const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
      images.push({
        originalPath,
        absolutePath: path.resolve(basePath, originalPath),
        altText: altMatch ? altMatch[1] : "",
        isBase64: originalPath.startsWith("data:")
      });
    }
  }

  return images;
}
