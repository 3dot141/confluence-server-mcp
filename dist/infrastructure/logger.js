// src/infrastructure/logger.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import util from "node:util";
const DEFAULT_ERROR_LOG_DIR = path.join(os.homedir(), ".nocode", "mcps", "confluence-mcp-server");
const DEFAULT_ERROR_LOG_FILE = "error.log";
function isMcpServiceMode() {
    return process.env.CONFLUENCE_MCP_SERVICE === "1";
}
function stringifyArg(arg) {
    if (arg instanceof Error) {
        return arg.stack || arg.message;
    }
    if (typeof arg === "string") {
        return arg;
    }
    return util.inspect(arg, { depth: 6, breakLength: 120 });
}
function writeErrorDiary(message, args) {
    if (!isMcpServiceMode()) {
        return;
    }
    const logDir = process.env.MCP_ERROR_LOG_DIR || DEFAULT_ERROR_LOG_DIR;
    const logFile = process.env.MCP_ERROR_LOG_FILE || DEFAULT_ERROR_LOG_FILE;
    const logPath = path.join(logDir, logFile);
    const details = args.map(stringifyArg).join(" | ");
    const ts = new Date().toISOString();
    const line = details
        ? `[${ts}] [ERROR] ${message} | ${details}\n`
        : `[${ts}] [ERROR] ${message}\n`;
    try {
        fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(logPath, line, "utf8");
    }
    catch (err) {
        const fallback = err instanceof Error ? err.message : String(err);
        console.error(`[WARN] Failed to write error diary: ${fallback}`);
    }
}
class ConsoleLogger {
    info(message, ...args) {
        console.error(`[INFO] ${message}`, ...args);
    }
    warn(message, ...args) {
        console.error(`[WARN] ${message}`, ...args);
    }
    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
        writeErrorDiary(message, args);
    }
    debug(message, ...args) {
        if (process.env.DEBUG) {
            console.error(`[DEBUG] ${message}`, ...args);
        }
    }
}
export const logger = new ConsoleLogger();
//# sourceMappingURL=logger.js.map