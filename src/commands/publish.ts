// src/commands/publish.ts
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from '../config.js';
import { formatOutput } from '../output.js';
import { PublishCompleteUseCase } from '../publish.js';

export function registerPublishCommand(program: Command): void {
  program
    .command('publish <markdownFile>')
    .description('Publish a markdown file to Confluence (with images + mermaid)')
    .option('-s, --space <key>', 'Space key')
    .option('-t, --title <title>', 'Page title (default: filename or H1)')
    .option('--parent <id>', 'Parent page ID')
    .option('--page-id <id>', 'Existing page ID to update')
    .option('--mermaid-theme <theme>', 'Mermaid theme', 'default')
    .action(async (markdownFile, opts) => {
      const spaceKey = opts.space || getConfig().defaultSpace;
      if (!spaceKey) { console.error('Space required (--space or CONF_SPACE)'); process.exit(1); }

      const filePath = path.resolve(markdownFile);
      if (!fs.existsSync(filePath)) { console.error(`File not found: ${filePath}`); process.exit(1); }

      const markdown = fs.readFileSync(filePath, 'utf-8');
      const title = opts.title || path.basename(filePath, path.extname(filePath));
      const basePath = path.dirname(filePath);

      const useCase = new PublishCompleteUseCase();
      const result = await useCase.execute({
        space: spaceKey,
        title,
        markdown,
        pageId: opts.pageId,
        parentId: opts.parent,
        basePath,
        mermaidTheme: opts.mermaidTheme,
      });

      if (program.opts().json) {
        console.log(formatOutput(result, true));
      } else {
        console.log(`${result.operation === 'created' ? 'Created' : 'Updated'}: ${result.title}`);
        console.log(`Page ID: ${result.pageId}`);
        console.log(`Version: ${result.version}`);
        console.log(`Images:  ${result.imagesUploaded}`);
        console.log(`Mermaid: ${result.mermaidsRendered}`);
        if (result.errors.length > 0) {
          console.warn(`Warnings: ${result.errors.join(', ')}`);
        }
      }
    });
}
