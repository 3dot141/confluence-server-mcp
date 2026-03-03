// Confluence Publisher
import * as path from 'node:path';
import { ConfluenceClient } from '../../confluence-client/scripts/confluence-client.js';
import { MarkdownToConfluenceConverter } from './converter.js';
import { extractImagesFromMarkdown, extractTitleFromMarkdown } from './extractor.js';
import { PublishRequest, PublishResult, ImageMapping } from './types.js';

export class ConfluencePublisher {
  private client: ConfluenceClient;

  constructor(client: ConfluenceClient) {
    this.client = client;
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const { markdown, space, basePath = process.cwd() } = request;

    // 1. Extract title
    let title = request.title;
    if (!title) {
      title = extractTitleFromMarkdown(markdown);
      if (!title) {
        title = 'Untitled';
      }
    }

    // 2. Extract images
    const images = extractImagesFromMarkdown(markdown, basePath);

    // 3. Check if page exists
    let pageId = request.pageId;
    let existingVersion = 0;

    if (!pageId && request.updateIfExists !== false) {
      const searchResults = await this.client.searchPages(title, space);
      const existing = searchResults.find(p => p.title === title);
      if (existing) {
        pageId = existing.id;
        const page = await this.client.getPageById(pageId);
        existingVersion = page.version.number;
      }
    } else if (pageId) {
      const page = await this.client.getPageById(pageId);
      existingVersion = page.version.number;
    }

    // 4. Create page first if needed
    let page;
    let operation: 'created' | 'updated';

    if (!pageId) {
      page = await this.client.createPage({
        space,
        title,
        content: '', // Empty initially
        parentId: request.parentId
      });
      pageId = page.id;
      operation = 'created';
    } else {
      operation = 'updated';
    }

    // 5. Upload images and build mapping
    const imageMapping: ImageMapping = {};
    let uploadedCount = 0;

    for (const image of images) {
      if (!image.isBase64) {
        try {
          await this.client.uploadAttachment(pageId, image.absolutePath);
          const filename = path.basename(image.originalPath);
          imageMapping[image.originalPath] = filename;
          uploadedCount++;
        } catch (error) {
          console.error(`Failed to upload image ${image.originalPath}:`, error);
          imageMapping[image.originalPath] = path.basename(image.originalPath);
        }
      }
    }

    // 6. Convert markdown
    const converter = new MarkdownToConfluenceConverter({
      addTocMacro: true,
      imageMapping,
      basePath
    });
    const content = converter.convert(markdown);

    // 7. Update page with content
    if (operation === 'updated') {
      page = await this.client.updatePage({
        pageId,
        title,
        content,
        version: existingVersion + 1
      });
    } else {
      page = await this.client.updatePage({
        pageId,
        title,
        content,
        version: 2
      });
    }

    return {
      success: true,
      pageId: page.id,
      title: page.title,
      url: this.client.getPageUrl(page.id),
      version: page.version.number,
      operation,
      attachmentsUploaded: uploadedCount
    };
  }

  async publishMultiple(
    requests: PublishRequest[],
    options: { concurrency?: number } = {}
  ): Promise<Array<{ request: PublishRequest; result: PublishResult | Error }>> {
    const { concurrency = 3 } = options;
    const results: Array<{ request: PublishRequest; result: PublishResult | Error }> = [];

    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(req => this.publish(req))
      );

      batchResults.forEach((result, idx) => {
        results.push({
          request: batch[idx],
          result: result.status === 'fulfilled' ? result.value : result.reason
        });
      });
    }

    return results;
  }
}
