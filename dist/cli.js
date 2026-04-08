#!/usr/bin/env node
// src/cli.ts
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { setDebug } from './logger.js';
import { registerSpacesCommand } from './commands/spaces.js';
import { registerPageCommands } from './commands/pages.js';
import { registerPublishCommand } from './commands/publish.js';
import { registerAttachmentCommands } from './commands/attachments.js';
const program = new Command();
program
    .name('confluence')
    .description('Confluence CLI — manage pages, publish markdown, search')
    .version('3.0.0')
    .option('--json', 'Output as JSON', false)
    .option('--debug', 'Enable debug logging', false)
    .hook('preAction', () => {
    if (program.opts().debug) {
        setDebug(true);
    }
    loadConfig();
});
registerSpacesCommand(program);
registerPageCommands(program);
registerPublishCommand(program);
registerAttachmentCommands(program);
program.parseAsync(process.argv).catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map