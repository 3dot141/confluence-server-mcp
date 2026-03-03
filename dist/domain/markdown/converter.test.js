// src/domain/markdown/converter.test.ts
import { describe, it, expect } from "vitest";
import { MarkdownToConfluenceConverter } from "./converter.js";
describe("MarkdownToConfluenceConverter - Table Conversion", () => {
    const converter = new MarkdownToConfluenceConverter({ addTocMacro: false });
    it("should convert simple markdown table to Confluence format", () => {
        const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`;
        const result = converter.convert(markdown);
        expect(result).toContain("<table>");
        expect(result).toContain("</table>");
        expect(result).toContain("<thead>");
        expect(result).toContain("</thead>");
        expect(result).toContain("<tbody>");
        expect(result).toContain("</tbody>");
        expect(result).toContain("<th>Header 1</th>");
        expect(result).toContain("<th>Header 2</th>");
        expect(result).toContain("<td>Cell 1</td>");
        expect(result).toContain("<td>Cell 2</td>");
        expect(result).toContain("<td>Cell 3</td>");
        expect(result).toContain("<td>Cell 4</td>");
    });
    it("should convert table with inline formatting", () => {
        const markdown = `
| Name | Description |
|------|-------------|
| **Bold** | *Italic* |
| \`code\` | [Link](http://example.com) |
`;
        const result = converter.convert(markdown);
        expect(result).toContain("<th>Name</th>");
        expect(result).toContain("<th>Description</th>");
        expect(result).toContain("<td><strong>Bold</strong></td>");
        expect(result).toContain("<td><em>Italic</em></td>");
        expect(result).toContain("<td><code>code</code></td>");
        expect(result).toContain('<td><a href="http://example.com">Link</a></td>');
    });
    it("should handle table with alignment separators", () => {
        const markdown = `
| Left | Center | Right |
|:-----|:------:|------:|
| L    | C      | R     |
`;
        const result = converter.convert(markdown);
        expect(result).toContain("<th>Left</th>");
        expect(result).toContain("<th>Center</th>");
        expect(result).toContain("<th>Right</th>");
        expect(result).toContain("<td>L</td>");
        expect(result).toContain("<td>C</td>");
        expect(result).toContain("<td>R</td>");
    });
    it("should handle empty cells in table", () => {
        const markdown = `
| A | B | C |
|---|---|---|
| 1 |   | 3 |
`;
        const result = converter.convert(markdown);
        expect(result).toContain("<td>1</td>");
        expect(result).toContain("<td>3</td>");
    });
    it("should convert table mixed with other content", () => {
        const markdown = `
Some paragraph text.

| Header | Value |
|--------|-------|
| Row 1  | A     |

More text after table.
`;
        const result = converter.convert(markdown);
        expect(result).toContain("<p>Some paragraph text.</p>");
        expect(result).toContain("<table>");
        expect(result).toContain("</table>");
        expect(result).toContain("<p>More text after table.</p>");
    });
});
//# sourceMappingURL=converter.test.js.map