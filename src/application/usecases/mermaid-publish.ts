import { MermaidExtractor, MermaidRenderer } from '../../domain/mermaid/index.js';
import { confluenceRepository } from '../../domain/confluence/repository.js';
import {
  ProcessMermaidDiagramsRequestDto,
  ProcessMermaidDiagramsResponseDto
} from '../dto/mermaid-requests.js';

export class MermaidPublishUseCase {
  private extractor: MermaidExtractor;
  private renderer: MermaidRenderer;

  constructor() {
    this.extractor = new MermaidExtractor();
    this.renderer = new MermaidRenderer();
  }

  async process(request: ProcessMermaidDiagramsRequestDto): Promise<ProcessMermaidDiagramsResponseDto> {
    const diagrams = this.extractor.extract(request.markdown);

    if (diagrams.length === 0) {
      return {
        processedMarkdown: request.markdown,
        results: [],
        totalDiagrams: 0,
        successCount: 0,
        failedCount: 0
      };
    }

    const results: ProcessMermaidDiagramsResponseDto['results'] = [];
    let processedMarkdown = request.markdown;
    const sortedDiagrams = [...diagrams].sort((a, b) => b.position.start - a.position.start);

    for (const diagram of sortedDiagrams) {
      try {
        const renderResult = await this.renderer.render(diagram.source, {
          id: diagram.id,
          theme: request.theme,
          bgColor: request.bgColor
        });

        if (!renderResult.success || !renderResult.imageBuffer) {
          results.push({
            diagramId: diagram.id,
            success: false,
            error: renderResult.error || 'Unknown error'
          });
          continue;
        }

        const imageFileName = `mermaid-diagram-${diagram.id}.png`;
        const imageBuffer = Buffer.from(renderResult.imageBuffer);

        const imageAttachment = await confluenceRepository.uploadAttachmentFromBase64(
          request.pageId,
          imageBuffer.toString('base64'),
          imageFileName,
          `Mermaid diagram ${diagram.id}`
        );

        const sourceFileName = `mermaid-diagram-${diagram.id}.mmd`;
        const sourceAttachment = await confluenceRepository.uploadAttachmentFromBase64(
          request.pageId,
          Buffer.from(diagram.source).toString('base64'),
          sourceFileName,
          `Source code for Mermaid diagram ${diagram.id}`
        );

        const imageHtml = `<ac:image><ri:attachment ri:filename="${imageFileName}" /></ac:image>`;
        processedMarkdown =
          processedMarkdown.substring(0, diagram.position.start) +
          imageHtml +
          processedMarkdown.substring(diagram.position.end);

        results.push({
          diagramId: diagram.id,
          success: true,
          imageAttachmentId: imageAttachment.id,
          sourceAttachmentId: sourceAttachment.id
        });
      } catch (error) {
        results.push({
          diagramId: diagram.id,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    return {
      processedMarkdown,
      results: results.reverse(),
      totalDiagrams: diagrams.length,
      successCount,
      failedCount
    };
  }
}

export const mermaidPublishUseCase = new MermaidPublishUseCase();
