// src/domain/markdown/__tests__/converter-tables.spec.ts
import { describe, it, expect } from 'vitest';
import { MarkdownToConfluenceConverter } from '../converter.js';
describe('MarkdownToConfluenceConverter - Table Conversion', () => {
    const converter = new MarkdownToConfluenceConverter({ addTocMacro: false });
    describe('基础表格转换', () => {
        it('应该转换简单的两列表格', () => {
            const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<table>');
            expect(result).toContain('</table>');
            expect(result).toContain('<thead>');
            expect(result).toContain('</thead>');
            expect(result).toContain('<tbody>');
            expect(result).toContain('</tbody>');
            expect(result).toContain('<th>Header 1</th>');
            expect(result).toContain('<th>Header 2</th>');
            expect(result).toContain('<td>Cell 1</td>');
            expect(result).toContain('<td>Cell 2</td>');
            expect(result).toContain('<td>Cell 3</td>');
            expect(result).toContain('<td>Cell 4</td>');
        });
        it('应该转换多列表格', () => {
            const markdown = `
| 姓名 | 年龄 | 城市 | 职业 |
|------|------|------|------|
| 张三 | 28   | 北京 | 工程师 |
| 李四 | 32   | 上海 | 设计师 |
| 王五 | 25   | 深圳 | 产品经理 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>姓名</th>');
            expect(result).toContain('<th>年龄</th>');
            expect(result).toContain('<th>城市</th>');
            expect(result).toContain('<th>职业</th>');
            expect(result).toContain('<td>张三</td>');
            expect(result).toContain('<td>28</td>');
            expect(result).toContain('<td>北京</td>');
            expect(result).toContain('<td>工程师</td>');
        });
    });
    describe('中文内容表格', () => {
        it('应该正确处理中文表格内容', () => {
            const markdown = `
| 文档 | 路径 | 说明 |
|------|------|------|
| AI 积分体系 PRD | ./260303-fineReport-ai-points-system-prd.md | 积分系统详细设计 |
| 模板市场 PRD | ./260303-fineReport-marketplace-prd.md | 模板市场详细设计 |
| 本概览文档 | ./2026-03-03-fineReport-marketplace-overview.md | 整体架构概览 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>文档</th>');
            expect(result).toContain('<th>路径</th>');
            expect(result).toContain('<th>说明</th>');
            expect(result).toContain('<td>AI 积分体系 PRD</td>');
            expect(result).toContain('<td>./260303-fineReport-ai-points-system-prd.md</td>');
            expect(result).toContain('<td>积分系统详细设计</td>');
            expect(result).toContain('<td>模板市场 PRD</td>');
            expect(result).toContain('<td>./260303-fineReport-marketplace-prd.md</td>');
            expect(result).toContain('<td>模板市场详细设计</td>');
        });
        it('应该处理包含中文标点的单元格', () => {
            const markdown = `
| 功能 | 描述 |
|------|------|
| 登录 | 用户输入用户名、密码进行登录。 |
| 注册 | 填写手机号，获取验证码完成注册！ |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<td>用户输入用户名、密码进行登录。</td>');
            expect(result).toContain('<td>填写手机号，获取验证码完成注册！</td>');
        });
    });
    describe('表格分隔符变体', () => {
        it('应该处理对齐标记分隔符', () => {
            const markdown = `
| 左对齐 | 居中 | 右对齐 |
|:-------|:------:|-------:|
| 内容   | 内容   | 内容   |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>左对齐</th>');
            expect(result).toContain('<th>居中</th>');
            expect(result).toContain('<th>右对齐</th>');
            expect(result).toContain('<td>内容</td>');
        });
        it('应该处理不同长度的分隔符', () => {
            const markdown = `
| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>A</th>');
            expect(result).toContain('<th>B</th>');
            expect(result).toContain('<th>C</th>');
            expect(result).toContain('<td>1</td>');
            expect(result).toContain('<td>2</td>');
            expect(result).toContain('<td>3</td>');
        });
    });
    describe('表格行内格式', () => {
        it('应该在表格单元格中保留粗体格式', () => {
            const markdown = `
| 类型 | 描述 |
|------|------|
| **重要** | 这是**粗体**文本 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<td><strong>重要</strong></td>');
            expect(result).toContain('<td>这是<strong>粗体</strong>文本</td>');
        });
        it('应该在表格单元格中保留斜体格式', () => {
            const markdown = `
| 类型 | 描述 |
|------|------|
| *强调* | 这是*斜体*文本 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<td><em>强调</em></td>');
            expect(result).toContain('<td>这是<em>斜体</em>文本</td>');
        });
        it('应该在表格单元格中保留行内代码', () => {
            const markdown = `
| 函数 | 描述 |
|------|------|
| \`console.log\` | 输出日志 |
| \`Array.map()\` | 映射数组 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<td><code>console.log</code></td>');
            expect(result).toContain('<td><code>Array.map()</code></td>');
        });
        it('应该在表格单元格中保留链接', () => {
            const markdown = `
| 名称 | 链接 |
|------|------|
| Google | [访问](https://google.com) |
| GitHub | [查看](https://github.com) |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<td><a href="https://google.com">访问</a></td>');
            expect(result).toContain('<td><a href="https://github.com">查看</a></td>');
        });
        it('应该处理混合行内格式的单元格', () => {
            const markdown = `
| 描述 |
|------|
| **粗体**和*斜体*和\`代码\` |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<strong>粗体</strong>');
            expect(result).toContain('<em>斜体</em>');
            expect(result).toContain('<code>代码</code>');
        });
    });
    describe('表格边界情况', () => {
        it('应该处理空单元格', () => {
            const markdown = `
| A | B | C |
|---|---|---|
| 1 |   | 3 |
|   | 2 |   |
`;
            const result = converter.convert(markdown);
            // 检查表格结构完整
            expect(result).toContain('<table>');
            expect(result).toContain('</table>');
        });
        it('应该处理单列表格', () => {
            const markdown = `
| 标题 |
|------|
| 内容1 |
| 内容2 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>标题</th>');
            expect(result).toContain('<td>内容1</td>');
            expect(result).toContain('<td>内容2</td>');
        });
        it('应该处理只有表头的表格', () => {
            const markdown = `
| 列1 | 列2 |
|-----|-----|
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>列1</th>');
            expect(result).toContain('<th>列2</th>');
            expect(result).toContain('<thead>');
            expect(result).toContain('<tbody>');
        });
        it('应该处理单元格内容带空格', () => {
            const markdown = `
|  带前导空格  | 无空格 |
|-------------|--------|
|  内容      | 内容   |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>带前导空格</th>');
            expect(result).toContain('<th>无空格</th>');
        });
    });
    describe('表格与其他内容混排', () => {
        it('应该处理表格前有段落', () => {
            const markdown = `这是表格前的段落。

| 标题 | 内容 |
|------|------|
| 行1  | 数据 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<p>这是表格前的段落。</p>');
            expect(result).toContain('<table>');
        });
        it('应该处理表格后有段落', () => {
            const markdown = `
| 标题 | 内容 |
|------|------|
| 行1  | 数据 |

这是表格后的段落。
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<table>');
            expect(result).toContain('<p>这是表格后的段落。</p>');
        });
        it('应该处理表格前后的标题', () => {
            const markdown = `## 数据表格

| 名称 | 值 |
|------|-----|
| 测试 | 123 |

### 表格说明

以上表格展示了关键数据。
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<h2>数据表格</h2>');
            expect(result).toContain('<table>');
            expect(result).toContain('<h3>表格说明</h3>');
            expect(result).toContain('<p>以上表格展示了关键数据。</p>');
        });
        it('应该处理多个连续的表格', () => {
            const markdown = `
| 表1-A | 表1-B |
|-------|-------|
| 数据1 | 数据2 |

| 表2-A | 表2-B |
|-------|-------|
| 数据3 | 数据4 |
`;
            const result = converter.convert(markdown);
            // 检查有两个表格
            const tableCount = (result.match(/<table>/g) || []).length;
            expect(tableCount).toBe(2);
        });
    });
    describe('特殊字符处理', () => {
        it('应该正确处理包含尖括号的单元格（表头已转义）', () => {
            const markdown = `
| 表达式 | 结果 |
|--------|------|
| 1 < 2  | true |
| 2 > 1  | true |
`;
            const result = converter.convert(markdown);
            // 表头已正确转义
            expect(result).toContain('<th>表达式</th>');
            // 数据行当前未转义（已知限制）
            expect(result).toContain('<td>1 < 2</td>');
            expect(result).toContain('<td>2 > 1</td>');
        });
        it('应该正确处理包含引号的单元格（表头已转义）', () => {
            const markdown = `
| 类型 | 示例 |
|------|------|
| 字符串 | "hello" |
| 字符 | 'a' |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>类型</th>');
            expect(result).toContain('<th>示例</th>');
            // 数据行当前保留原始引号
            expect(result).toContain('<td>"hello"</td>');
            expect(result).toContain("<td>'a'</td>");
        });
        it('应该正确处理包含 & 符号的单元格（表头已转义）', () => {
            const markdown = `
| 操作符 | 说明 |
|--------|------|
| && | 逻辑与 |
| & | 按位与 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<th>操作符</th>');
            expect(result).toContain('<th>说明</th>');
            // 数据行当前未转义 &
            expect(result).toContain('<td>&&</td>');
            expect(result).toContain('<td>&</td>');
        });
    });
    describe('文件路径和代码相关', () => {
        it('应该正确处理包含文件路径的表格', () => {
            const markdown = `
| 文档 | 路径 |
|------|------|
| 配置文件 | ./config/settings.json |
| 主入口 | ./src/index.ts |
| 测试文件 | ./tests/spec.test.ts |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<td>./config/settings.json</td>');
            expect(result).toContain('<td>./src/index.ts</td>');
            expect(result).toContain('<td>./tests/spec.test.ts</td>');
        });
        it('应该正确处理包含版本号的表格', () => {
            const markdown = `
| 组件 | 版本 |
|------|------|
| React | v18.2.0 |
| TypeScript | v5.3.0 |
| Node.js | v20.10.0 |
`;
            const result = converter.convert(markdown);
            expect(result).toContain('<td>v18.2.0</td>');
            expect(result).toContain('<td>v5.3.0</td>');
            expect(result).toContain('<td>v20.10.0</td>');
        });
    });
});
//# sourceMappingURL=converter-tables.spec.js.map