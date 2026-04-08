// src/output.test.ts
import { describe, test, expect } from 'vitest';
import { formatOutput, formatTable } from './output.js';
describe('formatOutput', () => {
    test('outputs JSON when json flag is true', () => {
        const data = { id: '123', title: 'Test' };
        const result = formatOutput(data, true);
        expect(result).toBe(JSON.stringify(data, null, 2));
    });
    test('outputs string as-is when json flag is false', () => {
        const result = formatOutput('hello', false);
        expect(result).toBe('hello');
    });
});
describe('formatTable', () => {
    test('formats array of objects as aligned table', () => {
        const data = [
            { key: 'DEV', name: 'Development' },
            { key: 'PROD', name: 'Production' },
        ];
        const result = formatTable(data, ['key', 'name']);
        expect(result).toContain('KEY');
        expect(result).toContain('DEV');
        expect(result).toContain('Development');
    });
});
//# sourceMappingURL=output.test.js.map