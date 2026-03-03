// Confluence Storage Format Macros

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function escapeXmlAttr(text: string): string {
  return escapeXml(text);
}

export function codeMacro(code: string, language = 'plain'): string {
  const escapedCode = escapeXml(code.trimEnd());
  return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${language}</ac:parameter>
  <ac:parameter ac:name="theme">Midnight</ac:parameter>
  <ac:parameter ac:name="linenumbers">true</ac:parameter>
  <ac:plain-text-body><![CDATA[${escapedCode}]]></ac:plain-text-body>
</ac:structured-macro>`;
}

export function info(text: string): string {
  return `<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body><p>${text}</p></ac:rich-text-body>
</ac:structured-macro>`;
}

export function warning(text: string): string {
  return `<ac:structured-macro ac:name="warning" ac:schema-version="1">
  <ac:rich-text-body><p>${text}</p></ac:rich-text-body>
</ac:structured-macro>`;
}

export function tip(text: string): string {
  return `<ac:structured-macro ac:name="tip" ac:schema-version="1">
  <ac:rich-text-body><p>${text}</p></ac:rich-text-body>
</ac:structured-macro>`;
}

export function note(text: string): string {
  return `<ac:structured-macro ac:name="note" ac:schema-version="1">
  <ac:rich-text-body><p>${text}</p></ac:rich-text-body>
</ac:structured-macro>`;
}

export function tocMacro(): string {
  return `<ac:structured-macro ac:name="toc" ac:schema-version="1">
  <ac:parameter ac:name="exclude">^(Authors|Table of Contents|TOC)$</ac:parameter>
  <ac:parameter ac:name="style">disc</ac:parameter>
  <ac:parameter ac:name="indent">20px</ac:parameter>
  <ac:parameter ac:name="maxLevel">6</ac:parameter>
  <ac:parameter ac:name="minLevel">1</ac:parameter>
  <ac:parameter ac:name="type">list</ac:parameter>
  <ac:parameter ac:name="outline">false</ac:parameter>
  <ac:parameter ac:name="include">.*</ac:parameter>
</ac:structured-macro>`;
}

export function table(headers: string[], rows: string[][]): string {
  const headerCells = headers.map(h => `<th>${h}</th>`).join('');
  const bodyRows = rows.map(row => {
    const cells = row.map(cell => `<td>${cell}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n');

  return `<table>
<tbody>
<tr>${headerCells}</tr>
${bodyRows}
</tbody>
</table>`;
}

export function taskList(tasks: Array<{ text: string; checked: boolean }>): string {
  const taskItems = tasks.map((task, index) => `<ac:task>
    <ac:task-id>${index + 1}</ac:task-id>
    <ac:task-status>${task.checked ? 'complete' : 'incomplete'}</ac:task-status>
    <ac:task-body><p>${escapeXml(task.text)}</p></ac:task-body>
  </ac:task>`).join('\n');

  return `<ac:task-list>
${taskItems}
</ac:task-list>`;
}
