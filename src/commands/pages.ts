// src/commands/pages.ts
import { Command } from 'commander';
import fs from 'node:fs';
import { ConfluenceApi } from '../confluence-api.js';
import { getConfig } from '../config.js';
import { formatOutput, formatTable } from '../output.js';

export function registerPageCommands(program: Command): void {
  const json = () => program.opts().json;
  const api = () => new ConfluenceApi();
  const space = () => getConfig().defaultSpace;

  program
    .command('get-page <idOrTitle>')
    .description('Get a page by ID or title')
    .option('-s, --space <key>', 'Space key')
    .action(async (idOrTitle, opts) => {
      const spaceKey = opts.space || space();
      const isId = /^\d+$/.test(idOrTitle);
      const page = isId
        ? await api().getPageById(idOrTitle)
        : await api().getPageByTitle(spaceKey!, idOrTitle);

      if (!page) {
        console.error(`Page not found: ${idOrTitle}`);
        process.exit(1);
      }

      if (json()) {
        console.log(formatOutput(page, true));
      } else {
        console.log(`ID:      ${page.id}`);
        console.log(`Title:   ${page.title}`);
        console.log(`Space:   ${page.space.key}`);
        console.log(`Version: ${page.version.number}`);
        console.log(`URL:     ${getConfig().baseUrl}${page._links.webui}`);
      }
    });

  program
    .command('create-page <title>')
    .description('Create a new page')
    .option('-s, --space <key>', 'Space key')
    .option('--parent <id>', 'Parent page ID')
    .option('-f, --file <path>', 'HTML content file')
    .option('-c, --content <html>', 'Inline HTML content')
    .action(async (title, opts) => {
      const spaceKey = opts.space || space();
      if (!spaceKey) { console.error('Space required (--space or CONF_SPACE)'); process.exit(1); }
      const content = opts.file ? fs.readFileSync(opts.file, 'utf-8') : (opts.content || '');
      const page = await api().createPage({ space: spaceKey, title, content, parentId: opts.parent });

      if (json()) {
        console.log(formatOutput(page, true));
      } else {
        console.log(`Created: ${page.title} (ID: ${page.id})`);
        console.log(`URL:     ${getConfig().baseUrl}${page._links.webui}`);
      }
    });

  program
    .command('update-page <idOrTitle>')
    .description('Update an existing page')
    .option('-s, --space <key>', 'Space key')
    .option('--title <newTitle>', 'New title')
    .option('-f, --file <path>', 'HTML content file')
    .option('-c, --content <html>', 'Inline HTML content')
    .action(async (idOrTitle, opts) => {
      const spaceKey = opts.space || space();
      const isId = /^\d+$/.test(idOrTitle);
      const existing = isId
        ? await api().getPageById(idOrTitle)
        : await api().getPageByTitle(spaceKey!, idOrTitle);

      if (!existing) { console.error(`Page not found: ${idOrTitle}`); process.exit(1); }

      const content = opts.file ? fs.readFileSync(opts.file, 'utf-8') : (opts.content || existing.body?.storage?.value || '');
      const page = await api().updatePage({
        pageId: existing.id,
        title: opts.title || existing.title,
        content,
        version: existing.version.number + 1,
      });

      if (json()) {
        console.log(formatOutput(page, true));
      } else {
        console.log(`Updated: ${page.title} (v${page.version.number})`);
      }
    });

  program
    .command('search <query>')
    .description('Search pages by title')
    .option('-s, --space <key>', 'Space key')
    .option('-l, --limit <n>', 'Max results', '25')
    .action(async (query, opts) => {
      const results = await api().searchPages(query, opts.space, parseInt(opts.limit));

      if (json()) {
        console.log(formatOutput(results, true));
      } else {
        console.log(formatTable(
          results.map(r => ({ id: r.id, title: r.title, space: r.space.key })),
          ['id', 'title', 'space']
        ));
      }
    });

  program
    .command('delete-page <id>')
    .description('Delete a page by ID')
    .action(async (id) => {
      await api().deletePage(id);
      if (json()) {
        console.log(formatOutput({ success: true, message: 'Deleted' }, true));
      } else {
        console.log(`Deleted page ${id}`);
      }
    });
}
