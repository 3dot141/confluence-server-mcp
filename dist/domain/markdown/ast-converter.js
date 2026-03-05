import { RemarkMarkdownParser } from '../../infrastructure/markdown/remark-parser.js';
import { escapeXml, escapeXmlAttr, tocMacro, codeMacro } from './macros.js';
/**
 * AST-based Markdown to Confluence Converter
 * Transforms remark AST to Confluence Storage Format
 */
export class ASTMarkdownToConfluenceConverter {
    parser = new RemarkMarkdownParser();
    options;
    constructor(options = {}) {
        this.options = {
            addTocMacro: true,
            imageMapping: {},
            basePath: process.cwd(),
            ...options,
        };
    }
    /**
     * Convert markdown to Confluence Storage Format (synchronous, no resource processing)
     * Uses full preprocessing including blockquote markers
     */
    convert(markdown) {
        const ast = this.parser.parseFull(markdown);
        return this.transformToConfluence(ast);
    }
    /**
     * Convert with metadata extraction
     */
    convertWithMetadata(markdown) {
        const ast = this.parser.parseFull(markdown);
        const title = this.parser.extractTitle(markdown);
        const storageFormat = this.transformToConfluence(ast);
        return { storageFormat, title };
    }
    /**
     * Async convert with resource processing
     * Requires external resource handling
     */
    async convertAsync(markdown, imageMap, mermaidMap) {
        const ast = this.parser.parse(markdown);
        // Replace resources in AST
        this.parser.replaceResources(ast, imageMap, mermaidMap);
        const title = this.parser.extractTitle(markdown);
        const storageFormat = this.transformToConfluence(ast);
        return {
            storageFormat,
            title,
            imagesProcessed: imageMap.size,
            mermaidsProcessed: mermaidMap.size,
        };
    }
    /**
     * Main transformation: AST -> Confluence XML
     */
    transformToConfluence(ast) {
        const parts = [];
        // Add TOC macro if enabled
        if (this.options.addTocMacro) {
            parts.push(tocMacro());
        }
        // Process each child node
        for (const child of ast.children) {
            const converted = this.convertNode(child);
            if (converted) {
                parts.push(converted);
            }
        }
        return parts.join('\n\n');
    }
    /**
     * Convert a single node
     */
    convertNode(node) {
        // Skip non-renderable nodes (yaml, definitions, etc.)
        if (!node || typeof node.type !== 'string') {
            return null;
        }
        switch (node.type) {
            case 'yaml':
                // Skip YAML frontmatter - it's metadata, not content
                return null;
            case 'heading':
                return this.convertHeading(node);
            case 'paragraph':
                return this.convertParagraph(node);
            case 'code':
                return this.convertCode(node);
            case 'blockquote':
                return this.convertBlockquote(node);
            case 'list':
                return this.convertList(node);
            case 'table':
                return this.convertTable(node);
            case 'thematicBreak':
                return '<hr/>';
            case 'html':
                return this.convertHtml(node);
            case 'image':
                return this.convertImage(node);
            default:
                // Unknown block type, try to stringify
                console.warn(`Unknown node type: ${node.type}`);
                return null;
        }
    }
    /**
     * Convert heading to h1-h6
     */
    convertHeading(node) {
        const level = Math.min(Math.max(node.depth, 1), 6);
        const content = this.convertInlineNodes(node.children);
        return `<h${level}>${content}</h${level}>`;
    }
    /**
     * Convert paragraph
     */
    convertParagraph(node) {
        const content = this.convertInlineNodes(node.children);
        return content ? `<p>${content}</p>` : '';
    }
    /**
     * Convert code block to Confluence code macro
     */
    convertCode(node) {
        const lang = node.lang || 'plain';
        return codeMacro(node.value, lang);
    }
    /**
     * Convert blockquote
     * Support special markers: !info, !warning, !tip, !note
     */
    convertBlockquote(node) {
        const marker = this.parser.detectBlockquoteMarker(node);
        if (marker) {
            // Clean marker from text
            this.parser.cleanBlockquoteText(node);
            const content = this.convertBlockquoteContent(node);
            switch (marker) {
                case 'info':
                    return this.createInfoMacro(content);
                case 'warning':
                    return this.createWarningMacro(content);
                case 'tip':
                    return this.createTipMacro(content);
                case 'note':
                    return this.createNoteMacro(content);
            }
        }
        // Regular blockquote
        const content = this.convertBlockquoteContent(node);
        return `<blockquote>${content}</blockquote>`;
    }
    /**
     * Convert blockquote content (can contain multiple blocks)
     */
    convertBlockquoteContent(node) {
        const parts = [];
        for (const child of node.children) {
            const converted = this.convertNode(child);
            if (converted) {
                parts.push(converted);
            }
        }
        return parts.join('\n');
    }
    /**
     * Convert list (ul/ol/task-list)
     */
    convertList(node) {
        const isOrdered = node.ordered || false;
        const isTaskList = this.parser.isTaskList(node);
        if (isTaskList) {
            return this.convertTaskList(node);
        }
        const tag = isOrdered ? 'ol' : 'ul';
        const items = [];
        for (const item of node.children) {
            const content = this.convertListItem(item);
            items.push(`<li>${content}</li>`);
        }
        return `<${tag}>\n${items.join('\n')}\n</${tag}>`;
    }
    /**
     * Convert list item content
     */
    convertListItem(item) {
        const parts = [];
        for (const child of item.children) {
            if (child.type === 'paragraph') {
                const content = this.convertInlineNodes(child.children);
                parts.push(content);
            }
            else if (child.type === 'list') {
                const nested = this.convertList(child);
                parts.push(nested);
            }
            else {
                const converted = this.convertNode(child);
                if (converted) {
                    parts.push(converted);
                }
            }
        }
        return parts.join('\n');
    }
    /**
     * Convert task list to Confluence task list macro
     */
    convertTaskList(node) {
        const tasks = this.parser.extractTaskItems(node);
        let taskXml = '<ac:task-list>\n';
        tasks.forEach((task, index) => {
            const status = task.checked ? 'complete' : 'incomplete';
            taskXml += `  <ac:task>
    <ac:task-id>${index + 1}</ac:task-id>
    <ac:task-status>${status}</ac:task-status>
    <ac:task-body><p>${escapeXml(task.text)}</p></ac:task-body>
  </ac:task>\n`;
        });
        taskXml += '</ac:task-list>';
        return taskXml;
    }
    /**
     * Convert table to Confluence table
     */
    convertTable(node) {
        if (node.children.length === 0) {
            return '';
        }
        const rows = [];
        let hasHeader = false;
        for (let i = 0; i < node.children.length; i++) {
            const rowNode = node.children[i];
            const isHeader = i === 0;
            const cells = [];
            for (const cell of rowNode.children) {
                const cellContent = this.convertInlineNodes(cell.children);
                const cellTag = isHeader ? 'th' : 'td';
                cells.push(`<${cellTag}>${cellContent}</${cellTag}>`);
            }
            if (isHeader) {
                hasHeader = true;
                rows.push(`<tr>\n${cells.join('\n')}\n</tr>`);
            }
            else {
                rows.push(`<tr>\n${cells.join('\n')}\n</tr>`);
            }
        }
        const headerHtml = hasHeader ? rows[0] : '';
        const bodyHtml = hasHeader ? rows.slice(1).join('\n') : rows.join('\n');
        let tableHtml = '<table>\n';
        if (headerHtml) {
            tableHtml += `<thead>\n${headerHtml}\n</thead>\n`;
        }
        tableHtml += `<tbody>\n${bodyHtml}\n</tbody>\n`;
        tableHtml += '</table>';
        return tableHtml;
    }
    /**
     * Convert HTML node (preserve Confluence macros)
     */
    convertHtml(node) {
        // Check if it's a Confluence macro - preserve as-is
        if (this.isConfluenceMacro(node.value)) {
            return node.value;
        }
        // Other HTML - escape or handle as needed
        return node.value;
    }
    /**
     * Convert inline nodes
     */
    convertInlineNodes(nodes) {
        return nodes.map(node => this.convertInlineNode(node)).join('');
    }
    /**
     * Convert single inline node
     */
    convertInlineNode(node) {
        switch (node.type) {
            case 'text':
                return escapeXml(node.value);
            case 'strong':
                return `<strong>${this.convertInlineNodes(node.children)}</strong>`;
            case 'emphasis':
                return `<em>${this.convertInlineNodes(node.children)}</em>`;
            case 'inlineCode':
                return `<code>${escapeXml(node.value)}</code>`;
            case 'link':
                const link = node;
                const linkText = this.convertInlineNodes(link.children);
                return `<a href="${escapeXmlAttr(link.url)}">${linkText}</a>`;
            case 'image':
                return this.convertImage(node);
            case 'break':
                return '<br/>';
            case 'delete':
                // Strikethrough - Confluence doesn't have native support
                return `<s>${this.convertInlineNodes(node.children)}</s>`;
            default:
                return '';
        }
    }
    /**
     * Convert image to Confluence image macro
     */
    convertImage(node) {
        const alt = escapeXmlAttr(node.alt || '');
        // Check if URL is in imageMapping
        const mappedValue = this.options.imageMapping?.[node.url];
        if (mappedValue) {
            if (mappedValue.startsWith('http')) {
                return `<ac:image ac:alt="${alt}"><ri:url ri:value="${escapeXmlAttr(mappedValue)}" /></ac:image>`;
            }
            return `<ac:image ac:alt="${alt}"><ri:attachment ri:filename="${escapeXmlAttr(mappedValue)}" /></ac:image>`;
        }
        // Use original URL
        if (node.url.startsWith('http')) {
            return `<ac:image ac:alt="${alt}"><ri:url ri:value="${escapeXmlAttr(node.url)}" /></ac:image>`;
        }
        // Local file - use as attachment reference
        const filename = node.url.split('/').pop()?.split('\\').pop() || node.url;
        return `<ac:image ac:alt="${alt}"><ri:attachment ri:filename="${escapeXmlAttr(filename)}" /></ac:image>`;
    }
    /**
     * Check if HTML contains Confluence macros
     */
    isConfluenceMacro(html) {
        return html.includes('ac:') || html.includes('ri:') || html.includes('ac-structure');
    }
    /**
     * Create info macro
     */
    createInfoMacro(content) {
        return `<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text><p>${content}</p></ac:rich-text>
</ac:structured-macro>`;
    }
    /**
     * Create warning macro
     */
    createWarningMacro(content) {
        return `<ac:structured-macro ac:name="warning" ac:schema-version="1">
  <ac:rich-text><p>${content}</p></ac:rich-text>
</ac:structured-macro>`;
    }
    /**
     * Create tip macro
     */
    createTipMacro(content) {
        return `<ac:structured-macro ac:name="tip" ac:schema-version="1">
  <ac:rich-text><p>${content}</p></ac:rich-text>
</ac:structured-macro>`;
    }
    /**
     * Create note macro
     */
    createNoteMacro(content) {
        return `<ac:structured-macro ac:name="note" ac:schema-version="1">
  <ac:rich-text><p>${content}</p></ac:rich-text>
</ac:structured-macro>`;
    }
}
//# sourceMappingURL=ast-converter.js.map