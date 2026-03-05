// src/infrastructure/logger.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import util from "node:util";

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

const DEFAULT_ERROR_LOG_DIR = path.join(os.homedir(), ".nocode", "mcps", "confluence-mcp-server");
const DEFAULT_ERROR_LOG_FILE = "error.log";

function isMcpServiceMode(): boolean {
  return process.env.CONFLUENCE_MCP_SERVICE === "1";
}

function stringifyArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }
  if (typeof arg === "string") {
    return arg;
  }
  return util.inspect(arg, { depth: 6, breakLength: 120 });
}

function writeErrorDiary(message: string, args: unknown[]): void {
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
  } catch (err) {
    const fallback = err instanceof Error ? err.message : String(err);
    console.error(`[WARN] Failed to write error diary: ${fallback}`);
  }
}

class ConsoleLogger implements Logger {
  info(message: string, ...args: unknown[]): void {
    console.error(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.error(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
    writeErrorDiary(message, args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }
}

export const logger: Logger = new ConsoleLogger();
