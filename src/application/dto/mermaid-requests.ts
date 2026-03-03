// src/application/dto/mermaid-requests.ts
export interface ProcessMermaidDiagramsRequestDto {
  pageId: string;
  markdown: string;
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
  bgColor?: string;
}

export interface ProcessMermaidDiagramsResponseDto {
  processedMarkdown: string;
  results: Array<{
    diagramId: number;
    success: boolean;
    imageAttachmentId?: string;
    sourceAttachmentId?: string;
    error?: string;
  }>;
  totalDiagrams: number;
  successCount: number;
  failedCount: number;
}
