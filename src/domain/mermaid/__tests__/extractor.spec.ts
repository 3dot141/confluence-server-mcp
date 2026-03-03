import { describe, it, expect } from 'vitest';
import { MermaidExtractor } from '../extractor.js';

describe('MermaidExtractor', () => {
  it('should extract single mermaid diagram', () => {
    const markdown = `
# Title

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`;
    const extractor = new MermaidExtractor();
    const result = extractor.extract(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].source).toBe('graph TD\n  A --> B');
  });

  it('should extract multiple diagrams', () => {
    const markdown = `
\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Some text

\`\`\`mermaid
sequenceDiagram
  A->>B: message
\`\`\`
`;
    const extractor = new MermaidExtractor();
    const result = extractor.extract(markdown);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('should return empty array when no diagrams', () => {
    const markdown = '# Title\n\nSome content';
    const extractor = new MermaidExtractor();
    const result = extractor.extract(markdown);

    expect(result).toHaveLength(0);
  });

  it('should handle diagrams with Chinese content', () => {
    const markdown = `
\`\`\`mermaid
graph TD
  A[开始] --> B[结束]
\`\`\`
`;
    const extractor = new MermaidExtractor();
    const result = extractor.extract(markdown);

    expect(result).toHaveLength(1);
    expect(result[0].source).toContain('开始');
  });
});
