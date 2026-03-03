// src/domain/markdown/__tests__/converter-lists.spec.ts
import { describe, it, expect } from 'vitest';
import { MarkdownToConfluenceConverter } from '../converter.js';
describe('MarkdownToConfluenceConverter - List Conversion', () => {
    const converter = new MarkdownToConfluenceConverter({ addTocMacro: false });
    describe('无序列表', () => {
        it('应该转换简单的无序列表', () => {
            const markdown = `**底层框架迁移**
- 目标：提供稳定的技术底座
- 关键产出：兼容层设计、性能基准`;
            const result = converter.convert(markdown);
            expect(result).toContain('<strong>底层框架迁移</strong>');
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>目标：提供稳定的技术底座</li>');
            expect(result).toContain('<li>关键产出：兼容层设计、性能基准</li>');
            expect(result).toContain('</ul>');
        });
        it('应该支持星号作为列表标记', () => {
            const markdown = `* 项目一
* 项目二
* 项目三`;
            const result = converter.convert(markdown);
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>项目一</li>');
            expect(result).toContain('<li>项目二</li>');
            expect(result).toContain('<li>项目三</li>');
            expect(result).toContain('</ul>');
        });
        it('应该支持加号作为列表标记', () => {
            const markdown = `+ 选项A
+ 选项B
+ 选项C`;
            const result = converter.convert(markdown);
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>选项A</li>');
            expect(result).toContain('<li>选项B</li>');
            expect(result).toContain('<li>选项C</li>');
            expect(result).toContain('</ul>');
        });
        it('应该在列表项中保留内联格式', () => {
            const markdown = `- **粗体** 文本
- *斜体* 文本
- \`代码\` 文本`;
            const result = converter.convert(markdown);
            expect(result).toContain('<li><strong>粗体</strong> 文本</li>');
            expect(result).toContain('<li><em>斜体</em> 文本</li>');
            expect(result).toContain('<li><code>代码</code> 文本</li>');
        });
    });
    describe('有序列表', () => {
        it('应该转换简单的有序列表', () => {
            const markdown = `1. 第一步
2. 第二步
3. 第三步`;
            const result = converter.convert(markdown);
            expect(result).toContain('<ol>');
            expect(result).toContain('<li>第一步</li>');
            expect(result).toContain('<li>第二步</li>');
            expect(result).toContain('<li>第三步</li>');
            expect(result).toContain('</ol>');
        });
        it('应该处理非连续数字的有序列表', () => {
            const markdown = `5. 第五步
10. 第十步
20. 第二十步`;
            const result = converter.convert(markdown);
            expect(result).toContain('<ol>');
            expect(result).toContain('<li>第五步</li>');
            expect(result).toContain('<li>第十步</li>');
            expect(result).toContain('<li>第二十步</li>');
            expect(result).toContain('</ol>');
        });
    });
    describe('列表与段落混合', () => {
        it('应该在列表前保留段落', () => {
            const markdown = `这是介绍段落。

- 列表项一
- 列表项二

这是结尾段落。`;
            const result = converter.convert(markdown);
            expect(result).toContain('<p>这是介绍段落。</p>');
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>列表项一</li>');
            expect(result).toContain('<li>列表项二</li>');
            expect(result).toContain('</ul>');
            expect(result).toContain('<p>这是结尾段落。</p>');
        });
        it('应该正确处理标题后的列表', () => {
            const markdown = `## 功能列表

- 功能一
- 功能二
- 功能三`;
            const result = converter.convert(markdown);
            expect(result).toContain('<h2>功能列表</h2>');
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>功能一</li>');
            expect(result).toContain('<li>功能二</li>');
            expect(result).toContain('<li>功能三</li>');
            expect(result).toContain('</ul>');
        });
    });
    describe('待办事项列表（复选框）', () => {
        it('应该转换未完成的待办事项', () => {
            const markdown = `- [ ] 任务一
- [ ] 任务二
- [ ] 任务三`;
            const result = converter.convert(markdown);
            expect(result).toContain('<ac:task-list>');
            expect(result).toContain('<ac:task>');
            expect(result).toContain('<ac:task-id>1</ac:task-id>');
            expect(result).toContain('<ac:task-id>2</ac:task-id>');
            expect(result).toContain('<ac:task-id>3</ac:task-id>');
            expect(result).toContain('<ac:task-status>incomplete</ac:task-status>');
            expect(result).toContain('<ac:task-body><p>任务一</p></ac:task-body>');
            expect(result).toContain('<ac:task-body><p>任务二</p></ac:task-body>');
            expect(result).toContain('<ac:task-body><p>任务三</p></ac:task-body>');
            expect(result).toContain('</ac:task>');
            expect(result).toContain('</ac:task-list>');
        });
        it('应该转换已完成的待办事项', () => {
            const markdown = `- [x] 已完成任务一
- [x] 已完成任务二`;
            const result = converter.convert(markdown);
            expect(result).toContain('<ac:task-status>complete</ac:task-status>');
            expect(result).toContain('<ac:task-body><p>已完成任务一</p></ac:task-body>');
            expect(result).toContain('<ac:task-body><p>已完成任务二</p></ac:task-body>');
        });
        it('应该混合处理完成和未完成的待办事项', () => {
            const markdown = `- [ ] 未完成任务
- [x] 已完成任务
- [ ] 另一个未完成任务`;
            const result = converter.convert(markdown);
            // Count occurrences
            const incompleteCount = (result.match(/<ac:task-status>incomplete<\/ac:task-status>/g) || []).length;
            const completeCount = (result.match(/<ac:task-status>complete<\/ac:task-status>/g) || []).length;
            expect(incompleteCount).toBe(2);
            expect(completeCount).toBe(1);
        });
        it('应该在待办事项中保留内联格式（已转义）', () => {
            const markdown = `- [ ] **粗体** 任务
- [x] *斜体* 任务`;
            const result = converter.convert(markdown);
            // 内联格式在任务体中被正确转换
            expect(result).toContain('<ac:task-body><p><strong>粗体</strong> 任务</p></ac:task-body>');
            expect(result).toContain('<ac:task-body><p><em>斜体</em> 任务</p></ac:task-body>');
        });
        it('应该在待办事项内容中进行XML转义', () => {
            const markdown = `- [ ] 任务 "带引号" 内容
- [ ] 任务 带<特殊>字符`;
            const result = converter.convert(markdown);
            // XML 特殊字符应被转义
            expect(result).toContain('&quot;');
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
            expect(result).not.toContain('"带引号"');
            expect(result).not.toContain('<特殊>');
        });
        it('应该区分普通列表和待办事项列表', () => {
            const markdown = `普通列表：
- 项目 A
- 项目 B

待办事项：
- [ ] 任务 A
- [x] 任务 B`;
            const result = converter.convert(markdown);
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>项目 A</li>');
            expect(result).toContain('<ac:task-list>');
            expect(result).toContain('<ac:task-status>incomplete</ac:task-status>');
        });
    });
    describe('列表边界情况', () => {
        it('应该处理空列表', () => {
            const markdown = `一些文本

更多文本`;
            const result = converter.convert(markdown);
            expect(result).not.toContain('<ul>');
            expect(result).not.toContain('<ol>');
            expect(result).not.toContain('<ac:task-list>');
        });
        it('应该处理列表后立即是代码块的情况', () => {
            const markdown = `- 列表项

\`\`\`
code block
\`\`\``;
            const result = converter.convert(markdown);
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>列表项</li>');
            expect(result).toContain('</ul>');
            expect(result).toContain('<ac:structured-macro ac:name="code">');
        });
        it('应该区分无序列表和有序列表', () => {
            const markdown = `无序列表：
- 项目 A
- 项目 B

有序列表：
1. 步骤一
2. 步骤二`;
            const result = converter.convert(markdown);
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>项目 A</li>');
            expect(result).toContain('<li>项目 B</li>');
            expect(result).toContain('</ul>');
            expect(result).toContain('<ol>');
            expect(result).toContain('<li>步骤一</li>');
            expect(result).toContain('<li>步骤二</li>');
            expect(result).toContain('</ol>');
        });
    });
});
//# sourceMappingURL=converter-lists.spec.js.map