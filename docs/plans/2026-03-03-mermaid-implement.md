# Mermaid 图表改进实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 Mermaid 图表批量处理、源码保留附件、渲染失败回退功能

**架构:** 新增 MermaidExtractor、MermaidRenderer、MermaidPublisher 三个类，遵循分层架构原则。使用 @mermaid-js/mermaid-cli 进行本地渲染。

**Tech Stack:** TypeScript, Node.js, @mermaid-js/mermaid-cli, vitest

---

## 前置任务

### Task 0: 创建 feature 分支

```bash
git checkout -b feat/mermaid-batch-processing
```

---

## 第一阶段：Mermaid 提取器

### Task 1: MermaidExtractor - 基础结构

**Files:**
- Create: `src/domain/mermaid/extractor.ts`
- Test: `src/domain/mermaid/__tests__/extractor.spec.ts`

**Step 1: 编写失败测试**

```typescript
// src/domain/mermaid/__tests__/extractor.spec.ts
import { describe, it, expect } from 'vitest';
import { MermaidExtractor } from '../extractor.js';

describe('MermaidExtractor', () => {
  it('should extract single mermaid diagram', () => {
    const markdown = `
# Title

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`;
    const extractor = new MermaidExtractor();
    const result = extractor.extract(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].source).toBe('graph TD\n  A --> B');
  });
});
```

**Step 2: 运行测试确认失败**

```bash
npm test -- src/domain/mermaid/__tests__/extractor.spec.ts
```
Expected: FAIL with "MermaidExtractor not defined"

**Step 3: 最小实现**

```typescript
// src/domain/mermaid/extractor.ts
export interface ExtractedMermaid {
  id: number;
  source: string;
  position: {
    start: number;
    end: number;
  };
}

export class MermaidExtractor {
  extract(markdown: string): ExtractedMermaid[] {
    const diagrams: ExtractedMermaid[] = [];
    const pattern = /```mermaid\n([\s\S]*?)```/g;
    let match;
    let id = 1;

    while ((match = pattern.exec(markdown)) !== null) {
      diagrams.push({
        id: id++,
        source: match[1].trim(),
        position: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }

    return diagrams;
  }
}
```

**Step 4: 运行测试确认通过**

```bash
npm test -- src/domain/mermaid/__tests__/extractor.spec.ts
```
Expected: PASS

**Step 5: 提交**

