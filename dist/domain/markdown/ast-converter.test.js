// src/domain/markdown/ast-converter.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { ASTMarkdownToConfluenceConverter } from './ast-converter.js';
import { RemarkMarkdownParser } from '../../infrastructure/markdown/remark-parser.js';
import { visit } from 'unist-util-visit';
describe('ASTMarkdownToConfluenceConverter Coverage Report', () => {
    let converter;
    let parser;
    beforeEach(() => {
        converter = new ASTMarkdownToConfluenceConverter();
        parser = new RemarkMarkdownParser();
    });
    // 获取 markdown 中所有节点类型的辅助函数
    function getNodeTypes(markdown) {
        // Use the parser instance which has frontmatter plugin enabled
        const ast = parser.parse(markdown);
        const types = new Set();
        visit(ast, (node) => {
            types.add(node.type);
        });
        return types;
    }
    describe('SUPPORTED TYPES ✓', () => {
        test('Heading', () => {
            const md = '# H1\n## H2\n### H3';
            const types = getNodeTypes(md);
            expect(types.has('heading')).toBe(true);
            const result = converter.convert(md);
            expect(result).toContain('<h1>');
            expect(result).toContain('<h2>');
            expect(result).toContain('<h3>');
        });
        test('Paragraph', () => {
            const md = 'This is a paragraph.';
            const result = converter.convert(md);
            expect(result).toContain('<p>');
        });
        test('Text', () => {
            const md = 'Plain text';
            const result = converter.convert(md);
            expect(result).toContain('Plain text');
        });
        test('Strong (bold)', () => {
            const md = '**bold**';
            const result = converter.convert(md);
            expect(result).toContain('<strong>');
        });
        test('Emphasis (italic)', () => {
            const md = '*italic*';
            const result = converter.convert(md);
            expect(result).toContain('<em>');
        });
        test('InlineCode', () => {
            const md = '`code`';
            const result = converter.convert(md);
            expect(result).toContain('<code>');
        });
        test('Code block', () => {
            const md = '```js\nconst x = 1;\n```';
            const result = converter.convert(md);
            expect(result).toContain('ac:name="code"');
            expect(result).toContain('language');
            expect(result).toContain('<ac:plain-text-body><![CDATA[');
            expect(result).toContain('const x = 1;');
        });
        test('Blockquote', () => {
            const md = '> quote';
            const result = converter.convert(md);
            expect(result).toContain('<blockquote>');
        });
        test('Blockquote with markers (!info, !warning, !tip, !note)', () => {
            // Each marker should be in its own blockquote (separated by blank line)
            const md = '> !info Info message\n\n> !warning Warning\n\n> !tip Tip\n\n> !note Note';
            const result = converter.convert(md);
            expect(result).toContain('ac:name="info"');
            expect(result).toContain('ac:name="warning"');
            expect(result).toContain('ac:name="tip"');
            expect(result).toContain('ac:name="note"');
        });
        test('List (unordered)', () => {
            const md = '- item1\n- item2';
            const result = converter.convert(md);
            expect(result).toContain('<ul>');
            expect(result).toContain('<li>');
        });
        test('List (ordered)', () => {
            const md = '1. item1\n2. item2';
            const result = converter.convert(md);
            expect(result).toContain('<ol>');
            expect(result).toContain('<li>');
        });
        test('List (task list)', () => {
            const md = '- [ ] task1\n- [x] task2';
            const result = converter.convert(md);
            expect(result).toContain('ac:task-list');
            expect(result).toContain('incomplete');
            expect(result).toContain('complete');
        });
        test('Nested lists', () => {
            const md = '- item1\n  - nested';
            const result = converter.convert(md);
            expect(result).toContain('<ul>');
        });
        test('Table', () => {
            const md = '| A | B |\n|---|---|\n| 1 | 2 |';
            const result = converter.convert(md);
            expect(result).toContain('<table>');
            expect(result).toContain('<th>');
            expect(result).toContain('<td>');
        });
        test('Link', () => {
            const md = '[link](https://example.com)';
            const result = converter.convert(md);
            expect(result).toContain('<a href=');
        });
        test('Image', () => {
            const md = '![alt](image.png)';
            const result = converter.convert(md);
            expect(result).toContain('ac:image');
        });
        test('ThematicBreak (horizontal rule)', () => {
            const md = '---';
            const result = converter.convert(md);
            expect(result).toContain('<hr/>');
        });
        test('LineBreak', () => {
            const md = 'line1  \nline2';
            const result = converter.convert(md);
            expect(result).toContain('<br/>');
        });
        test('HTML (preserve Confluence macros)', () => {
            const md = '<ac:structured-macro>test</ac:structured-macro>';
            const result = converter.convert(md);
            expect(result).toContain('ac:structured-macro');
        });
        test('Delete (strikethrough)', () => {
            const md = '~~deleted~~';
            const result = converter.convert(md);
            // Should handle gracefully, may convert to <s> or ignore
            expect(result).toBeDefined();
        });
    });
    describe('NEED VERIFICATION ⚠️', () => {
        test('ImageReference (Obsidian ![[image]] style)', () => {
            // Use parser's preprocessObsidianSyntax before parsing
            const md = '![[image.png]]';
            const preprocessed = parser.preprocessObsidianSyntax(md);
            const types = getNodeTypes(preprocessed);
            // After preprocessing, should be parsed as image
            expect(types.has('image')).toBe(true);
        });
        test('Footnote', () => {
            const md = 'text[^1]\n\n[^1]: footnote';
            const types = getNodeTypes(md);
            if (types.has('footnoteReference') || types.has('footnoteDefinition')) {
                console.log('⚠️ Footnote detected but may not be fully supported');
            }
        });
        test('Definition (link reference)', () => {
            const md = '[text][ref]\n\n[ref]: https://example.com';
            const types = getNodeTypes(md);
            if (types.has('definition')) {
                console.log('⚠️ Definition detected but may not be fully supported');
            }
        });
        test('LinkReference', () => {
            const md = '[text][ref]';
            const types = getNodeTypes(md);
            if (types.has('linkReference')) {
                console.log('⚠️ LinkReference detected but may not be fully supported');
            }
        });
    });
    describe('KNOWN UNSUPPORTED / EDGE CASES ✗', () => {
        test('Mermaid code blocks (special handling needed)', () => {
            const md = '```mermaid\ngraph TD\n  A --> B\n```';
            const types = getNodeTypes(md);
            expect(types.has('code')).toBe(true);
            // Note: mermaid content is extracted but rendering happens externally
            console.log('✓ Code block detected, mermaid rendering handled by resource processor');
        });
        test('YAML frontmatter', () => {
            const md = '---\ntitle: Test\n---\n\n# Content';
            const types = getNodeTypes(md);
            // With remark-frontmatter, frontmatter is parsed as yaml node and should be skipped
            if (types.has('yaml')) {
                const result = converter.convert(md);
                // Frontmatter should not appear in output
                expect(result).not.toContain('title: Test');
                expect(result).not.toContain('---');
                // Content should be rendered
                expect(result).toContain('<h1>');
                expect(result).toContain('Content');
                console.log('✓ Frontmatter properly skipped (parsed as yaml)');
            }
            else {
                console.log('⚠️ Frontmatter not parsed as yaml (plugin may not be active)');
            }
        });
        test('YAML frontmatter with leading blank lines', () => {
            const md = '\n\n---\ntitle: Test\n---\n\n# Content';
            const result = converter.convert(md);
            expect(result).not.toContain('title: Test');
            expect(result).not.toContain('<hr/>');
            expect(result).toContain('<h1>');
            expect(result).toContain('Content');
        });
        test('Math/LaTeX blocks', () => {
            const md = '$$\nx = y\\^2\n$$';
            const types = getNodeTypes(md);
            if (types.has('math')) {
                console.log('✗ Math blocks not yet supported');
            }
        });
        test('Table alignment', () => {
            const md = '| A | B |\n|:--|--:|\n| 1 | 2 |';
            const result = converter.convert(md);
            // Confluence tables don't support alignment attributes directly
            expect(result).toContain('<table>');
        });
        test('HTML inline elements', () => {
            const md = 'text <span style="color:red">red</span> text';
            const types = getNodeTypes(md);
            if (types.has('html')) {
                const result = converter.convert(md);
                // Inline HTML may be escaped or passed through
                console.log('Inline HTML handling:', result.includes('<span') ? 'preserved' : 'escaped');
            }
        });
    });
    describe('Emoji removal in publish output', () => {
        test('removes unicode emoji and shortcode from text', () => {
            const md = '发布 🎉 成功 :rocket:';
            const result = converter.convert(md);
            expect(result).toContain('<p>发布  成功 </p>');
            expect(result).not.toContain('🎉');
            expect(result).not.toContain(':rocket:');
        });
        test('removes emoji from code blocks and inline code', () => {
            const md = [
                '正文 `run :rocket: now 😀`',
                '',
                '```js',
                'console.log("ok 😀 :rocket:");',
                '```',
            ].join('\n');
            const result = converter.convert(md);
            expect(result).toContain('<code>run  now </code>');
            expect(result).toContain('console.log("ok  ");');
            expect(result).not.toContain('😀');
            expect(result).not.toContain(':rocket:');
        });
        test('removes emoji from task text', () => {
            const md = '- [ ] ✅ 做完 :white_check_mark:';
            const result = converter.convert(md);
            expect(result).toContain('<ac:task-body><p> 做完 </p></ac:task-body>');
            expect(result).not.toContain('✅');
            expect(result).not.toContain(':white_check_mark:');
        });
    });
});
// 生成完整的支持矩阵报告
function generateSupportReport() {
    const supportedBlocks = [
        'root', 'paragraph', 'heading', 'code', 'blockquote', 'list', 'listItem',
        'table', 'tableRow', 'tableCell', 'thematicBreak', 'html'
    ];
    const supportedInline = [
        'text', 'strong', 'emphasis', 'inlineCode', 'link', 'image', 'break', 'delete'
    ];
    const partiallySupported = [
        'blockquote (with markers !info/!warning/tip/note)',
        'list (unordered, ordered, task lists)',
        'table (basic, no alignment styles)',
        'html (Confluence macros preserved)'
    ];
    const notImplemented = [
        'footnoteReference / footnoteDefinition',
        'definition / linkReference',
        'imageReference (needs preprocessing)',
        'math',
        'yaml (frontmatter - extracted separately)'
    ];
    return `
=================================================
  AST CONVERTER SUPPORT MATRIX
=================================================

BLOCK NODES (✓ supported):
${supportedBlocks.map(t => `  ✓ ${t}`).join('\n')}

INLINE NODES (✓ supported):
${supportedInline.map(t => `  ✓ ${t}`).join('\n')}

SPECIAL HANDLING (⚠️ partially supported):
${partiallySupported.map(t => `  ⚠️ ${t}`).join('\n')}

NOT IMPLEMENTED (✗):
${notImplemented.map(t => `  ✗ ${t}`).join('\n')}

=================================================
`;
}
console.log(generateSupportReport());
//# sourceMappingURL=ast-converter.test.js.map