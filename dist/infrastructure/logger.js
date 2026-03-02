// src/infrastructure/logger.ts
class ConsoleLogger {
    info(message, ...args) {
        console.error(`[INFO] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.error(`[WARN] ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }
    debug(message, ...args) {
        if (process.env.DEBUG) {
            console.error(`[DEBUG] ${message}`, ...args);
        }
    }
}
export const logger = new ConsoleLogger();
//# sourceMappingURL=logger.js.map