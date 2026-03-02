import { codeMacro, info, warning, tip, note, tocMacro, escapeXml } from "./macros.js";
export class MarkdownToConfluenceConverter {
    options;
    constructor(options = {}) {
        this.options = {
            addTocMacro: true,
            imageMapping: {},
            basePath: process.cwd(),
            ...options
        };
    }
    convertWithMetadata(markdown) {
        // Extract front matter and title
        const { content: contentWithoutFm, title: fmTitle } = this.extractFrontMatterWithTitle(markdown);
        // Extract H1 title (if no front matter title)
        const h1Title = this.extractH1Title(contentWithoutFm);
        const title = fmTitle || h1Title;
        // Perform conversion
        const storageFormat = this.convert(contentWithoutFm);
        return {
            storageFormat,
            title
        };
    }
    convert(markdown) {
        // Extract front matter
        markdown = this.extractFrontMatter(markdown);
        const parts = [];
        // Add TOC if enabled
        if (this.options.addTocMacro) {
            parts.push(tocMacro());
        }
        // Split by code blocks
        const segments = this.splitByCodeBlocks(markdown);
        for (const [type, content] of segments) {
            if (type === "code") {
                parts.push(this.convertCodeBlock(content));
            }
            else {
                parts.push(this.convertText(content));
            }
        }
        const result = parts.join("\n\n");
        return result;
    }
    extractFrontMatter(markdown) {
        const lines = markdown.split("\n");
        if (lines.length === 0 || lines[0].trim() !== "---") {
            return markdown;
        }
        let endIdx = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === "---") {
                endIdx = i;
                break;
            }
        }
        if (endIdx === -1)
            return markdown;
        return lines.slice(endIdx + 1).join("\n").trim();
    }
    splitByCodeBlocks(markdown) {
        const segments = [];
        const pattern = /\`\`\`(\w*)\n(.*?)\`\`\`/gs;
        let lastEnd = 0;
        let match;
        while ((match = pattern.exec(markdown)) !== null) {
            if (match.index > lastEnd) {
                segments.push(["text", markdown.slice(lastEnd, match.index)]);
            }
            const language = match[1].trim() || "plain";
            segments.push(["code", `${language}\n${match[2]}`]);
            lastEnd = pattern.lastIndex;
        }
        if (lastEnd < markdown.length) {
            segments.push(["text", markdown.slice(lastEnd)]);
        }
        return segments;
    }
    convertCodeBlock(content) {
        const lines = content.split("\n");
        const language = lines[0].trim();
        const code = lines.slice(1).join("\n");
        return codeMacro(code, language);
    }
    convertText(markdown) {
        // Convert blockquotes
        markdown = this.convertBlockquotes(markdown);
        // Convert headings
        markdown = this.convertHeadings(markdown);
        // Convert lists BEFORE inline
        markdown = this.convertLists(markdown);
        // Convert images BEFORE inline (so they don't become links)
        markdown = this.convertImages(markdown);
        // Convert inline
        markdown = this.convertInline(markdown);
        // Wrap paragraphs
        markdown = this.wrapParagraphs(markdown);
        return markdown;
    }
    convertImages(markdown) {
        const imageMapping = this.options.imageMapping || {};
        // Match ![alt](src) format - convert to Confluence attachment reference
        markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
            // Check if there's an image mapping for this src
            if (imageMapping[src]) {
                const mappedValue = imageMapping[src];
                // If mapped value is a URL (starts with http), use ri:url
                if (mappedValue.startsWith('http')) {
                    return `<ac:image><ri:url ri:value="${mappedValue}" /></ac:image>`;
                }
                // Otherwise assume it's a filename for ri:attachment
                return `<ac:image><ri:attachment ri:filename="${mappedValue}" /></ac:image>`;
            }
            // No mapping, extract filename from path (e.g., "./images/test.png" -> "test.png")
            const filename = src.split('/').pop().split('\\').pop();
            return `<ac:image><ri:attachment ri:filename="${filename}" /></ac:image>`;
        });
        // Match ![[src]] Obsidian format
        markdown = markdown.replace(/!\[\[([^\]]+)\]\]/g, (match, src) => {
            // Check if there's an image mapping for this src
            if (imageMapping[src]) {
                const mappedValue = imageMapping[src];
                // If mapped value is a URL (starts with http), use ri:url
                if (mappedValue.startsWith('http')) {
                    return `<ac:image><ri:url ri:value="${mappedValue}" /></ac:image>`;
                }
                // Otherwise assume it's a filename for ri:attachment
                return `<ac:image><ri:attachment ri:filename="${mappedValue}" /></ac:image>`;
            }
            // No mapping, extract filename from path
            const filename = src.split('/').pop().split('\\').pop();
            return `<ac:image><ri:attachment ri:filename="${filename}" /></ac:image>`;
        });
        return markdown;
    }
    convertBlockquotes(markdown) {
        const lines = markdown.split("\n");
        const result = [];
        let inQuote = false;
        let quoteLines = [];
        let quoteType = "note";
        for (const line of lines) {
            if (line.trim().startsWith(">")) {
                if (!inQuote) {
                    inQuote = true;
                    quoteLines = [];
                    const content = line.trim().slice(1).trim();
                    if (content.startsWith("!"))
                        quoteType = "warning";
                    else if (content.startsWith("?"))
                        quoteType = "tip";
                    else if (content.startsWith("i"))
                        quoteType = "info";
                    quoteLines.push(content.replace(/^[!?i]\s*/, ""));
                }
                else {
                    quoteLines.push(line.trim().slice(1).trim());
                }
            }
            else {
                if (inQuote) {
                    const content = quoteLines.join(" ");
                    if (quoteType === "warning")
                        result.push(warning(content));
                    else if (quoteType === "tip")
                        result.push(tip(content));
                    else if (quoteType === "info")
                        result.push(info(content));
                    else
                        result.push(note(content));
                    inQuote = false;
                }
                result.push(line);
            }
        }
        if (inQuote) {
            const content = quoteLines.join(" ");
            if (quoteType === "warning")
                result.push(warning(content));
            else if (quoteType === "tip")
                result.push(tip(content));
            else if (quoteType === "info")
                result.push(info(content));
            else
                result.push(note(content));
        }
        return result.join("\n");
    }
    convertHeadings(markdown) {
        for (let level = 6; level >= 1; level--) {
            const pattern = new RegExp(`^#{${level}}\\s*(.+)$`, "gm");
            markdown = markdown.replace(pattern, `<h${level}>$1</h${level}>`);
        }
        return markdown;
    }
    convertLists(markdown) {
        const lines = markdown.split("\n");
        const result = [];
        let inUnorderedList = false;
        let inOrderedList = false;
        const listItems = [];
        const closeList = () => {
            if (inUnorderedList) {
                result.push("<ul>");
                for (const item of listItems) {
                    result.push(`  <li>${item}</li>`);
                }
                result.push("</ul>");
                listItems.length = 0;
                inUnorderedList = false;
            }
            else if (inOrderedList) {
                result.push("<ol>");
                for (const item of listItems) {
                    result.push(`  <li>${item}</li>`);
                }
                result.push("</ol>");
                listItems.length = 0;
                inOrderedList = false;
            }
        };
        for (const line of lines) {
            const unorderedMatch = line.match(/^[\s]*[-\*\+]\s+(.+)$/);
            const orderedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
            if (unorderedMatch) {
                if (inOrderedList) {
                    closeList();
                }
                inUnorderedList = true;
                listItems.push(unorderedMatch[1]);
            }
            else if (orderedMatch) {
                if (inUnorderedList) {
                    closeList();
                }
                inOrderedList = true;
                listItems.push(orderedMatch[1]);
            }
            else {
                closeList();
                result.push(line);
            }
        }
        closeList();
        return result.join("\n");
    }
    convertInline(markdown) {
        // Bold
        markdown = markdown.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        // Italic
        markdown = markdown.replace(/\*(.+?)\*/g, "<em>$1</em>");
        markdown = markdown.replace(/_(.+?)_/g, "<em>$1</em>");
        // Inline code
        markdown = markdown.replace(/`(.+?)`/g, "<code>$1</code>");
        // Links
        markdown = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2">$1</a>`);
        // Obsidian links [[page]]
        markdown = markdown.replace(/\[\[([^\]]+)\]\]/g, (match, content) => {
            const display = content.includes("|") ? content.split("|")[1].trim() : content.trim();
            return `<strong>${escapeXml(display)}</strong>`;
        });
        return markdown;
    }
    wrapParagraphs(markdown) {
        const lines = markdown.split("\n");
        const result = [];
        const buffer = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                if (buffer.length > 0) {
                    const text = buffer.join(" ");
                    if (!text.startsWith("<")) {
                        result.push(`<p>${text}</p>`);
                    }
                    else {
                        result.push(text);
                    }
                    buffer.length = 0;
                }
                result.push("");
            }
            else if (trimmed.startsWith("<")) {
                if (buffer.length > 0) {
                    const text = buffer.join(" ");
                    result.push(!text.startsWith("<") ? `<p>${text}</p>` : text);
                    buffer.length = 0;
                }
                result.push(trimmed);
            }
            else {
                buffer.push(trimmed);
            }
        }
        if (buffer.length > 0) {
            const text = buffer.join(" ");
            result.push(!text.startsWith("<") ? `<p>${text}</p>` : text);
        }
        return result.join("\n");
    }
    extractFrontMatterWithTitle(markdown) {
        const lines = markdown.split("\n");
        if (lines.length === 0 || lines[0].trim() !== "---") {
            return { content: markdown };
        }
        let endIdx = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === "---") {
                endIdx = i;
                break;
            }
        }
        if (endIdx === -1)
            return { content: markdown };
        const fmLines = lines.slice(1, endIdx);
        let title;
        for (const line of fmLines) {
            const match = line.match(/^title:\s*(.+)$/);
            if (match) {
                title = match[1].trim().replace(/^["']|["']$/g, '');
                break;
            }
        }
        return {
            content: lines.slice(endIdx + 1).join("\n").trim(),
            title
        };
    }
    extractH1Title(markdown) {
        const match = markdown.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : undefined;
    }
}
//# sourceMappingURL=converter.js.map