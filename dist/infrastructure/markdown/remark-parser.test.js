import { describe, test, expect } from 'vitest';
import { RemarkMarkdownParser } from './remark-parser.js';
describe('RemarkMarkdownParser', () => {
    const parser = new RemarkMarkdownParser();
    test('stripYamlFrontmatter removes frontmatter at document start', () => {
        const markdown = '\n\n---\r\ntitle: "Sample"\r\ndraft: false\r\n---\r\n\r\n# Heading\r\nBody';
        const stripped = parser.stripYamlFrontmatter(markdown);
        expect(stripped).not.toContain('title: "Sample"');
        expect(stripped.startsWith('# Heading')).toBe(true);
    });
    test('stripYamlFrontmatter keeps markdown unchanged when no frontmatter', () => {
        const markdown = '# Heading\n\nBody';
        const stripped = parser.stripYamlFrontmatter(markdown);
        expect(stripped).toBe(markdown);
    });
    test('extractTitle reads title from frontmatter with leading blank lines', () => {
        const markdown = '\n---\ntitle: "Frontmatter Title"\n---\n\n# Heading';
        expect(parser.extractTitle(markdown)).toBe('Frontmatter Title');
    });
});
//# sourceMappingURL=remark-parser.test.js.map