```bash
git add src/domain/mermaid/
git commit -m "feat: add MermaidExtractor for extracting diagrams from markdown

- Extract mermaid code blocks with position info
- Auto-increment diagram IDs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: MermaidExtractor - 边界情况测试

**Files:**
- Modify: `src/domain/mermaid/__tests__/extractor.spec.ts`
- Modify: `src/domain/mermaid/extractor.ts`

**Step 1: 添加边界测试**

```typescript
// src/domain/mermaid/__tests__/extractor.spec.ts
// 在现有 describe 块中添加：

  it('should extract multiple diagrams', () => {
    const markdown = `
\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Some text

\`\`\`mermaid
sequenceDiagram
  A->>B: message
\`\`\`
`;
    const extractor = new MermaidExtractor();
    const result = extractor.extract(markdown);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('should return empty array when no diagrams', () => {
    const markdown = '# Title\n\nSome content';
    const extractor = new MermaidExtractor();
    const result = extractor.extract(markdown);

    expect(result).toHaveLength(0);
  });

  it('should handle diagrams with Chinese content', () => {
    const markdown = `
\`\`\`mermaid
graph TD
  A[开始] --> B[结束]
\`\`\`
`;
    const extractor = new MermaidExtractor();
    const result = extractor.extract(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].source).toContain('开始');
  });
```

**Step 2: 运行测试**

```bash
npm test -- src/domain/mermaid/__tests__/extractor.spec.ts
```
Expected: PASS (边界情况已处理)

**Step 3: 提交**

```bash
git add src/domain/mermaid/__tests__/extractor.spec.ts
git commit -m "test: add MermaidExtractor boundary tests

- Multiple diagrams
- Empty content
- Chinese characters

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: 更新 domain index 导出

**Files:**
- Create: `src/domain/mermaid/index.ts`

**Step 1: 创建 index 文件**

```typescript
// src/domain/mermaid/index.ts
export * from './extractor.js';
```

**Step 2: 提交**

```bash
git add src/domain/mermaid/index.ts
git commit -m "chore: export MermaidExtractor from domain index

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 第二阶段：Mermaid 渲染器

### Task 4: MermaidRenderer - 接口定义

**Files:**
- Create: `src/domain/mermaid/renderer.ts`
- Test: `src/domain/mermaid/__tests__/renderer.spec.ts`

**Step 1: 编写失败测试**

```typescript
// src/domain/mermaid/__tests__/renderer.spec.ts
import { describe, it, expect } from 'vitest';
import { MermaidRenderer } from '../renderer.js';

describe('MermaidRenderer', () => {
  it('should render mermaid diagram to PNG', async () => {
    const renderer = new MermaidRenderer();
    const source = 'graph TD\n  A --> B';

    const result = await renderer.render(source, { id: 1 });

    expect(result.success).toBe(true);
    expect(result.imageBuffer).toBeDefined();
    expect(result.imageBuffer!.byteLength).toBeGreaterThan(0);
  });
});
```

**Step 2: 运行测试确认失败**

```bash
npm test -- src/domain/mermaid/__tests__/renderer.spec.ts
```
Expected: FAIL with "MermaidRenderer not defined"

**Step 3: 安装依赖并创建最小实现**

```bash
npm install @mermaid-js/mermaid-cli puppeteer
```

```typescript
// src/domain/mermaid/renderer.ts
export interface RenderOptions {
  id: number;
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
  bgColor?: string;
}

export interface RenderResult {
  id: number;
  source: string;
  success: boolean;
  imageBuffer?: ArrayBuffer;
  error?: string;
}

export class MermaidRenderer {
  async render(source: string, options: RenderOptions): Promise<RenderResult> {
    try {
      // 使用 mmdc CLI 渲染
      const { run } = await import('@mermaid-js/mermaid-cli');
      const fs = await import('node:fs');
      const path = await import('node:path');
      const os = await import('node:os');

      const tempDir = os.tmpdir();
      const inputFile = path.join(tempDir, `mermaid-${options.id}.mmd`);
      const outputFile = path.join(tempDir, `mermaid-${options.id}.png`);

      // 写入临时文件
      fs.writeFileSync(inputFile, source);

      // 渲染
      await run(inputFile, outputFile, {
        puppeteerConfig: {
          headless: 'new'
        }
      });

      // 读取结果
      const imageBuffer = fs.readFileSync(outputFile);

      // 清理临时文件
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);

      return {
        id: options.id,
        source,
        success: true,
        imageBuffer
      };
    } catch (error) {
      return {
        id: options.id,
        source,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
```

**Step 4: 运行测试**

```bash
npm test -- src/domain/mermaid/__tests__/renderer.spec.ts --timeout 60000
```
Expected: PASS (可能需要较长时间，因为需要下载 Chromium)

**Step 5: 提交**

```bash
git add package.json package-lock.json src/domain/mermaid/
git commit -m "feat: add MermaidRenderer using mermaid-cli

- Render mermaid diagrams to PNG using @mermaid-js/mermaid-cli
- Puppeteer headless browser rendering
- Error handling with fallback

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: MermaidRenderer - 错误处理测试

**Files:**
- Modify: `src/domain/mermaid/__tests__/renderer.spec.ts`

**Step 1: 添加错误处理测试**

```typescript
// src/domain/mermaid/__tests__/renderer.spec.ts
// 添加测试：

  it('should handle invalid mermaid syntax gracefully', async () => {
    const renderer = new MermaidRenderer();
    const source = 'invalid syntax here!!!';

    const result = await renderer.render(source, { id: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.imageBuffer).toBeUndefined();
  });

  it('should handle empty source', async () => {
    const renderer = new MermaidRenderer();

    const result = await renderer.render('', { id: 1 });

    expect(result.success).toBe(false);
  });
```

**Step 2: 运行测试**

```bash
npm test -- src/domain/mermaid/__tests__/renderer.spec.ts --timeout 60000
```
Expected: PASS

**Step 3: 提交**

```bash
git add src/domain/mermaid/__tests__/renderer.spec.ts
git commit -m "test: add MermaidRenderer error handling tests

- Invalid syntax handling
- Empty source handling

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 第三阶段：Mermaid 发布器

### Task 6: MermaidPublisher - 接口定义

**Files:**
- Create: `src/application/usecases/mermaid-publish.ts`
- Create: `src/application/dto/mermaid-requests.ts`
- Test: `src/application/usecases/__tests__/mermaid-publish.spec.ts`

**Step 1: 创建 DTO**

```typescript
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
```

**Step 2: 提交 DTO**

```bash
git add src/application/dto/mermaid-requests.ts
git commit -m "feat: add Mermaid DTOs

- ProcessMermaidDiagramsRequestDto
- ProcessMermaidDiagramsResponseDto

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: MermaidPublisher - 实现

**Files:**
- Create: `src/application/usecases/mermaid-publish.ts`
- Modify: `src/domain/mermaid/index.ts`
- Modify: `src/application/dto/index.ts`

**Step 1: 实现发布器**

```typescript
// src/application/usecases/mermaid-publish.ts
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
    // 1. 提取所有图表
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

    // 2. 逐个渲染并上传
    const results: ProcessMermaidDiagramsResponseDto['results'] = [];
    let processedMarkdown = request.markdown;

    // 按位置倒序处理，避免位置偏移问题
    const sortedDiagrams = [...diagrams].sort((a, b) => b.position.start - a.position.start);

    for (const diagram of sortedDiagrams) {
      try {
        // 渲染
        const renderResult = await this.renderer.render(diagram.source, {
          id: diagram.id,
          theme: request.theme,
          bgColor: request.bgColor
        });

        if (!renderResult.success || !renderResult.imageBuffer) {
          // 渲染失败，保留原代码块
          results.push({
            diagramId: diagram.id,
            success: false,
            error: renderResult.error || 'Unknown error'
          });
          continue;
        }

        // 上传图片
        const imageFileName = `mermaid-diagram-${diagram.id}.png`;
        const imageBuffer = Buffer.from(renderResult.imageBuffer);

        const imageAttachment = await confluenceRepository.uploadAttachmentFromBase64(
          request.pageId,
          imageBuffer.toString('base64'),
          imageFileName,
          `Mermaid diagram ${diagram.id} rendered at ${new Date().toISOString()}`
        );

        // 上传源码
        const sourceFileName = `mermaid-diagram-${diagram.id}.mmd`;
        const sourceAttachment = await confluenceRepository.uploadAttachmentFromBase64(
          request.pageId,
          Buffer.from(diagram.source).toString('base64'),
          sourceFileName,
          `Source code for Mermaid diagram ${diagram.id}`
        );

        // 替换 Markdown 中的代码块为图片引用
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
        // 上传失败，保留原代码块
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
      results: results.reverse(), // 恢复原始顺序
      totalDiagrams: diagrams.length,
      successCount,
      failedCount
    };
  }
}

export const mermaidPublishUseCase = new MermaidPublishUseCase();
```

**Step 2: 更新导出**

```typescript
// src/domain/mermaid/index.ts
export * from './extractor.js';
export * from './renderer.js';
```

```typescript
// src/application/dto/index.ts
// 添加导出
export * from './mermaid-requests.js';
```

**Step 3: 提交**

```bash
git add src/application/usecases/mermaid-publish.ts src/domain/mermaid/index.ts src/application/dto/index.ts
git commit -m "feat: add MermaidPublishUseCase

- Extract diagrams from markdown
- Render each diagram using MermaidRenderer
- Upload PNG and .mmd as attachments
- Replace code blocks with ac:image references
- Error handling: preserve original code block on failure

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: MCP Tool 集成

**Files:**
- Modify: `src/presentation/mcp/tools/definitions.ts`
- Modify: `src/presentation/mcp/tools/handlers.ts`
- Modify: `src/application/usecases/index.ts`

**Step 1: 更新 usecases index**

```typescript
// src/application/usecases/index.ts
// 添加导出
export * from './mermaid-publish.js';
```

**Step 2: 添加 Tool 定义**

```typescript
// src/presentation/mcp/tools/definitions.ts
// 在 toolDefinitions 数组中添加：

  {
    name: "confluence_process_mermaid_diagrams",
    description: "处理 Markdown 中的所有 Mermaid 图表，渲染为图片并上传为附件，失败时保留原代码块",
    inputSchema: {
      type: "object",
      properties: {
        pageId: {
          type: "string",
          description: "要上传附件的目标页面 ID"
        },
        markdown: {
          type: "string",
          description: "包含 Mermaid 图表的 Markdown 内容"
        },
        theme: {
          type: "string",
          enum: ["default", "forest", "dark", "neutral"],
          default: "default",
          description: "Mermaid 主题"
        },
        bgColor: {
          type: "string",
          description: "背景色，例如 'white'"
        }
      },
      required: ["pageId", "markdown"]
    }
  }
```

**Step 3: 添加 Handler**

```typescript
// src/presentation/mcp/tools/handlers.ts
// 导入
import { mermaidPublishUseCase } from '../../../application/usecases/mermaid-publish.js';

// 在 switch case 中添加：
      case "confluence_process_mermaid_diagrams": {
        const result = await mermaidPublishUseCase.process({
          pageId: args.pageId as string,
          markdown: args.markdown as string,
          theme: (args.theme as any) || 'default',
          bgColor: args.bgColor as string | undefined
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
```

**Step 4: 提交**

```bash
git add src/presentation/mcp/tools/ src/application/usecases/index.ts
git commit -m "feat: integrate mermaid processing into MCP tools

- Add confluence_process_mermaid_diagrams tool
- Tool definition and handler implementation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 第四阶段：测试和验证

### Task 9: 集成测试

**Files:**
- Create: `src/application/usecases/__tests__/mermaid-publish.integration.spec.ts`

**Step 1: 编写集成测试（模拟外部服务）**

```typescript
// src/application/usecases/__tests__/mermaid-publish.integration.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MermaidPublishUseCase } from '../mermaid-publish.js';
import { confluenceRepository } from '../../../domain/confluence/repository.js';

// Mock repository
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
      .mockResolvedValueOnce({ id: 'img-123', title: 'mermaid-diagram-1.png' } as any)
      .mockResolvedValueOnce({ id: 'src-123', title: 'mermaid-diagram-1.mmd' } as any);

    const useCase = new MermaidPublishUseCase();
    const result = await useCase.process({
      pageId: 'page-123',
      markdown: `# Test\n\n\`\`\`mermaid\ngraph TD\n  A --> B\n\`\`\`
`
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
      .mockResolvedValueOnce({ id: 'img-1', title: 'mermaid-diagram-1.png' } as any)
      .mockResolvedValueOnce({ id: 'src-1', title: 'mermaid-diagram-1.mmd' } as any);

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
    // 原始代码块应该保留
    expect(result.processedMarkdown).toContain('```mermaid');
  });
});
```

**Step 2: 运行测试**

```bash
npm test -- src/application/usecases/__tests__/mermaid-publish.integration.spec.ts --timeout 120000
```
Expected: PASS

**Step 3: 提交**

```bash
git add src/application/usecases/__tests__/
git commit -m "test: add MermaidPublishUseCase integration tests

- Single diagram success case
- Mixed success/failure case
- Preserve code block on failure

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: 构建和最终验证

**Step 1: 构建项目**

```bash
npm run build
```
Expected: 无编译错误

**Step 2: 运行全部测试**

```bash
npm test
```
Expected: 所有测试通过

**Step 3: 提交并推送**

```bash
git add -A
git commit -m "build: compile TypeScript and verify all tests pass

- Full test suite passes
- Build successful

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push origin feat/mermaid-batch-processing
```

---

## 实施完成

所有任务已完成。新的 `confluence_process_mermaid_diagrams` 工具支持：

1. ✅ 批量处理单页面多个 Mermaid 图表
2. ✅ 源码保留为 .mmd 附件
3. ✅ 渲染失败时保留原代码块
4. ✅ 使用本地渲染（mermaid-cli）

**相关文档:**
- 设计文档: `docs/plans/2026-03-03-mermaid-improvements-design.md`
- 实施计划: `docs/plans/2026-03-03-mermaid-implement.md`
