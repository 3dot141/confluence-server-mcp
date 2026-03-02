// src/domain/markdown/converter.ts
import path from "node:path";
import { MarkdownConverterOptions } from "./types.js";
import { codeMacro, info, warning, tip, note, tocMacro, table, escapeXml } from "./macros.js";

export interface ExtractedImage {
  alt: string;
  src: string;
  absolutePath?: string;
  type: 'local' | 'url';
}

export interface ConversionResult {
  storageFormat: string;
  extractedImages: ExtractedImage[];
  title?: string;
}

type Segment = ["code" | "text", string];

export class MarkdownToConfluenceConverter {
  private options: MarkdownConverterOptions;

  constructor(options: MarkdownConverterOptions = {}) {
    this.options = {
      addTocMacro: true,
      imageMapping: {},
      basePath: process.cwd(),
      ...options
    };
  }

  convertWithMetadata(markdown: string): ConversionResult {
    const extractedImages: ExtractedImage[] = [];
    
    // Extract front matter and title
    const { content: contentWithoutFm, title: fmTitle } = this.extractFrontMatterWithTitle(markdown);
    
    // Extract H1 title (if no front matter title)
    const h1Title = this.extractH1Title(contentWithoutFm);
    const title = fmTitle || h1Title;
    
    // Extract and mark images
    const contentWithExtractedImages = this.extractAndMarkImages(
      contentWithoutFm, 
      extractedImages
    );
    
    // Perform conversion
    const storageFormat = this.convert(contentWithExtractedImages);
    
    return {
      storageFormat,
      extractedImages,
      title
    };
  }

  convert(markdown: string): string {
    // Extract front matter
    markdown = this.extractFrontMatter(markdown);
    
    const parts: string[] = [];
    
    // Add TOC if enabled
    if (this.options.addTocMacro) {
      parts.push(tocMacro());
    }
    
    // Split by code blocks
    const segments = this.splitByCodeBlocks(markdown);
    
    for (const [type, content] of segments) {
      if (type === "code") {
        parts.push(this.convertCodeBlock(content));
      } else {
        parts.push(this.convertText(content));
      }
    }
    
    const result = parts.join("\n\n");
    return this.convertImages(result);
  }

  private extractFrontMatter(markdown: string): string {
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

    if (endIdx === -1) return markdown;
    return lines.slice(endIdx + 1).join("\n").trim();
  }

  private splitByCodeBlocks(markdown: string): Segment[] {
    const segments: Segment[] = [];
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

  private convertCodeBlock(content: string): string {
    const lines = content.split("\n");
    const language = lines[0].trim();
    const code = lines.slice(1).join("\n");
    return codeMacro(code, language);
  }

  private convertText(markdown: string): string {
    // Convert blockquotes
    markdown = this.convertBlockquotes(markdown);
    // Convert headings
    markdown = this.convertHeadings(markdown);
    // Convert inline
    markdown = this.convertInline(markdown);
    // Wrap paragraphs
    markdown = this.wrapParagraphs(markdown);
    return markdown;
  }

  private convertBlockquotes(markdown: string): string {
    const lines = markdown.split("\n");
    const result: string[] = [];
    let inQuote = false;
    let quoteLines: string[] = [];
    let quoteType = "note";

    for (const line of lines) {
      if (line.trim().startsWith(">")) {
        if (!inQuote) {
          inQuote = true;
          quoteLines = [];
          const content = line.trim().slice(1).trim();
          if (content.startsWith("!")) quoteType = "warning";
          else if (content.startsWith("?")) quoteType = "tip";
          else if (content.startsWith("i")) quoteType = "info";
          quoteLines.push(content.replace(/^[!?i]\s*/, ""));
        } else {
          quoteLines.push(line.trim().slice(1).trim());
        }
      } else {
        if (inQuote) {
          const content = quoteLines.join(" ");
          if (quoteType === "warning") result.push(warning(content));
          else if (quoteType === "tip") result.push(tip(content));
          else if (quoteType === "info") result.push(info(content));
          else result.push(note(content));
          inQuote = false;
        }
        result.push(line);
      }
    }

    if (inQuote) {
      const content = quoteLines.join(" ");
      if (quoteType === "warning") result.push(warning(content));
      else if (quoteType === "tip") result.push(tip(content));
      else if (quoteType === "info") result.push(info(content));
      else result.push(note(content));
    }

    return result.join("\n");
  }

  private convertHeadings(markdown: string): string {
    for (let level = 6; level >= 1; level--) {
      const pattern = new RegExp(`^#{${level}}\\s*(.+)$`, "gm");
      markdown = markdown.replace(pattern, `<h${level}>$1</h${level}>`);
    }
    return markdown;
  }

  private convertInline(markdown: string): string {
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

  private wrapParagraphs(markdown: string): string {
    const lines = markdown.split("\n");
    const result: string[] = [];
    const buffer: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        if (buffer.length > 0) {
          const text = buffer.join(" ");
          if (!text.startsWith("<")) {
            result.push(`<p>${text}</p>`);
          } else {
            result.push(text);
          }
          buffer.length = 0;
        }
        result.push("");
      } else if (trimmed.startsWith("<")) {
        if (buffer.length > 0) {
          const text = buffer.join(" ");
          result.push(!text.startsWith("<") ? `<p>${text}</p>` : text);
          buffer.length = 0;
        }
        result.push(trimmed);
      } else {
        buffer.push(trimmed);
      }
    }

    if (buffer.length > 0) {
      const text = buffer.join(" ");
      result.push(!text.startsWith("<") ? `<p>${text}</p>` : text);
    }

    return result.join("\n");
  }

  private extractFrontMatterWithTitle(markdown: string): { content: string; title?: string } {
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

    if (endIdx === -1) return { content: markdown };
    
    const fmLines = lines.slice(1, endIdx);
    let title: string | undefined;
    
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

  private extractH1Title(markdown: string): string | undefined {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : undefined;
  }

  private extractAndMarkImages(
    markdown: string, 
    images: ExtractedImage[]
  ): string {
    let result = markdown;
    
    // Match ![alt](src) format
    const standardPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    
    result = result.replace(standardPattern, (match, alt, src) => {
      const type = (src.startsWith('http://') || src.startsWith('https://')) 
        ? 'url' 
        : 'local';
      
      const absolutePath = type === 'local' && this.options.basePath
        ? path.resolve(this.options.basePath, src)
        : undefined;
      
      images.push({
        alt: alt || '',
        src,
        absolutePath,
        type
      });
      
      // Return placeholder for later Confluence format conversion
      return `<!--IMG:${images.length - 1}-->`;
    });
    
    // Match ![[src]] Obsidian format
    const obsidianPattern = /!\[\[([^\]]+)\]\]/g;
    
    result = result.replace(obsidianPattern, (match, src) => {
      const absolutePath = this.options.basePath
        ? path.resolve(this.options.basePath, src)
        : undefined;
      
      images.push({
        alt: '',
        src,
        absolutePath,
        type: 'local'
      });
      
      return `<!--IMG:${images.length - 1}-->`;
    });
    
    return result;
  }

  private convertImages(markdown: string): string {
    return markdown.replace(/<!--IMG:(\d+)-->/g, (match, index) => {
      return `<ac:image><ri:attachment ri:filename="IMG${index}" /></ac:image>`;
    });
  }
}
