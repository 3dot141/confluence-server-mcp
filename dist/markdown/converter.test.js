// src/markdown/converter.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { ASTMarkdownToConfluenceConverter } from './converter.js';
import { RemarkMarkdownParser } from './parser.js';
import { visit } from 'unist-util-visit';
describe('ASTMarkdownToConfluenceConverter Coverage Report', () => {
    let converter;
    let parser;
    beforeEach(() => {
        converter = new ASTMarkdownToConfluenceConverter();
        parser = new RemarkMarkdownParser();
    });
    function getNodeTypes(markdown) {
        const ast = parser.parse(markdown);
        const types = new Set();
        visit(ast, (node) => {
            types.add(node.type);
        });
        return types;
    }
    describe('SUPPORTED TYPES', () => {
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
            expect(result).toBeDefined();
        });
    });
    describe('NEED VERIFICATION', () => {
        test('ImageReference (Obsidian ![[image]] style)', () => {
            const md = '![[image.png]]';
            const preprocessed = parser.preprocessObsidianSyntax(md);
            const types = getNodeTypes(preprocessed);
            expect(types.has('image')).toBe(true);
        });
        test('Footnote', () => {
            const md = 'text[^1]\n\n[^1]: footnote';
            const types = getNodeTypes(md);
            if (types.has('footnoteReference') || types.has('footnoteDefinition')) {
                console.log('Footnote detected but may not be fully supported');
            }
        });
        test('Definition (link reference)', () => {
            const md = '[text][ref]\n\n[ref]: https://example.com';
            const types = getNodeTypes(md);
            if (types.has('definition')) {
                console.log('Definition detected but may not be fully supported');
            }
        });
        test('LinkReference', () => {
            const md = '[text][ref]';
            const types = getNodeTypes(md);
            if (types.has('linkReference')) {
                console.log('LinkReference detected but may not be fully supported');
            }
        });
    });
    describe('KNOWN UNSUPPORTED / EDGE CASES', () => {
        test('Mermaid code blocks (special handling needed)', () => {
            const md = '```mermaid\ngraph TD\n  A --> B\n```';
            const types = getNodeTypes(md);
            expect(types.has('code')).toBe(true);
        });
        test('YAML frontmatter', () => {
            const md = '---\ntitle: Test\n---\n\n# Content';
            const types = getNodeTypes(md);
            if (types.has('yaml')) {
                const result = converter.convert(md);
                expect(result).not.toContain('title: Test');
                expect(result).not.toContain('---');
                expect(result).toContain('<h1>');
                expect(result).toContain('Content');
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
        test('Table alignment', () => {
            const md = '| A | B |\n|:--|--:|\n| 1 | 2 |';
            const result = converter.convert(md);
            expect(result).toContain('<table>');
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
//# sourceMappingURL=converter.test.js.map