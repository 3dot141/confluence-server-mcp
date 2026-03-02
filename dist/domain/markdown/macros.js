// src/domain/markdown/macros.ts
export function escapeForCdata(text) {
    return text.replace(/\]\]>/g, "]]]]><![CDATA[>");
}
export function escapeXml(str) {
    return str
        .replace(/\u0026/g, "\u0026amp;")
        .replace(/\u003c/g, "\u0026lt;")
        .replace(/\u003e/g, "\u0026gt;")
        .replace(/"/g, "\u0026quot;")
        .replace(/'/g, "\u0026apos;");
}
// Code macro
export function codeMacro(code, language) {
    const safeCode = escapeForCdata(code);
    const normalizedLang = normalizeCodeLanguage(language);
    const langParam = normalizedLang
        ? `<ac:parameter ac:name="language">${normalizedLang}</ac:parameter>`
        : "";
    return `<ac:structured-macro ac:name="code">${langParam}<ac:plain-text-body><![CDATA[${safeCode}]]></ac:plain-text-body></ac:structured-macro>`;
}
// Info macro
export function info(content) {
    return `<ac:structured-macro ac:name="info"><ac:rich-text-body><p>${escapeXml(content)}</p></ac:rich-text-body></ac:structured-macro>`;
}
// Warning macro
export function warning(content) {
    return `<ac:structured-macro ac:name="warning"><ac:rich-text-body><p>${escapeXml(content)}</p></ac:rich-text-body></ac:structured-macro>`;
}
// Tip macro
export function tip(content) {
    return `<ac:structured-macro ac:name="tip"><ac:rich-text-body><p>${escapeXml(content)}</p></ac:rich-text-body></ac:structured-macro>`;
}
// Note macro
export function note(content) {
    return `<ac:structured-macro ac:name="note"><ac:rich-text-body><p>${escapeXml(content)}</p></ac:rich-text-body></ac:structured-macro>`;
}
// TOC macro
export function tocMacro() {
    return `<ac:structured-macro ac:name="toc"></ac:structured-macro>`;
}
// Table
export function table(headers, rows) {
    const headerRow = headers.map(h => `<th>${escapeXml(h)}</th>`).join("");
    const dataRows = rows
        .map(row => `<tr>${row.map(cell => `<td>${escapeXml(cell)}</td>`).join("")}</tr>`)
        .join("");
    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table>`;
}
// Language normalization
const CODE_LANGUAGE_ALIASES = new Map([
    ["js", "javascript"],
    ["jsx", "javascript"],
    ["ts", "javascript"],
    ["tsx", "javascript"],
    ["sh", "bash"],
    ["zsh", "bash"],
    ["shell", "bash"],
    ["yml", "yaml"],
    ["py", "python"],
    ["text", "plain"],
    ["txt", "plain"],
]);
const KNOWN_SAFE_CODE_LANGUAGES = new Set([
    "actionscript3", "applescript", "bash", "coldfusion", "cpp",
    "csharp", "css", "delphi", "diff", "erlang", "groovy", "html",
    "java", "javafx", "javascript", "perl", "php", "plain",
    "powershell", "python", "ruby", "sass", "scala", "sql", "vb", "xml", "yaml"
]);
function normalizeCodeLanguage(language) {
    if (!language)
        return null;
    const raw = language.trim().toLowerCase();
    const normalized = CODE_LANGUAGE_ALIASES.get(raw) ?? raw;
    return KNOWN_SAFE_CODE_LANGUAGES.has(normalized) ? normalized : null;
}
//# sourceMappingURL=macros.js.map