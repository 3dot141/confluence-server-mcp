// Image Extraction from Markdown
import * as path from 'node:path';
import * as fs from 'node:fs';
import { ExtractedImage } from './types.ts';

export function extractImagesFromMarkdown(
  markdown: string,
  basePath: string = process.cwd()
): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const processedPaths = new Set<string>();

  // Standard Markdown: ![alt](path)
  const standardRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;

  while ((match = standardRegex.exec(markdown)) !== null) {
    const [, altText, src] = match;

    if (processedPaths.has(src)) continue;
    processedPaths.add(src);

    if (src.startsWith('data:')) {
      images.push({
        originalPath: src,
        absolutePath: src,
        altText,
        isBase64: true
      });
    } else {
      const absolutePath = path.isAbsolute(src)
        ? src
        : path.resolve(basePath, src);

      if (fs.existsSync(absolutePath)) {
        images.push({
          originalPath: src,
          absolutePath,
          altText,
          isBase64: false
        });
      }
    }
  }

  // Obsidian format: ![[image.png]]
  const obsidianRegex = /!\[\[([^\]]+)\]\]/g;
  while ((match = obsidianRegex.exec(markdown)) !== null) {
    const [, src] = match;

    if (processedPaths.has(src)) continue;
    processedPaths.add(src);

    const absolutePath = path.isAbsolute(src)
      ? src
      : path.resolve(basePath, src);

    if (fs.existsSync(absolutePath)) {
      images.push({
        originalPath: src,
        absolutePath,
        altText: path.basename(src, path.extname(src)),
        isBase64: false
      });
    }
  }

  return images;
}

export function extractTitleFromMarkdown(markdown: string): string | undefined {
  // Try front matter first
  const frontMatterMatch = markdown.match(/^---\n[\s\S]*?title:\s*(.+?)\n[\s\S]*?---/);
  if (frontMatterMatch) {
    return frontMatterMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  // Try H1
  const h1Match = markdown.match(/^#\s*(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  return undefined;
}
