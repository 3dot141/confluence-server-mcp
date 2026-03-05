// src/infrastructure/markdown/remark-parser.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
export class RemarkMarkdownParser {
    // eslint-disable-next-line no-misleading-character-class
    static EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{1F191}-\u{1F251}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}]|[\u{200D}]|[\u{FE0F}]|[\u{E0000}-\u{E007F}]|[\u{2190}-\u{21FF}]|[\u{2B00}-\u{2BFF}]|[\u{2300}-\u{23FF}]/gu;
    static EMOJI_SHORTCODE_REGEX = /:[\w+-]+:/g;
    // Use GFM plugin for tables, strikethrough, etc. and frontmatter for YAML
    parser = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter);
    stringifier = unified().use(remarkStringify).use(remarkGfm).use(remarkFrontmatter);
    /**
     * Normalize document preamble so YAML frontmatter can still be detected
     * when markdown starts with BOM or blank lines.
     */
    normalizeFrontmatterPreamble(markdown) {
        return markdown
            .replace(/^\uFEFF/, '')
            .replace(/^(?:[ \t]*\r?\n)+(?=---\r?\n)/, '');
    }
    /**
     * Strip YAML frontmatter block at document start.
     * Used by publish pipeline to avoid leaking metadata into page content.
     */
    stripYamlFrontmatter(markdown) {
        const normalized = this.normalizeFrontmatterPreamble(markdown);
        const stripped = normalized.replace(/^[ \t]*---[ \t]*\r?\n[\s\S]*?\r?\n[ \t]*---[ \t]*(?:\r?\n|$)/, '');
        if (stripped !== normalized) {
            return stripped.replace(/^(?:[ \t]*\r?\n)+/, '');
        }
        return stripped;
    }
    /**
     * Preprocess markdown to convert Obsidian ![[image]] format to standard ![image]()
     */
    preprocessObsidianSyntax(markdown) {
        // Convert ![[image.png]] to ![image.png](image.png)
        return markdown.replace(/!\[\[([^\]]+)\]\]/g, '![$1]($1)');
    }
    /**
     * Preprocess blockquote markers to ensure proper detection
     */
    preprocessBlockquoteMarkers(markdown) {
        // Convert emoji + text to marker format for consistency
        return markdown
            .replace(/^>\s*[ℹ️]\s*/gm, '> !info ')
            .replace(/^>\s*[⚠️]\s*/gm, '> !warning ')
            .replace(/^>\s*[💡]\s*/gm, '> !tip ')
            .replace(/^>\s*[📝]\s*/gm, '> !note ');
    }
    /**
     * Remove unicode emojis and :shortcode: style emojis.
     */
    stripEmojis(text) {
        return text
            .replace(RemarkMarkdownParser.EMOJI_REGEX, '')
            .replace(RemarkMarkdownParser.EMOJI_SHORTCODE_REGEX, '');
    }
    /**
     * Parse markdown to AST with preprocessing
     */
    parse(markdown) {
        let preprocessed = this.normalizeFrontmatterPreamble(markdown);
        preprocessed = this.preprocessObsidianSyntax(preprocessed);
        return this.parser.parse(preprocessed);
    }
    /**
     * Parse with full preprocessing including blockquote markers
     */
    parseFull(markdown) {
        let preprocessed = this.normalizeFrontmatterPreamble(markdown);
        preprocessed = this.preprocessObsidianSyntax(preprocessed);
        preprocessed = this.preprocessBlockquoteMarkers(preprocessed);
        return this.parser.parse(preprocessed);
    }
    /**
     * Stringify AST back to markdown
     */
    stringify(ast) {
        return this.stringifier.stringify(ast);
    }
    /**
     * Extract all resources that need async processing
     * Single-pass AST traversal
     */
    extractResources(ast) {
        const resources = {
            images: [],
            mermaids: [],
            confluenceMacros: [],
        };
        let imageIndex = 0;
        let mermaidIndex = 0;
        visit(ast, (node) => {
            // Extract images
            if (node.type === 'image') {
                const img = node;
                const isLocal = !img.url.startsWith('http') && !img.url.startsWith('data:');
                resources.images.push({
                    node: img,
                    src: img.url,
                    isLocal,
                    placeholder: `<!--LOCAL_IMAGE_${imageIndex++}-->`,
                });
            }
            // Extract mermaid code blocks
            if (node.type === 'code') {
                const code = node;
                if (code.lang === 'mermaid') {
                    resources.mermaids.push({
                        node: code,
                        content: code.value,
                        placeholder: `<!--MERMAID_DIAGRAM_${mermaidIndex++}-->`,
                    });
                }
            }
            // Detect existing Confluence macros (preserve them)
            if (node.type === 'html') {
                const html = node;
                if (this.isConfluenceMacro(html.value)) {
                    resources.confluenceMacros.push({
                        node: html,
                        content: html.value,
                    });
                }
            }
        });
        return resources;
    }
    /**
     * Replace resources in AST with processed results
     */
    replaceResources(ast, imageMap, mermaidMap) {
        // Replace image URLs
        visit(ast, 'image', (node) => {
            const newUrl = imageMap.get(node.url);
            if (newUrl) {
                node.url = newUrl;
            }
        });
        // Replace mermaid code blocks with image references
        let mermaidIndex = 0;
        visit(ast, 'code', (node, index, parent) => {
            if (node.lang === 'mermaid' && parent) {
                const placeholder = `<!--MERMAID_DIAGRAM_${mermaidIndex++}-->`;
                const imageUrl = mermaidMap.get(placeholder);
                if (imageUrl) {
                    // Replace code node with image node
                    const imageNode = {
                        type: 'image',
                        url: imageUrl,
                        alt: 'Mermaid diagram',
                        title: null,
                    };
                    parent.children[index] = imageNode;
                }
            }
        });
    }
    /**
     * Detect blockquote with special markers (!info, !warning, etc.)
     */
    detectBlockquoteMarker(node) {
        const firstChild = node.children[0];
        if (firstChild?.type !== 'paragraph')
            return null;
        const firstText = firstChild.children[0];
        if (firstText?.type !== 'text')
            return null;
        const text = firstText.value.trim();
        if (text.startsWith('!info') || text.startsWith('ℹ️'))
            return 'info';
        if (text.startsWith('!warning') || text.startsWith('⚠️'))
            return 'warning';
        if (text.startsWith('!tip') || text.startsWith('💡'))
            return 'tip';
        if (text.startsWith('!note') || text.startsWith('📝'))
            return 'note';
        return null;
    }
    /**
     * Remove marker from blockquote text
     */
    cleanBlockquoteText(node) {
        const firstChild = node.children[0];
        const firstText = firstChild.children[0];
        // Remove marker prefix
        firstText.value = firstText.value
            .replace(/^!(info|warning|tip|note)\s*/i, '')
            .replace(/^[ℹ️⚠️💡📝]\s*/, '');
    }
    /**
     * Check if HTML is a Confluence macro
     */
    isConfluenceMacro(html) {
        return html.includes('ac:') ||
            html.includes('ri:') ||
            html.includes('ac-structure');
    }
    /**
     * Process text for inline elements
     * Returns cleaned text and inline element info
     */
    processInlineText(nodes) {
        const result = [];
        for (const node of nodes) {
            switch (node.type) {
                case 'text':
                    result.push({ type: 'text', value: node.value });
                    break;
                case 'strong':
                    result.push({ type: 'strong', value: this.stringifyInline(node) });
                    break;
                case 'emphasis':
                    result.push({ type: 'emphasis', value: this.stringifyInline(node) });
                    break;
                case 'inlineCode':
                    result.push({ type: 'code', value: node.value });
                    break;
                case 'link':
                    const link = node;
                    result.push({ type: 'link', value: this.stringifyInline(link), url: link.url });
                    break;
                case 'delete':
                    // Strikethrough - treat as regular text with markers
                    result.push({ type: 'text', value: this.stringifyInline(node) });
                    break;
                case 'break':
                    result.push({ type: 'text', value: '\n' });
                    break;
                default:
                    // Unknown inline node, convert to string
                    result.push({ type: 'text', value: this.stringifyInline(node) });
            }
        }
        return result;
    }
    /**
     * Helper to stringify inline content
     */
    stringifyInline(node) {
        const fragment = {
            type: 'root',
            children: node.children,
        };
        return this.stringifier.stringify(fragment).trim();
    }
    /**
     * Extract frontmatter title
     */
    extractTitle(markdown) {
        // Check YAML frontmatter (supports BOM, leading blank lines, CRLF)
        const normalized = this.normalizeFrontmatterPreamble(markdown);
        const frontMatterMatch = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
        if (frontMatterMatch) {
            const titleMatch = frontMatterMatch[1].match(/^\s*title\s*:\s*(.+?)\s*$/m);
            if (titleMatch) {
                return titleMatch[1].trim().replace(/^["']|["']$/g, '');
            }
        }
        // Parse AST and check for H1
        const ast = this.parse(markdown);
        let title;
        visit(ast, 'heading', (node) => {
            if (node.depth === 1 && !title) {
                const text = this.stringifyInline(node);
                title = text;
            }
        });
        return title;
    }
    /**
     * Check if list is a task list (GFM extension)
     */
    isTaskList(list) {
        if (list.children.length === 0)
            return false;
        // GFM adds `checked` property to ListItem
        const firstItem = list.children[0];
        return firstItem.checked !== null && firstItem.checked !== undefined;
    }
    /**
     * Extract task list items (GFM extension)
     */
    extractTaskItems(list) {
        const items = [];
        for (const listItem of list.children) {
            const checked = listItem.checked === true;
            let text = '';
            for (const child of listItem.children) {
                if (child.type === 'paragraph') {
                    const para = child;
                    // Get text content without the checkbox marker
                    const paraText = this.stringifyInline(para);
                    // Remove [ ] or [x] prefix if present
                    text = paraText.replace(/^\[[ x]\]\s*/, '');
                }
            }
            items.push({ text, checked });
        }
        return items;
    }
}
//# sourceMappingURL=remark-parser.js.map