// src/infrastructure/markdown/remark-parser.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
export class RemarkMarkdownParser {
    // Use GFM plugin for tables, strikethrough, etc.
    parser = unified().use(remarkParse).use(remarkGfm);
    stringifier = unified().use(remarkStringify).use(remarkGfm);
    /**
     * Preprocess markdown to convert Obsidian ![[image]] format to standard ![image]()
     */
    preprocessObsidianSyntax(markdown) {
        // Convert ![[image.png]] to ![image.png](image.png)
        return markdown.replace(/!\[\[([^\]]+)\]\]/g, '![$1]($1)');
    }
    /**
     * Parse markdown to AST with preprocessing
     */
    parse(markdown) {
        const preprocessed = this.preprocessObsidianSyntax(markdown);
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
        visit(ast, 'code', (node, index, parent) => {
            if (node.lang === 'mermaid' && parent) {
                const imageUrl = mermaidMap.get(node.value);
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
        // Check YAML frontmatter
        const frontMatterMatch = markdown.match(/^---\n[\s\S]*?title:\s*(.+?)\n[\s\S]*?---/);
        if (frontMatterMatch) {
            return frontMatterMatch[1].trim().replace(/^["']|["']$/g, '');
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