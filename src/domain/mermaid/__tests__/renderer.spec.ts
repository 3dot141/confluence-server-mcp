import { describe, it, expect } from 'vitest';
import { MermaidRenderer } from '../renderer.js';

describe('MermaidRenderer', () => {
  it('should render mermaid diagram to PNG', async () => {
    const renderer = new MermaidRenderer();
    const source = 'graph TD\n  A --> B';

    const result = await renderer.render(source, { id: 1 });

    expect(result.success).toBe(true);
    expect(result.imageBuffer).toBeDefined();
    expect(result.imageBuffer!.byteLength).toBeGreaterThan(0);
  });

  it('should handle invalid mermaid syntax gracefully', async () => {
    const renderer = new MermaidRenderer();
    const source = 'invalid syntax here!!!';

    const result = await renderer.render(source, { id: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.imageBuffer).toBeUndefined();
  });

  it('should handle empty source', async () => {
    const renderer = new MermaidRenderer();

    const result = await renderer.render('', { id: 1 });

    expect(result.success).toBe(false);
  });
});
