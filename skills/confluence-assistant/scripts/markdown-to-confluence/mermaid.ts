// Mermaid Diagram Processor
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { MermaidOptions, ProcessedMermaid } from './types.ts';

export class MermaidProcessor {
  private options: Required<MermaidOptions>;

  constructor(options: MermaidOptions = {}) {
    this.options = {
      outputDir: './.mermaid-temp',
      theme: 'default',
      backgroundColor: 'white',
      puppeteerConfig: '',
      ...options
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Extract mermaid diagrams from markdown and render them as images
   */
  async process(markdown: string, options?: Partial<MermaidOptions>): Promise<ProcessedMermaid> {
    const opts = { ...this.options, ...options };
    const diagrams = this.extractDiagrams(markdown);

    if (diagrams.length === 0) {
      return { markdown, imagePaths: [] };
    }

    const imagePaths: string[] = [];
    let processedMarkdown = markdown;

    for (let i = 0; i < diagrams.length; i++) {
      const diagram = diagrams[i];
      const hash = crypto.createHash('md5').update(diagram.content).digest('hex');
      const filename = `mermaid-${hash}.png`;
      const outputPath = path.join(opts.outputDir, filename);

      // Check if already rendered
      if (!fs.existsSync(outputPath)) {
        await this.renderDiagram(diagram.content, outputPath, opts);
      }

      imagePaths.push(outputPath);

      // Replace mermaid block with image reference
      const imageRef = `![${diagram.alt || 'Diagram'}](${outputPath})`;
      processedMarkdown = processedMarkdown.replace(diagram.raw, imageRef);
    }

    return { markdown: processedMarkdown, imagePaths };
  }

  /**
   * Extract mermaid code blocks from markdown
   */
  private extractDiagrams(markdown: string): Array<{
    raw: string;
    content: string;
    alt?: string;
  }> {
    const diagrams: Array<{ raw: string; content: string; alt?: string }> = [];
    const regex = /```mermaid\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(markdown)) !== null) {
      const raw = match[0];
      const content = match[1].trim();

      // Extract title from diagram if present
      const titleMatch = content.match(/\btitle\b["']?\s*[:\s]\s*["']?([^"'\n]+)/i);
      const alt = titleMatch ? titleMatch[1].trim() : 'Mermaid Diagram';

      diagrams.push({ raw, content, alt });
    }

    return diagrams;
  }

  /**
   * Render a single mermaid diagram using mermaid-cli
   */
  private async renderDiagram(
    content: string,
    outputPath: string,
    options: Required<MermaidOptions>
  ): Promise<void> {
    // Create temporary file for diagram
    const tempFile = path.join(options.outputDir, `temp-${Date.now()}.mmd`);
    fs.writeFileSync(tempFile, content, 'utf-8');

    try {
      const args = [
        '-i', tempFile,
        '-o', outputPath,
        '-t', options.theme,
        '-b', options.backgroundColor,
        '-s', '2' // Scale factor for better quality
      ];

      if (options.puppeteerConfig) {
        args.push('-p', options.puppeteerConfig);
      }

      await this.runMmdc(args);
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Run mermaid-cli (mmdc) command
   */
  private runMmdc(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const mmdc = spawn('npx', ['mmdc', ...args], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      mmdc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      mmdc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      mmdc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`mmdc failed with code ${code}: ${stderr || stdout}`));
        }
      });

      mmdc.on('error', (err) => {
        reject(new Error(`Failed to run mmdc: ${err.message}. Is @mermaid-js/mermaid-cli installed?`));
      });
    });
  }

  /**
   * Check if mermaid-cli is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.runMmdc(['--version']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup temporary files
   */
  cleanup(): void {
    try {
      const files = fs.readdirSync(this.options.outputDir);
      for (const file of files) {
        if (file.startsWith('mermaid-') || file.startsWith('temp-')) {
          fs.unlinkSync(path.join(this.options.outputDir, file));
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Quick function to process mermaid diagrams
 */
export async function processMermaidDiagrams(
  markdown: string,
  options?: MermaidOptions
): Promise<ProcessedMermaid> {
  const processor = new MermaidProcessor(options);
  return processor.process(markdown);
}
