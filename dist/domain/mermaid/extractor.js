export class MermaidExtractor {
    extract(markdown) {
        const diagrams = [];
        const pattern = /```mermaid\n([\s\S]*?)```/g;
        let match;
        let id = 1;
        while ((match = pattern.exec(markdown)) !== null) {
            diagrams.push({
                id: id++,
                source: match[1].trim(),
                position: {
                    start: match.index,
                    end: match.index + match[0].length
                }
            });
        }
        return diagrams;
    }
}
//# sourceMappingURL=extractor.js.map