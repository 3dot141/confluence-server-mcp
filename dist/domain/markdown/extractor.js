// src/domain/markdown/extractor.ts
import path from "node:path";
export class MarkdownImageExtractor {
    basePath;
    constructor(basePath = process.cwd()) {
        this.basePath = basePath;
    }
    extract(markdown) {
        const images = [];
        // Match ![alt](src) format
        const standardPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;
        while ((match = standardPattern.exec(markdown)) !== null) {
            const alt = match[1] || '';
            const src = match[2];
            const type = this.isUrl(src) ? 'url' : 'local';
            const absolutePath = type === 'local'
                ? this.resolvePath(src)
                : src;
            images.push({ alt, src, absolutePath, type });
        }
        // Match ![[src]] Obsidian format
        const obsidianPattern = /!\[\[([^\]]+)\]\]/g;
        while ((match = obsidianPattern.exec(markdown)) !== null) {
            const src = match[1];
            const absolutePath = this.resolvePath(src);
            images.push({
                alt: '',
                src,
                absolutePath,
                type: 'local'
            });
        }
        return {
            images,
            localCount: images.filter(img => img.type === 'local').length,
            urlCount: images.filter(img => img.type === 'url').length
        };
    }
    isUrl(src) {
        return src.startsWith('http://') ||
            src.startsWith('https://') ||
            src.startsWith('//');
    }
    resolvePath(src) {
        if (path.isAbsolute(src)) {
            return src;
        }
        return path.resolve(this.basePath, src);
    }
}
//# sourceMappingURL=extractor.js.map