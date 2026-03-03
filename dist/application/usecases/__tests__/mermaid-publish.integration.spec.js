import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MermaidPublishUseCase } from '../mermaid-publish.js';
import { confluenceRepository } from '../../../domain/confluence/repository.js';
vi.mock('../../../domain/confluence/repository.js', () => ({
    confluenceRepository: {
        uploadAttachmentFromBase64: vi.fn()
    }
}));
describe('MermaidPublishUseCase Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should process single diagram successfully', async () => {
        const mockUpload = vi.mocked(confluenceRepository.uploadAttachmentFromBase64);
        mockUpload
            .mockResolvedValueOnce({ id: 'img-123', title: 'mermaid-diagram-1.png' })
            .mockResolvedValueOnce({ id: 'src-123', title: 'mermaid-diagram-1.mmd' });
        const useCase = new MermaidPublishUseCase();
        const result = await useCase.process({
            pageId: 'page-123',
            markdown: `# Test\n\n\`\`\`mermaid\ngraph TD\n  A --> B\n\`\`\`\n`
        });
        expect(result.totalDiagrams).toBe(1);
        expect(result.successCount).toBe(1);
        expect(result.failedCount).toBe(0);
        expect(result.processedMarkdown).toContain('<ac:image>');
        expect(mockUpload).toHaveBeenCalledTimes(2);
    });
    it('should handle mixed success and failure', async () => {
        const mockUpload = vi.mocked(confluenceRepository.uploadAttachmentFromBase64);
        mockUpload
            .mockResolvedValueOnce({ id: 'img-1', title: 'mermaid-diagram-1.png' })
            .mockResolvedValueOnce({ id: 'src-1', title: 'mermaid-diagram-1.mmd' });
        const useCase = new MermaidPublishUseCase();
        const result = await useCase.process({
            pageId: 'page-123',
            markdown: `# Test

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

\`\`\`mermaid
invalid syntax!!!
\`\`\`
`
        });
        expect(result.totalDiagrams).toBe(2);
        expect(result.successCount).toBe(1);
        expect(result.failedCount).toBe(1);
    });
    it('should preserve original code block on failure', async () => {
        const useCase = new MermaidPublishUseCase();
        const markdown = `# Test

\`\`\`mermaid
invalid!!!
\`\`\`
`;
        const result = await useCase.process({
            pageId: 'page-123',
            markdown
        });
        expect(result.failedCount).toBe(1);
        expect(result.processedMarkdown).toContain('```mermaid');
    });
});
//# sourceMappingURL=mermaid-publish.integration.spec.js.map