// src/commands/attachments.ts
import { Command } from 'commander';
import { ConfluenceApi } from '../confluence-api.js';
import { formatOutput } from '../output.js';

export function registerAttachmentCommands(program: Command): void {
  program
    .command('upload <file>')
    .description('Upload a file as attachment to a page')
    .requiredOption('--page <id>', 'Page ID to attach to')
    .option('--filename <name>', 'Override filename')
    .option('--comment <text>', 'Attachment comment')
    .action(async (file, opts) => {
      const api = new ConfluenceApi();
      const attachment = await api.uploadAttachment(opts.page, file, opts.filename, opts.comment);

      if (program.opts().json) {
        console.log(formatOutput(attachment, true));
      } else {
        console.log(`Uploaded: ${attachment.title} (ID: ${attachment.id})`);
      }
    });
}
