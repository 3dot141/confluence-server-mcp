// src/config.test.ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
describe('loadConfig', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    test('loads config from env vars with token auth', async () => {
        process.env.CONF_BASE_URL = 'https://wiki.example.com';
        process.env.CONF_TOKEN = 'my-token';
        process.env.CONF_SPACE = 'DEV';
        const { loadConfig } = await import('./config.js');
        const cfg = loadConfig();
        expect(cfg.baseUrl).toBe('https://wiki.example.com');
        expect(cfg.token).toBe('my-token');
        expect(cfg.defaultSpace).toBe('DEV');
    });
    test('loads config with basic auth', async () => {
        process.env.CONF_BASE_URL = 'https://wiki.example.com';
        process.env.CONF_USERNAME = 'user';
        process.env.CONF_PASSWORD = 'pass';
        const { loadConfig } = await import('./config.js');
        const cfg = loadConfig();
        expect(cfg.username).toBe('user');
        expect(cfg.password).toBe('pass');
    });
    test('throws if CONF_BASE_URL missing', async () => {
        delete process.env.CONF_BASE_URL;
        delete process.env.CONF_TOKEN;
        delete process.env.CONF_USERNAME;
        delete process.env.CONF_PASSWORD;
        const { loadConfig } = await import('./config.js');
        expect(() => loadConfig()).toThrow('CONF_BASE_URL');
    });
    test('throws if no auth provided', async () => {
        process.env.CONF_BASE_URL = 'https://wiki.example.com';
        delete process.env.CONF_TOKEN;
        delete process.env.CONF_USERNAME;
        delete process.env.CONF_PASSWORD;
        const { loadConfig } = await import('./config.js');
        expect(() => loadConfig()).toThrow('authentication');
    });
    test('getAuthHeader returns Bearer for token auth', async () => {
        process.env.CONF_BASE_URL = 'https://wiki.example.com';
        process.env.CONF_TOKEN = 'my-token';
        const { loadConfig, getAuthHeader } = await import('./config.js');
        loadConfig();
        expect(getAuthHeader()).toBe('Bearer my-token');
    });
    test('getAuthHeader returns Basic for user/pass auth', async () => {
        process.env.CONF_BASE_URL = 'https://wiki.example.com';
        process.env.CONF_USERNAME = 'user';
        process.env.CONF_PASSWORD = 'pass';
        const { loadConfig, getAuthHeader } = await import('./config.js');
        loadConfig();
        const expected = `Basic ${Buffer.from('user:pass').toString('base64')}`;
        expect(getAuthHeader()).toBe(expected);
    });
});
//# sourceMappingURL=config.test.js.map