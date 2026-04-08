// src/config.ts
import dotenv from 'dotenv';
dotenv.config();
let _config = null;
export function loadConfig() {
    const { CONF_BASE_URL, CONF_USERNAME, CONF_PASSWORD, CONF_TOKEN, CONF_SPACE, MERMAID_INK_URL } = process.env;
    if (!CONF_BASE_URL) {
        throw new Error('Missing required environment variable: CONF_BASE_URL');
    }
    if (!CONF_TOKEN && (!CONF_USERNAME || !CONF_PASSWORD)) {
        throw new Error('Missing authentication: Provide CONF_TOKEN or both CONF_USERNAME and CONF_PASSWORD');
    }
    _config = {
        baseUrl: CONF_BASE_URL,
        username: CONF_USERNAME || '',
        password: CONF_PASSWORD || '',
        token: CONF_TOKEN,
        defaultSpace: CONF_SPACE,
        mermaidInkUrl: MERMAID_INK_URL || 'https://mermaid.ink',
    };
    return _config;
}
export function getConfig() {
    if (!_config)
        _config = loadConfig();
    return _config;
}
export function isPatAuth() {
    return Boolean(getConfig().token);
}
export function getAuthHeader() {
    const cfg = getConfig();
    if (cfg.token)
        return `Bearer ${cfg.token}`;
    return `Basic ${Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')}`;
}
//# sourceMappingURL=config.js.map