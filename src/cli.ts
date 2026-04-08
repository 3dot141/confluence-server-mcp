#!/usr/bin/env node
// src/cli.ts
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { registerSpacesCommand } from './commands/spaces.js';
import { registerPageCommands } from './commands/pages.js';
import { registerPublishCommand } from './commands/publish.js';

const program = new Command();

program
  .name('confluence')
  .description('Confluence CLI — manage pages, publish markdown, search')
  .version('3.0.0')
  .option('--json', 'Output as JSON', false)
  .option('--verbose', 'Enable verbose logging', false)
  .hook('preAction', () => {
    loadConfig();
    if (program.opts().verbose) {
      process.env.DEBUG = '1';
    }
  });

registerSpacesCommand(program);
registerPageCommands(program);
registerPublishCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
