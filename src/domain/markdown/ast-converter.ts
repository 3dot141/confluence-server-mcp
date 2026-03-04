// src/domain/markdown/ast-converter.ts
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
  InlineCode,
  ThematicBreak,
  BlockContent,
  PhrasingContent,
} from 'mdast';
import { visit } from 'unist-util-visit';
import { RemarkMarkdownParser, ExtractedResources } from '../../infrastructure/markdown/remark-parser.js';
import { escapeXml, escapeXmlAttr, tocMacro } from './macros.js';

export interface ASTConverterOptions {
  addTocMacro?: boolean;
  imageMapping?: Record<string, string>;
  basePath?: string;
}

export interface ASTConverterResult {
  storageFormat: string;
  title?: string;
  imagesProcessed: number;
  mermaidsProcessed: number;
}

/**
 * AST-based Markdown to Confluence Converter
 * Transforms remark AST to Confluence Storage Format
 */
export class ASTMarkdownToConfluenceConverter {
  private parser = new RemarkMarkdownParser();
  private options: ASTConverterOptions;

  constructor(options: ASTConverterOptions = {}) {
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
  convert(markdown: string): string {
    const ast = this.parser.parseFull(markdown);
    return this.transformToConfluence(ast);
  }

  /**
   * Convert with metadata extraction
   */
  convertWithMetadata(markdown: string): { storageFormat: string; title?: string } {
    const ast = this.parser.parseFull(markdown);
    const title = this.parser.extractTitle(markdown);
    const storageFormat = this.transformToConfluence(ast);

    return { storageFormat, title };
  }

  /**
   * Async convert with resource processing
   * Requires external resource handling
   */
  async convertAsync(
    markdown: string,
    imageMap: Map<string, string>,
    mermaidMap: Map<string, string>
  ): Promise<ASTConverterResult> {
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
  private transformToConfluence(ast: Root): string {
    const parts: string[] = [];

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
  private convertNode(node: BlockContent | PhrasingContent | any): string | null {
    // Skip non-renderable nodes (yaml, definitions, etc.)
    if (!node || typeof node.type !== 'string') {
      return null;
    }

    switch (node.type) {
      case 'yaml':
        // Skip YAML frontmatter - it's metadata, not content
        return null;

      case 'heading':
        return this.convertHeading(node as Heading);

      case 'paragraph':
        return this.convertParagraph(node as Paragraph);

      case 'code':
        return this.convertCode(node as Code);

      case 'blockquote':
        return this.convertBlockquote(node as Blockquote);

      case 'list':
        return this.convertList(node as List);

      case 'table':
        return this.convertTable(node as Table);

      case 'thematicBreak':
        return '<hr/>';

      case 'html':
        return this.convertHtml(node as Html);

      case 'image':
        return this.convertImage(node as Image);

      default:
        // Unknown block type, try to stringify
        console.warn(`Unknown node type: ${node.type}`);
        return null;
    }
  }

  /**
   * Convert heading to h1-h6
   */
  private convertHeading(node: Heading): string {
    const level = Math.min(Math.max(node.depth, 1), 6);
    const content = this.convertInlineNodes(node.children);
    return `<h${level}>${content}</h${level}>`;
  }

  /**
   * Convert paragraph
   */
  private convertParagraph(node: Paragraph): string {
    const content = this.convertInlineNodes(node.children);
    return content ? `<p>${content}</p>` : '';
  }

  /**
   * Convert code block to Confluence code macro
   */
  private convertCode(node: Code): string {
    const lang = node.lang || 'plain';
    const code = escapeXml(node.value);

    return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${escapeXmlAttr(lang)}</ac:parameter>
  <ac:parameter ac:name="linenumbers">false</ac:parameter>
  <ac:rich-text>
    <pre><code>${code}</code></pre>
  </ac:rich-text>
</ac:structured-macro>`;
  }

  /**
   * Convert blockquote
   * Support special markers: !info, !warning, !tip, !note
   */
  private convertBlockquote(node: Blockquote): string {
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
  private convertBlockquoteContent(node: Blockquote): string {
    const parts: string[] = [];

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
  private convertList(node: List): string {
    const isOrdered = node.ordered || false;
    const isTaskList = this.parser.isTaskList(node);

    if (isTaskList) {
      return this.convertTaskList(node);
    }

    const tag = isOrdered ? 'ol' : 'ul';
    const items: string[] = [];

    for (const item of node.children as ListItem[]) {
      const content = this.convertListItem(item);
      items.push(`<li>${content}</li>`);
    }

    return `<${tag}>\n${items.join('\n')}\n</${tag}>`;
  }

  /**
   * Convert list item content
   */
  private convertListItem(item: ListItem): string {
    const parts: string[] = [];

    for (const child of item.children) {
      if (child.type === 'paragraph') {
        const content = this.convertInlineNodes((child as Paragraph).children);
        parts.push(content);
      } else if (child.type === 'list') {
        const nested = this.convertList(child as List);
        parts.push(nested);
      } else {
        const converted = this.convertNode(child as BlockContent);
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
  private convertTaskList(node: List): string {
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
  private convertTable(node: Table): string {
    if (node.children.length === 0) {
      return '';
    }

    const rows: string[] = [];
    let hasHeader = false;

    for (let i = 0; i < node.children.length; i++) {
      const rowNode = node.children[i] as TableRow;
      const isHeader = i === 0;

      const cells: string[] = [];
      for (const cell of rowNode.children as TableCell[]) {
        const cellContent = this.convertInlineNodes(cell.children);
        const cellTag = isHeader ? 'th' : 'td';
        cells.push(`<${cellTag}>${cellContent}</${cellTag}>`);
      }

      if (isHeader) {
        hasHeader = true;
        rows.push(`<tr>\n${cells.join('\n')}\n</tr>`);
      } else {
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
  private convertHtml(node: Html): string {
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
  private convertInlineNodes(nodes: PhrasingContent[]): string {
    return nodes.map(node => this.convertInlineNode(node)).join('');
  }

  /**
   * Convert single inline node
   */
  private convertInlineNode(node: PhrasingContent): string {
    switch (node.type) {
      case 'text':
        return escapeXml((node as Text).value);

      case 'strong':
        return `<strong>${this.convertInlineNodes((node as Strong).children)}</strong>`;

      case 'emphasis':
        return `<em>${this.convertInlineNodes((node as Emphasis).children)}</em>`;

      case 'inlineCode':
        return `<code>${escapeXml((node as InlineCode).value)}</code>`;

      case 'link':
        const link = node as Link;
        const linkText = this.convertInlineNodes(link.children);
        return `<a href="${escapeXmlAttr(link.url)}">${linkText}</a>`;

      case 'image':
        return this.convertImage(node as Image);

      case 'break':
        return '<br/>';

      case 'delete':
        // Strikethrough - Confluence doesn't have native support
        return `<s>${this.convertInlineNodes((node as { children: PhrasingContent[] }).children)}</s>`;

      default:
        return '';
    }
  }

  /**
   * Convert image to Confluence image macro
   */
  private convertImage(node: Image): string {
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
  private isConfluenceMacro(html: string): boolean {
    return html.includes('ac:') || html.includes('ri:') || html.includes('ac-structure');
  }

  /**
   * Create info macro
   */
  private createInfoMacro(content: string): string {
    return `<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text><p>${content}</p></ac:rich-text>
</ac:structured-macro>`;
  }

  /**
   * Create warning macro
   */
  private createWarningMacro(content: string): string {
    return `<ac:structured-macro ac:name="warning" ac:schema-version="1">
  <ac:rich-text><p>${content}</p></ac:rich-text>
</ac:structured-macro>`;
  }

  /**
   * Create tip macro
   */
  private createTipMacro(content: string): string {
    return `<ac:structured-macro ac:name="tip" ac:schema-version="1">
  <ac:rich-text><p>${content}</p></ac:rich-text>
</ac:structured-macro>`;
  }

  /**
   * Create note macro
   */
  private createNoteMacro(content: string): string {
    return `<ac:structured-macro ac:name="note" ac:schema-version="1">
  <ac:rich-text><p>${content}</p></ac:rich-text>
</ac:structured-macro>`;
  }
}
