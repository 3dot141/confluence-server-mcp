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
});
