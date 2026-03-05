import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublishCompleteUseCase } from '../publish-complete.js';
import { MermaidRenderer } from '../../../domain/mermaid/renderer.js';

const PNG_BUFFER = Uint8Array.from([137, 80, 78, 71]).buffer;
const { repositoryMock } = vi.hoisted(() => ({
  repositoryMock: {
    searchPages: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    uploadAttachmentFromBase64: vi.fn(),
    getPageById: vi.fn(),
  },
}));

vi.mock('../../../domain/confluence/repository.js', () => ({
  confluenceRepository: repositoryMock,
}));

function setupRepositorySpies() {
  repositoryMock.searchPages.mockResolvedValue([]);
  repositoryMock.createPage.mockResolvedValue({
    id: '1001',
    title: 'Test Page',
    version: { number: 1 },
  } as any);

  repositoryMock.uploadAttachmentFromBase64.mockResolvedValue({} as any);

  repositoryMock.updatePage.mockImplementation(async (request: any) => ({
      id: request.pageId,
      title: request.title,
      version: { number: request.version },
  }));

  return {
    uploadAttachmentSpy: repositoryMock.uploadAttachmentFromBase64,
    updatePageSpy: repositoryMock.updatePage,
  };
}

describe('PublishCompleteUseCase mermaid handling', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders mermaid and replaces code block with uploaded attachment', async () => {
    const { uploadAttachmentSpy, updatePageSpy } = setupRepositorySpies();
    const renderSpy = vi.spyOn(MermaidRenderer.prototype, 'render').mockResolvedValue({
      id: 0,
      source: 'graph TD\nA-->B',
      success: true,
      imageBuffer: PNG_BUFFER,
    });

    const useCase = new PublishCompleteUseCase();
    const result = await useCase.execute({
      space: 'DEMO',
      title: 'Test Page',
      markdown: '```mermaid\ngraph TD\nA-->B\n```',
      mermaidTheme: 'forest',
    });

    expect(result.success).toBe(true);
    expect(result.mermaidsRendered).toBe(1);
    expect(renderSpy).toHaveBeenCalledWith('graph TD\nA-->B', { id: 0, theme: 'forest' });
    expect(uploadAttachmentSpy).toHaveBeenCalledTimes(1);
    expect(uploadAttachmentSpy).toHaveBeenCalledWith(
      '1001',
      expect.any(String),
      'mermaid-diagram-0.png'
    );

    const updateRequest = updatePageSpy.mock.calls[0]?.[0] as any;
    expect(updateRequest.content).toContain('ri:filename="mermaid-diagram-0.png"');
    expect(updateRequest.content).not.toContain('graph TD\nA--&gt;B');
  });

  it('keeps distinct attachments for duplicate mermaid blocks', async () => {
    const { uploadAttachmentSpy, updatePageSpy } = setupRepositorySpies();
    vi.spyOn(MermaidRenderer.prototype, 'render').mockImplementation(
      async (source, options) => ({
        id: options.id,
        source,
        success: true,
        imageBuffer: PNG_BUFFER,
      })
    );

    const useCase = new PublishCompleteUseCase();
    const result = await useCase.execute({
      space: 'DEMO',
      title: 'Test Page',
      markdown: [
        '```mermaid',
        'graph TD',
        'A-->B',
        '```',
        '',
        '```mermaid',
        'graph TD',
        'A-->B',
        '```',
      ].join('\n'),
    });

    expect(result.success).toBe(true);
    expect(result.mermaidsRendered).toBe(2);
    expect(uploadAttachmentSpy).toHaveBeenCalledTimes(2);

    const updateRequest = updatePageSpy.mock.calls[0]?.[0] as any;
    expect(updateRequest.content).toContain('ri:filename="mermaid-diagram-0.png"');
    expect(updateRequest.content).toContain('ri:filename="mermaid-diagram-1.png"');
  });

  it('preserves code block when mermaid rendering fails', async () => {
    const { uploadAttachmentSpy, updatePageSpy } = setupRepositorySpies();
    vi.spyOn(MermaidRenderer.prototype, 'render').mockResolvedValue({
      id: 0,
      source: 'graph TD\nA-->B',
      success: false,
      error: 'render failed',
    });

    const useCase = new PublishCompleteUseCase();
    const result = await useCase.execute({
      space: 'DEMO',
      title: 'Test Page',
      markdown: '```mermaid\ngraph TD\nA-->B\n```',
    });

    expect(result.success).toBe(true);
    expect(result.mermaidsRendered).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(uploadAttachmentSpy).not.toHaveBeenCalled();

    const updateRequest = updatePageSpy.mock.calls[0]?.[0] as any;
    expect(updateRequest.content).toContain('ac:structured-macro ac:name="code"');
    expect(updateRequest.content).toContain('graph TD\nA-->B');
    expect(updateRequest.content).not.toContain('ri:filename="mermaid-diagram-0.png"');
  });

  it('sanitizes title and markdown emojis during publish', async () => {
    const { updatePageSpy } = setupRepositorySpies();
    vi.spyOn(MermaidRenderer.prototype, 'render').mockResolvedValue({
      id: 0,
      source: 'graph TD\nA-->B',
      success: true,
      imageBuffer: PNG_BUFFER,
    });

    const useCase = new PublishCompleteUseCase();
    const result = await useCase.execute({
      space: 'DEMO',
      title: '🚀 Test :rocket: Page',
      markdown: [
        '发布 🎉 成功 :rocket:',
        '',
        '```js',
        'console.log("ok 😀 :rocket:");',
        '```',
      ].join('\n'),
    });

    expect(result.success).toBe(true);
    const updateRequest = updatePageSpy.mock.calls[0]?.[0] as any;
    expect(updateRequest.title).toBe('Test Page');
    expect(updateRequest.content).not.toContain('🎉');
    expect(updateRequest.content).not.toContain('😀');
    expect(updateRequest.content).not.toContain(':rocket:');
  });
});
