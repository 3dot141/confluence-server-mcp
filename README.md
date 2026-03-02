# Confluence (KMS) MCP Server

一个基于**分层架构**的 Confluence MCP（Model Context Protocol）服务器：让 AI 在 **Cursor** 里通过自然语言创建、更新、删除、搜索 Confluence（公司内部也称 **KMS**）页面。

## ✨ 特性

- **🏗️ 分层架构** - 清晰的关注点分离（Infrastructure → Domain → Application → Presentation）
- **📄 页面管理**：创建、更新、删除、获取页面（支持 title / pageId）
- **🔍 搜索能力**：按关键词搜索、获取子页面、查看页面历史
- **🌌 Space 管理**：列出当前账号可访问的 Spaces
- **📎 附件管理**：上传文件或 base64 内容
- **💬 评论功能**：添加和查看页面评论
- **🔐 权限管理**：设置页面访问权限
- **📝 高级发布**：Markdown 一键发布，自动提取图片并上传
- **🔧 宏辅助**：生成 Confluence Code Macro（storage format），安全插入代码块

## ⚠️ 注意事项（必读）

- **必须使用 Cursor 的 Agent 模式**，才能调用 `confluence_*` 这组 MCP 工具
- **Cursor `mcp.json` 里的路径必须是绝对路径**

## 📦 项目结构

```
confluence-mcp-server/
├── src/
│   ├── infrastructure/          # 基础设施层
│   │   ├── config.ts           # 环境变量配置
│   │   ├── errors.ts           # 错误类型定义
│   │   ├── http-client.ts      # HTTP 客户端封装
│   │   └── logger.ts           # 日志记录
│   │
│   ├── domain/                  # 领域层
│   │   ├── confluence/
│   │   │   ├── types.ts        # Confluence 领域类型
│   │   │   └── repository.ts   # Confluence API 仓库
│   │   └── markdown/
│   │       ├── types.ts        # Markdown 类型
│   │       ├── macros.ts       # Confluence 宏生成
│   │       ├── image-processor.ts  # 图片提取器
│   │       └── converter.ts    # Markdown → Confluence 转换器
│   │
│   ├── application/             # 应用层
│   │   ├── dto/
│   │   │   ├── requests.ts     # 请求 DTO
│   │   │   └── responses.ts    # 响应 DTO
│   │   ├── mappers/
│   │   │   └── confluence-mapper.ts  # DTO 映射
│   │   └── usecases/
│   │       ├── spaces.ts       # Space 用例
│   │       ├── pages.ts        # 页面 CRUD 用例
│   │       ├── attachments.ts  # 附件用例
│   │       ├── comments.ts     # 评论用例
│   │       ├── permissions.ts  # 权限用例
│   │       └── publish.ts      # 高级发布用例
│   │
│   ├── presentation/            # 表现层
│   │   └── mcp/
│   │       ├── server.ts       # MCP Server 启动
│   │       ├── tools/
│   │       │   ├── definitions.ts  # 工具定义
│   │       │   └── handlers.ts     # 工具处理器
│   │       └── transport/
│   │           └── stdio.ts    # Stdio 传输
│   │
│   └── main.ts                  # 程序入口
│
├── dist/                        # 编译输出
├── dev/                         # 开发脚本
├── docs/                        # 文档
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

复制 `env-example.txt` 为 `.env`，并填入你的配置：

```env
CONF_BASE_URL=https://your-confluence-instance.atlassian.net
CONF_USERNAME=your-email@example.com
CONF_PASSWORD=your-api-token
CONF_SPACE=YOUR_SPACE_KEY
```

> 说明：本项目通过 Confluence REST API + Basic Auth（用户名 + `CONF_PASSWORD`）访问。
> - Atlassian Cloud：`CONF_PASSWORD` 通常是 **API Token**
> - 内部 KMS：以你们实际认证方式为准（可能是 Token 或密码）

### 3) 构建（生成 `dist/`）

```bash
npm run build
```

### 4) 配置 Cursor MCP

编辑 `~/.cursor/mcp.json`（可参考 `mcp-config-example.json`），将 `args` 指向 **本仓库的 `dist/main.js` 绝对路径**：

```json
{
  "mcpServers": {
    "confluence": {
      "command": "node",
      "args": ["/绝对路径/到/confluence-mcp-server/dist/main.js"],
      "env": {
        "CONF_BASE_URL": "你的 Confluence/KMS 地址（不要以 / 结尾）",
        "CONF_USERNAME": "你的用户名/邮箱",
        "CONF_PASSWORD": "你的 API Token/密码",
        "CONF_SPACE": "默认 Space Key（可选）"
      }
    }
  }
}
```

### 5) 重启 Cursor 并在 Agent 模式使用

- 完全退出并重启 Cursor
- 切换到 **Agent 模式**后再使用（否则 MCP 工具可能不可用）

### 6) 验证（在 Cursor 里直接问）

```
列出我可以访问的所有 KMS Spaces
```

## 🛠️ 可用工具（17 个）

### 🌐 基础 Confluence API 工具（15 个）

直接与 Confluence REST API 交互的工具：

#### Space 管理
| 工具 | 说明 |
|------|------|
| `confluence_list_spaces` | 列出可访问的 Spaces |

#### 页面操作
| 工具 | 说明 |
|------|------|
| `confluence_create_page` | 创建页面（接收 Confluence Storage Format） |
| `confluence_update_page` | 更新页面（支持 `pageId` 或 `space+title`） |
| `confluence_upsert_page` | 创建或更新（存在则更新，否则创建） |
| `confluence_get_page` | 获取页面详情（含 storage HTML） |
| `confluence_delete_page` | 删除页面 |
| `confluence_copy_page` | 复制页面到新的位置 |

#### 搜索
| 工具 | 说明 |
|------|------|
| `confluence_search_pages` | 搜索页面 |
| `confluence_get_child_pages` | 获取子页面 |
| `confluence_get_page_history` | 查看页面历史 |

#### 附件
| 工具 | 说明 |
|------|------|
| `confluence_upload_attachment` | 上传附件（支持 filePath 或 base64） |
| `confluence_get_page_attachments` | 获取页面附件列表 |

#### 评论
| 工具 | 说明 |
|------|------|
| `confluence_add_comment` | 添加评论 |
| `confluence_get_page_comments` | 获取页面评论 |

#### 权限
| 工具 | 说明 |
|------|------|
| `confluence_set_page_restriction` | 设置页面访问权限（none/edit_only/view_only） |

### 📝 Markdown 转换工具（2 个）

用于 Markdown 与 Confluence Storage Format 之间的转换（**不直接调用 API**，只返回转换结果）：

| 工具 | 说明 |
|------|------|
| `confluence_convert_markdown_to_storage` | Markdown → Confluence Storage Format |
| `confluence_extract_images_from_markdown` | 提取 Markdown 中的图片路径（用于上传附件） |
| `confluence_build_code_macro` | 生成 Code Macro（storage format HTML） |

## 📝 Markdown 发布功能

使用 Markdown 转换工具配合 API 工具，实现完整的发布流程：

### 典型发布流程

**完整流程（含图片）**

```javascript
// 1. 提取图片
const { images } = await confluence_extract_images_from_markdown({
  markdown: "# Hello\n\n![img](./test.png)"
});

