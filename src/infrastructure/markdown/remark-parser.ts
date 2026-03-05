// src/infrastructure/markdown/remark-parser.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { visit, Visitor } from 'unist-util-visit';
import type {
  Root,
  Node,
  Code,
  Image,
  Html,
  Blockquote,
  Paragraph,
  Text,
  Link,
  Heading,
  List,
  ListItem,
  Table,
  TableRow,
  TableCell,
  Emphasis,
  Strong,
  Delete,
  InlineCode,
  Break,
  ThematicBreak,
  BlockContent,
  Definition,
  FootnoteReference,
  FootnoteDefinition,
} from 'mdast';

export interface ExtractedResource {
  type: 'image' | 'mermaid';
  node: Image | Code;
  originalValue: string;
  placeholder: string;
  index: number;
}

export interface ExtractedResources {
  images: Array<{
    node: Image;
    src: string;
    isLocal: boolean;
    placeholder: string;
  }>;
  mermaids: Array<{
    node: Code;
    content: string;
    placeholder: string;
  }>;
  confluenceMacros: Array<{
    node: Html;
    content: string;
  }>;
}

export interface ResourceReplacement {
  placeholder: string;
  value: string;
}

export class RemarkMarkdownParser {
  // Use GFM plugin for tables, strikethrough, etc. and frontmatter for YAML
  private parser = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter);
  private stringifier = unified().use(remarkStringify).use(remarkGfm).use(remarkFrontmatter);

  /**
   * Normalize document preamble so YAML frontmatter can still be detected
   * when markdown starts with BOM or blank lines.
   */
  private normalizeFrontmatterPreamble(markdown: string): string {
    return markdown
      .replace(/^\uFEFF/, '')
      .replace(/^(?:[ \t]*\r?\n)+(?=---\r?\n)/, '');
  }

  /**
   * Strip YAML frontmatter block at document start.
   * Used by publish pipeline to avoid leaking metadata into page content.
   */
  stripYamlFrontmatter(markdown: string): string {
    const normalized = this.normalizeFrontmatterPreamble(markdown);
    const stripped = normalized.replace(
      /^[ \t]*---[ \t]*\r?\n[\s\S]*?\r?\n[ \t]*---[ \t]*(?:\r?\n|$)/,
      ''
    );
    if (stripped !== normalized) {
      return stripped.replace(/^(?:[ \t]*\r?\n)+/, '');
    }
    return stripped;
  }

  /**
   * Preprocess markdown to convert Obsidian ![[image]] format to standard ![image]()
   */
  preprocessObsidianSyntax(markdown: string): string {
    // Convert ![[image.png]] to ![image.png](image.png)
    return markdown.replace(/!\[\[([^\]]+)\]\]/g, '![$1]($1)');
  }

  /**
   * Preprocess blockquote markers to ensure proper detection
   */
  preprocessBlockquoteMarkers(markdown: string): string {
    // Convert emoji + text to marker format for consistency
    return markdown
      .replace(/^>\s*[ℹ️]\s*/gm, '> !info ')
      .replace(/^>\s*[⚠️]\s*/gm, '> !warning ')
      .replace(/^>\s*[💡]\s*/gm, '> !tip ')
      .replace(/^>\s*[📝]\s*/gm, '> !note ');
  }

  /**
   * Parse markdown to AST with preprocessing
   */
  parse(markdown: string): Root {
    let preprocessed = this.normalizeFrontmatterPreamble(markdown);
    preprocessed = this.preprocessObsidianSyntax(preprocessed);
    return this.parser.parse(preprocessed) as Root;
  }

  /**
   * Parse with full preprocessing including blockquote markers
   */
  parseFull(markdown: string): Root {
    let preprocessed = this.normalizeFrontmatterPreamble(markdown);
    preprocessed = this.preprocessObsidianSyntax(preprocessed);
    preprocessed = this.preprocessBlockquoteMarkers(preprocessed);
    return this.parser.parse(preprocessed) as Root;
  }

  /**
   * Stringify AST back to markdown
   */
  stringify(ast: Root): string {
    return this.stringifier.stringify(ast);
  }

  /**
   * Extract all resources that need async processing
   * Single-pass AST traversal
   */
  extractResources(ast: Root): ExtractedResources {
    const resources: ExtractedResources = {
      images: [],
      mermaids: [],
      confluenceMacros: [],
    };

    let imageIndex = 0;
    let mermaidIndex = 0;

    visit(ast, (node: Node) => {
      // Extract images
      if (node.type === 'image') {
        const img = node as Image;
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
        const code = node as Code;
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
        const html = node as Html;
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
  replaceResources(
    ast: Root,
    imageMap: Map<string, string>,
    mermaidMap: Map<string, string>
  ): void {
    // Replace image URLs
    visit(ast, 'image', (node: Image) => {
      const newUrl = imageMap.get(node.url);
      if (newUrl) {
        node.url = newUrl;
      }
    });

    // Replace mermaid code blocks with image references
    visit(ast, 'code', (node: Code, index, parent) => {
      if (node.lang === 'mermaid' && parent) {
        const imageUrl = mermaidMap.get(node.value);
        if (imageUrl) {
          // Replace code node with image node
          const imageNode: Image = {
            type: 'image',
            url: imageUrl,
            alt: 'Mermaid diagram',
            title: null,
          };
          (parent.children as Node[])[index!] = imageNode as unknown as BlockContent;
        }
      }
    });
  }

  /**
   * Detect blockquote with special markers (!info, !warning, etc.)
   */
  detectBlockquoteMarker(node: Blockquote): 'info' | 'warning' | 'tip' | 'note' | null {
    const firstChild = node.children[0];
    if (firstChild?.type !== 'paragraph') return null;

    const firstText = firstChild.children[0];
    if (firstText?.type !== 'text') return null;

    const text = firstText.value.trim();

    if (text.startsWith('!info') || text.startsWith('ℹ️')) return 'info';
    if (text.startsWith('!warning') || text.startsWith('⚠️')) return 'warning';
    if (text.startsWith('!tip') || text.startsWith('💡')) return 'tip';
    if (text.startsWith('!note') || text.startsWith('📝')) return 'note';

    return null;
  }

  /**
   * Remove marker from blockquote text
   */
  cleanBlockquoteText(node: Blockquote): void {
    const firstChild = node.children[0] as Paragraph;
    const firstText = firstChild.children[0] as Text;

    // Remove marker prefix
    firstText.value = firstText.value
      .replace(/^!(info|warning|tip|note)\s*/i, '')
      .replace(/^[ℹ️⚠️💡📝]\s*/, '');
  }

  /**
   * Check if HTML is a Confluence macro
   */
  private isConfluenceMacro(html: string): boolean {
    return html.includes('ac:') ||
           html.includes('ri:') ||
           html.includes('ac-structure');
  }

  /**
   * Process text for inline elements
   * Returns cleaned text and inline element info
   */
  processInlineText(nodes: Node[]): Array<{ type: 'text' | 'strong' | 'emphasis' | 'code' | 'link'; value: string; url?: string }> {
    const result: Array<{ type: 'text' | 'strong' | 'emphasis' | 'code' | 'link'; value: string; url?: string }> = [];

    for (const node of nodes) {
      switch (node.type) {
        case 'text':
          result.push({ type: 'text', value: (node as Text).value });
          break;
        case 'strong':
          result.push({ type: 'strong', value: this.stringifyInline(node as Strong) });
          break;
        case 'emphasis':
          result.push({ type: 'emphasis', value: this.stringifyInline(node as Emphasis) });
          break;
        case 'inlineCode':
          result.push({ type: 'code', value: (node as InlineCode).value });
          break;
        case 'link':
          const link = node as Link;
          result.push({ type: 'link', value: this.stringifyInline(link), url: link.url });
          break;
        case 'delete':
          // Strikethrough - treat as regular text with markers
          result.push({ type: 'text', value: this.stringifyInline(node as Delete) });
          break;
        case 'break':
          result.push({ type: 'text', value: '\n' });
          break;
        default:
          // Unknown inline node, convert to string
          result.push({ type: 'text', value: this.stringifyInline(node as unknown as { children: Node[] }) });
      }
    }

    return result;
  }

  /**
   * Helper to stringify inline content
   */
  private stringifyInline(node: { children: Node[] }): string {
    const fragment: Root = {
      type: 'root',
      children: node.children as BlockContent[],
    };
    return this.stringifier.stringify(fragment).trim();
  }

  /**
   * Extract frontmatter title
   */
  extractTitle(markdown: string): string | undefined {
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
    let title: string | undefined;

    visit(ast, 'heading', (node: Heading) => {
      if (node.depth === 1 && !title) {
        const text = this.stringifyInline(node as unknown as { children: Node[] });
        title = text;
      }
    });

    return title;
  }

  /**
   * Check if list is a task list (GFM extension)
   */
  isTaskList(list: List): boolean {
    if (list.children.length === 0) return false;
    // GFM adds `checked` property to ListItem
    const firstItem = list.children[0] as ListItem & { checked?: boolean | null };
    return firstItem.checked !== null && firstItem.checked !== undefined;
  }

  /**
   * Extract task list items (GFM extension)
   */
  extractTaskItems(list: List): Array<{ text: string; checked: boolean }> {
    const items: Array<{ text: string; checked: boolean }> = [];

    for (const listItem of list.children as (ListItem & { checked?: boolean | null })[]) {
      const checked = listItem.checked === true;
      let text = '';

      for (const child of listItem.children) {
        if (child.type === 'paragraph') {
          const para = child as Paragraph;
          // Get text content without the checkbox marker
          const paraText = this.stringifyInline(para as unknown as { children: Node[] });
          // Remove [ ] or [x] prefix if present
          text = paraText.replace(/^\[[ x]\]\s*/, '');
        }
      }

      items.push({ text, checked });
    }

    return items;
  }
}
