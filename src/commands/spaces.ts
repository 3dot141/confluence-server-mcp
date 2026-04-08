// src/commands/spaces.ts
import { Command } from 'commander';
import { ConfluenceApi } from '../confluence-api.js';
import { formatOutput, formatTable } from '../output.js';

export function registerSpacesCommand(program: Command): void {
  program
    .command('list-spaces')
    .description('List accessible Confluence spaces')
    .option('--type <type>', 'Space type: global or personal', 'global')
    .action(async (opts) => {
      const api = new ConfluenceApi();
      const spaces = await api.listSpaces(opts.type);
      const json = program.opts().json;

      if (json) {
        console.log(formatOutput(spaces, true));
      } else {
        console.log(formatTable(
          spaces.map(s => ({ key: s.key, name: s.name, type: s.type })),
          ['key', 'name', 'type']
        ));
      }
    });
}
