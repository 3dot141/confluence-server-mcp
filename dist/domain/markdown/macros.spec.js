// src/domain/markdown/macros.spec.ts
import { describe, test, expect } from 'vitest';
import { tocMacro, info, warning, tip, note, codeMacro, escapeXml, escapeXmlAttr, } from './macros.js';
describe('macros', () => {
    describe('tocMacro', () => {
        test('should return easy-heading-free macro', () => {
            const result = tocMacro();
            expect(result).toContain('ac:name="easy-heading-free"');
            expect(result).toContain('ac:parameter ac:name="navigationExpandOption"');
            expect(result).toContain('collapse-all-but-headings-1');
            expect(result).toContain('ac:rich-text-body');
        });
    });
    describe('info', () => {
        test('should return info macro with content', () => {
            const result = info('Test info message');
            expect(result).toContain('ac:name="info"');
            expect(result).toContain('Test info message');
        });
        test('should escape XML special characters', () => {
            const result = info('Test <script> alert("xss") </script>');
            expect(result).toContain('&lt;script&gt;');
            expect(result).not.toContain('<script>');
        });
    });
    describe('warning', () => {
        test('should return warning macro with content', () => {
            const result = warning('Test warning message');
            expect(result).toContain('ac:name="warning"');
            expect(result).toContain('Test warning message');
        });
    });
    describe('tip', () => {
        test('should return tip macro with content', () => {
            const result = tip('Test tip message');
            expect(result).toContain('ac:name="tip"');
            expect(result).toContain('Test tip message');
        });
    });
    describe('note', () => {
        test('should return note macro with content', () => {
            const result = note('Test note message');
            expect(result).toContain('ac:name="note"');
            expect(result).toContain('Test note message');
        });
    });
    describe('codeMacro', () => {
        test('should return code macro with language', () => {
            const result = codeMacro('const x = 1;', 'javascript');
            expect(result).toContain('ac:name="code"');
            expect(result).toContain('ac:parameter ac:name="language"');
            expect(result).toContain('javascript');
            expect(result).toContain('<![CDATA[');
            expect(result).toContain('const x = 1;');
        });
        test('should normalize language aliases', () => {
            expect(codeMacro('', 'js')).toContain('javascript');
            expect(codeMacro('', 'ts')).toContain('javascript');
            expect(codeMacro('', 'py')).toContain('python');
            expect(codeMacro('', 'yml')).toContain('yaml');
        });
        test('should handle unknown languages', () => {
            const result = codeMacro('code', 'unknown-lang');
            expect(result).not.toContain('ac:parameter ac:name="language"');
        });
        test('should escape CDATA end sequence', () => {
            const result = codeMacro(']]>', 'plain');
            expect(result).toContain(']]]]><![CDATA[>');
        });
    });
    describe('escapeXml', () => {
        test('should escape special XML characters', () => {
            expect(escapeXml('<')).toBe('&lt;');
            expect(escapeXml('>')).toBe('&gt;');
            expect(escapeXml('&')).toBe('&amp;');
            expect(escapeXml('"')).toBe('&quot;');
            expect(escapeXml("'")).toBe('&apos;');
        });
        test('should handle complex text', () => {
            const input = 'Test <div>content</div> & "more"';
            const result = escapeXml(input);
            expect(result).toBe('Test &lt;div&gt;content&lt;/div&gt; &amp; &quot;more&quot;');
        });
    });
    describe('escapeXmlAttr', () => {
        test('should escape special XML characters for attributes', () => {
            expect(escapeXmlAttr('<')).toBe('&lt;');
            expect(escapeXmlAttr('>')).toBe('&gt;');
            expect(escapeXmlAttr('&')).toBe('&amp;');
            expect(escapeXmlAttr('"')).toBe('&quot;');
            expect(escapeXmlAttr("'")).toBe('&apos;');
        });
    });
});
//# sourceMappingURL=macros.spec.js.map