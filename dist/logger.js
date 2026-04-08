// src/logger.ts
let _debug = false;
export function setDebug(enabled) {
    _debug = enabled;
}
export function isDebug() {
    return _debug;
}
export const logger = {
    debug(message, ...args) {
        if (_debug)
            console.error(`[DEBUG] ${message}`, ...args);
    },
    info(message, ...args) {
        if (_debug)
            console.error(`[INFO] ${message}`, ...args);
    },
    warn(message, ...args) {
        console.error(`[WARN] ${message}`, ...args);
    },
    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    },
};
//# sourceMappingURL=logger.js.map