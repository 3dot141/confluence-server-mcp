// src/application/usecases/publish.ts
import path from "node:path";
import { confluenceRepository } from "../../domain/confluence/repository.js";
import {
  MarkdownToConfluenceConverter,
  extractImagesFromMarkdown,
} from "../../domain/markdown/index.js";
import { config } from "../../infrastructure/config.js";
import { PublishMarkdownRequestDto } from "../dto/requests.js";
import { PublishMarkdownResponse } from "../dto/responses.js";
import { ValidationError } from "../../infrastructure/errors.js";

export class PublishUseCases {
  async publishMarkdown(dto: PublishMarkdownRequestDto): Promise<PublishMarkdownResponse> {
    // 1. Extract front matter title if not provided
    let title = dto.title;
    if (!title) {
      title = this.extractTitleFromMarkdown(dto.markdown);
    }

    // 2. Extract images
    const images = extractImagesFromMarkdown(dto.markdown, dto.basePath);

    // 3. Check if page exists
    let pageId = dto.pageId;
    let existingVersion = 0;

    if (!pageId && dto.updateIfExists !== false) {
      const searchResults = await confluenceRepository.searchPages(title, dto.space);
      const existing = searchResults.find(p => p.title === title);
      if (existing) {
        pageId = existing.id;
        const page = await confluenceRepository.getPageById(pageId);
        existingVersion = page.version.number;
      }
    } else if (pageId) {
      const page = await confluenceRepository.getPageById(pageId);
      existingVersion = page.version.number;
    }

    // 4. Create page first if needed (to get pageId for attachments)
    let page;
    let operation: "created" | "updated";

    if (!pageId) {
      // Create new page first
      page = await confluenceRepository.createPage({
        space: dto.space,
        title,
        content: "", // Empty initially
        parentId: dto.parentId,
      });
      pageId = page.id;
      operation = "created";
    } else {
      operation = "updated";
    }

    // 5. Upload images
    const imageMapping: { [key: string]: string } = {};
    for (const image of images) {
      if (!image.isBase64) {
        try {
          await confluenceRepository.uploadAttachment(
            pageId,
            image.absolutePath
          );
          // Use the filename from the path as the mapping value
          // This matches what Confluence uses as the attachment name
          const filename = path.basename(image.originalPath);
          imageMapping[image.originalPath] = filename;
        } catch (error) {
          // Log error but continue with other images
          console.error(`Failed to upload image ${image.originalPath}:`, error);
          // Fallback: use original filename - Confluence may still resolve it
          imageMapping[image.originalPath] = path.basename(image.originalPath);
        }
      }
    }

    // 6. Convert markdown with TOC macro
    const converter = new MarkdownToConfluenceConverter({
      addTocMacro: true,
      imageMapping,
      basePath: dto.basePath,
    });
    const content = converter.convert(dto.markdown);

    // 7. Update page with content
    if (operation === "updated") {
      page = await confluenceRepository.updatePage({
        pageId,
        title,
        content,
        version: existingVersion + 1,
      });
    } else {
      // Update the empty page with content
      page = await confluenceRepository.updatePage({
        pageId,
        title,
        content,
        version: 2, // Initial version is 1
      });
    }

    return {
      success: true,
      pageId: page.id,
      title: page.title,
      url: `${config.baseUrl}/pages/viewpage.action?pageId=${page.id}`,
      version: page.version.number,
      operation,
      attachmentsUploaded: images.length,
    };
  }

  private extractTitleFromMarkdown(markdown: string): string {
    // Try front matter
    const frontMatterMatch = markdown.match(/^---\n[\s\S]*?title:\s*(.+?)\n[\s\S]*?---/);
    if (frontMatterMatch) {
      return frontMatterMatch[1].trim();
    }

    // Try H1
    const h1Match = markdown.match(/^#\s*(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    return "Untitled";
  }
}

export const publishUseCases = new PublishUseCases();
