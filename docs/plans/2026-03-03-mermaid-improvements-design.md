# Mermaid 图表处理改进设计

## 文档信息
- **创建日期**: 2026-03-03
- **作者**: Claude Opus 4.6
- **状态**: 已批准，待实施

## 背景

当前 Mermaid 处理存在以下问题：
1. 外部服务依赖（mermaid.ink）
2. 渲染为 PNG 后丢失源码
3. 单图表处理，不支持批量
4. 渲染失败导致整个流程中断

## 设计目标

1. **保留源码** - 将 Mermaid 源码作为附件上传，便于后续编辑
2. **批量处理** - 单页面多图表一次性处理
3. **错误回退** - 单个图表渲染失败时保留原代码块

## 架构设计

### 处理流程

```
Markdown 输入
├── ```mermaid 图表1
├── ```mermaid 图表2
└── ```mermaid 图表3
         │
         ▼
┌─────────────────┐    渲染成功    ┌─────────────────┐
│ 遍历所有图表    │ ─────────────▶ │ 上传 PNG 图片   │
│                 │                │ 上传 .mmd 源码  │
│                 │                │ 替换为图片引用  │
│                 │                │ <ac:image>      │
│                 │                └─────────────────┘
│                 │
│                 │    渲染失败    ┌─────────────────┐
│                 │ ─────────────▶ │ 保留原代码块    │
│                 │                │ ```mermaid ...  │
└─────────────────┘                └─────────────────┘
```

### 关键组件

#### 1. MermaidExtractor
- 扫描 Markdown 中的所有 ````mermaid` 代码块
- 提取图表编号、源码内容、位置信息
- 返回提取结果数组

#### 2. MermaidRenderer
- 调用 mermaid.ink API 渲染图表
- 返回 PNG 图片 buffer 和渲染 URL
- 处理渲染错误

#### 3. MermaidPublisher
- 协调提取、渲染、上传流程
- 上传 PNG 图片和 .mmd 源码附件
- 生成替换后的 Markdown 内容

## 数据结构

```typescript
interface ExtractedMermaid {
  id: number;           // 图表序号 (1, 2, 3...)
  source: string;       // Mermaid 源码
  position: {           // 在 Markdown 中的位置
    start: number;
    end: number;
  };
}

interface RenderedMermaid {
  id: number;
  source: string;
  imageBuffer: ArrayBuffer;
  renderUrl: string;
  success: boolean;
  error?: string;
}

interface MermaidPublishResult {
  diagramId: number;
  success: boolean;
  imageAttachmentId?: string;
  sourceAttachmentId?: string;
  error?: string;
}
```

## 错误处理策略

| 场景 | 处理方式 |
|------|----------|
| mermaid.ink 服务不可用 | 所有图表保留原代码块，记录错误 |
| 单个图表渲染失败 | 该图表保留原代码块，其他正常处理 |
| 图片上传失败 | 该图表保留原代码块，记录错误 |
| 源码附件上传失败 | 图片已上传，记录警告 |

## 文件命名规范

- 图片附件: `mermaid-diagram-{id}.png`
- 源码附件: `mermaid-diagram-{id}.mmd`

## API 设计

### 新的 MCP Tool

```json
{
  "name": "confluence_process_mermaid_diagrams",
  "description": "处理 Markdown 中的所有 Mermaid 图表，渲染为图片并上传为附件",
  "inputSchema": {
    "type": "object",
    "properties": {
      "pageId": { "type": "string", "description": "目标页面 ID" },
      "markdown": { "type": "string", "description": "包含 Mermaid 图表的 Markdown 内容" },
      "theme": { "type": "string", "enum": ["default", "forest", "dark", "neutral"], "default": "default" },
      "bgColor": { "type": "string", "description": "背景色，例如 'white'" },
      "embedInPage": { "type": "boolean", "default": false }
    },
    "required": ["pageId", "markdown"]
  }
}
```

### 返回值

```json
{
  "processedMarkdown": "替换后的 Markdown 内容",
  "results": [
    { "diagramId": 1, "success": true, "imageAttachmentId": "123", "sourceAttachmentId": "124" },
    { "diagramId": 2, "success": false, "error": "渲染超时" }
  ],
  "totalDiagrams": 2,
  "successCount": 1,
  "failedCount": 1
}
```

## 测试策略

1. **单元测试**
   - MermaidExtractor: 提取各种格式的代码块
   - MermaidRenderer: 模拟成功/失败场景
   - MermaidPublisher: 验证上传和替换逻辑

2. **集成测试**
   - 端到端处理流程
   - 错误回退场景

## 非功能性需求

1. **性能**: 串行处理图表，避免对 mermaid.ink 造成过大压力
2. **可靠性**: 每个图表独立处理，失败不影响其他
3. **可维护性**: 清晰的分层架构，便于后续替换渲染服务

## 后续扩展

- 支持本地渲染（Puppeteer/Playwright）作为可选方案
- 支持多页面批量更新
- 支持图表重新渲染（基于 .mmd 附件）
