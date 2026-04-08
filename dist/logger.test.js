// src/logger.test.ts
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, setDebug, isDebug } from './logger.js';
describe('logger', () => {
    let stderrSpy;
    beforeEach(() => {
        stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        setDebug(false);
    });
    afterEach(() => {
        stderrSpy.mockRestore();
        setDebug(false);
    });
    test('debug and info are silent when debug is off', () => {
        logger.debug('should not appear');
        logger.info('should not appear');
        expect(stderrSpy).not.toHaveBeenCalled();
    });
    test('debug and info output when debug is on', () => {
        setDebug(true);
        logger.debug('debug msg');
        logger.info('info msg');
        expect(stderrSpy).toHaveBeenCalledTimes(2);
        expect(stderrSpy.mock.calls[0][0]).toContain('[DEBUG]');
        expect(stderrSpy.mock.calls[1][0]).toContain('[INFO]');
    });
    test('warn and error always output', () => {
        logger.warn('warn msg');
        logger.error('error msg');
        expect(stderrSpy).toHaveBeenCalledTimes(2);
        expect(stderrSpy.mock.calls[0][0]).toContain('[WARN]');
        expect(stderrSpy.mock.calls[1][0]).toContain('[ERROR]');
    });
    test('isDebug reflects setDebug', () => {
        expect(isDebug()).toBe(false);
        setDebug(true);
        expect(isDebug()).toBe(true);
    });
});
//# sourceMappingURL=logger.test.js.map