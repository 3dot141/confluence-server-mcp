// src/output.ts
export function formatOutput(data: unknown, json: boolean): string {
  if (json) return JSON.stringify(data, null, 2);
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

export function formatTable(rows: Record<string, unknown>[], columns: string[]): string {
  if (rows.length === 0) return '(no results)';

  const headers = columns.map(c => c.toUpperCase());
  const widths = columns.map((col, i) =>
    Math.max(headers[i].length, ...rows.map(r => String(r[col] ?? '').length))
  );

  const header = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  const separator = widths.map(w => '-'.repeat(w)).join('  ');
  const body = rows.map(row =>
    columns.map((col, i) => String(row[col] ?? '').padEnd(widths[i])).join('  ')
  ).join('\n');

  return `${header}\n${separator}\n${body}`;
}