// 2. 创建草稿页面（仅占位，后续会更新）
const result = await confluence_create_page({
  space: "DEV",
  title: "My Page",
  content: "<p>Loading...</p>"  // 临时内容
});

// 3. 上传本地图片
const imageMapping = {};
for (const img of images) {
  if (img.type === "local") {
    const attachment = await confluence_upload_attachment({
      pageId: result.pageId,
      filePath: img.absolutePath
    });
    // 保存映射: 原路径 -> 附件文件名
    imageMapping[img.src] = img.src.split('/').pop();
  }
}

// 4. 转换 Markdown（使用 imageMapping）
const { storageFormat, title } = await confluence_convert_markdown_to_storage({
  markdown: "# Hello\n\n![img](./test.png)",
  addToc: true,
  imageMapping: imageMapping  // 传入映射关系
});

// 5. 更新页面为最终内容
await confluence_update_page({
  pageId: result.pageId,
  title: title || "My Page",
  content: storageFormat
});
```

### 转换步骤详解

**完整流程: 提取 → 创建草稿 → 上传 → 转换 → 更新**

1. **`confluence_extract_images_from_markdown`**
   - **先执行** - 提取 Markdown 中的所有图片路径
   - 解析相对路径为绝对路径（用于后续上传）
   - 返回图片列表，包含 `src`（原始路径）和 `absolutePath`（绝对路径）

2. **`confluence_create_page`**
   - 创建草稿页面（先用占位内容）
   - 获取 pageId 用于后续上传和更新

3. **`confluence_upload_attachment`**
   - 上传步骤1中提取的本地图片
   - 获取上传后的附件信息

4. **`confluence_convert_markdown_to_storage`**
   - 提取 Front Matter 中的 title
   - 使用 `imageMapping` 将原图片路径映射为附件引用
   - **图片处理**: 
     - 无映射: `![alt](./path/to/image.png)` → `<ac:image><ri:attachment ri:filename="image.png" /></ac:image>`
     - 有映射: 使用 `imageMapping[src]` 作为文件名或 URL
   - 返回 `storageFormat`（转换后的内容）和 `title`

5. **`confluence_update_page`**
   - 使用转换后的 `storageFormat` 更新页面内容
   - 此时附件已上传，图片可正常显示

**支持的 Markdown 语法：**
- Front matter (YAML)
- 标题 H1-H6
- 加粗、斜体、行内代码
- 代码块（带语言高亮）
- 无序/有序列表
- 引用块（自动转为 Info/Warning/Tip/Note 宏）
- 链接和 Obsidian 链接 `[[page]]`
- 表格
- 图片（需手动上传为附件）

## 🔧 开发与调试

### 运行 MCP Server（本地）

```bash
npm run mcp
# 或
npm run build && node dist/main.js
```

### 测试连通性（推荐先跑）

```bash
npm test
```

### 使用 MCP Inspector 调试

```bash
npx @modelcontextprotocol/inspector node dist/main.js
```

### Cursor MCP 日志位置

- macOS：`~/Library/Logs/Cursor/`
- Windows：`%APPDATA%\Cursor\logs\`

## 🐛 故障排查

### Cursor 里看不到 `confluence_*` 工具

1. 确认在 **Agent 模式**下使用
2. 检查 `~/.cursor/mcp.json` 的 `args` 是否为 **绝对路径**，并指向 `dist/main.js`
3. 运行 `npm run mcp` 看是否能正常启动（无语法/依赖错误）
4. 完全重启 Cursor，并查看日志

### 认证失败（401/403）

- 检查 `CONF_USERNAME / CONF_PASSWORD` 是否正确
- Atlassian Cloud 请使用 API Token；内部 KMS 以实际策略为准
- 确认账号对目标 Space 有权限，可用 `confluence_list_spaces` 验证

### Space Key 不确定

先执行：

```
列出我可以访问的所有 Confluence Spaces
```

## 🏗️ 架构说明

本项目采用**分层架构（Layered Architecture）**：

```
┌─────────────────────────────────────┐
│  Presentation Layer (MCP Server)    │  ← 工具定义、请求处理
├─────────────────────────────────────┤
│  Application Layer (Use Cases)      │  ← 用例编排、DTO 转换
├─────────────────────────────────────┤
│  Domain Layer (Repository)          │  ← 业务逻辑、API 调用
├─────────────────────────────────────┤
│  Infrastructure Layer (Config)      │  ← 配置、HTTP 客户端
└─────────────────────────────────────┘
```

**优势：**
- ✅ **关注点分离** - 每层职责清晰
- ✅ **可测试** - 每层可独立测试
- ✅ **可扩展** - 新增工具只需修改 Presentation 和 Application 层
- ✅ **可维护** - 每个文件 < 300 行，逻辑清晰

## 📚 相关文档

- **设计文档**：`./docs/2025-03-02-confluence-mcp-server-design.md`
- **实现计划**：`./docs/implementation-plan.md`
- **KMS 别名说明**：`./KMS_ALIAS_README.md`
- **Confluence REST API**：`https://developer.atlassian.com/cloud/confluence/rest/v1/intro/`
- **MCP 协议**：`https://modelcontextprotocol.io`

## 📄 许可证

MIT

---

## 🔄 迁移指南

### 从 v1.x 迁移到 v2.x

**破坏性变更：** `publish_markdown_to_confluence` 工具已移除

**旧代码（v1.x）：**
```javascript
await publish_markdown_to_confluence({
  markdown: content,
  space: "DEV",
  title: "My Doc"
});
```

**新代码（v2.x）：**
```javascript
// 1. 转换 Markdown
const { storageFormat, title } = await confluence_convert_markdown_to_storage({
  markdown: content
});

// 2. 创建或更新页面
await confluence_upsert_page({
  space: "DEV",
  title: title || "My Doc",
  content: storageFormat
});
```

**优势：**
- 转换和 API 操作分离，更灵活
- 可以手动控制图片上传时机
- 便于调试转换结果

---

**版本**: 2.0.0  
**架构**: 分层架构 (Layered Architecture)  
**技术栈**: TypeScript 5.x, MCP SDK, Axios, Express
