import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_SERVICE = process.env.CONFLUENCE_MCP_SERVICE;
const ORIGINAL_LOG_DIR = process.env.MCP_ERROR_LOG_DIR;
const ORIGINAL_LOG_FILE = process.env.MCP_ERROR_LOG_FILE;

let tempDir: string | undefined;

afterEach(() => {
  vi.resetModules();

  if (ORIGINAL_SERVICE === undefined) {
    delete process.env.CONFLUENCE_MCP_SERVICE;
  } else {
    process.env.CONFLUENCE_MCP_SERVICE = ORIGINAL_SERVICE;
  }

  if (ORIGINAL_LOG_DIR === undefined) {
    delete process.env.MCP_ERROR_LOG_DIR;
  } else {
    process.env.MCP_ERROR_LOG_DIR = ORIGINAL_LOG_DIR;
  }

  if (ORIGINAL_LOG_FILE === undefined) {
    delete process.env.MCP_ERROR_LOG_FILE;
  } else {
    process.env.MCP_ERROR_LOG_FILE = ORIGINAL_LOG_FILE;
  }

  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("ConsoleLogger error diary", () => {
  it("writes error diary when running as MCP service", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "confluence-mcp-log-"));
    process.env.CONFLUENCE_MCP_SERVICE = "1";
    process.env.MCP_ERROR_LOG_DIR = tempDir;
    process.env.MCP_ERROR_LOG_FILE = "error.log";

    const { logger } = await import("./logger.js");
    logger.error("Tool execution failed", new Error("network timeout"));

    const logPath = path.join(tempDir, "error.log");
    expect(fs.existsSync(logPath)).toBe(true);

    const content = fs.readFileSync(logPath, "utf8");
    expect(content).toContain("[ERROR] Tool execution failed");
    expect(content).toContain("Error: network timeout");
  });

  it("does not write error diary outside MCP service mode", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "confluence-mcp-log-"));
    delete process.env.CONFLUENCE_MCP_SERVICE;
    process.env.MCP_ERROR_LOG_DIR = tempDir;
    process.env.MCP_ERROR_LOG_FILE = "error.log";

    const { logger } = await import("./logger.js");
    logger.error("Tool execution failed", new Error("network timeout"));

    const logPath = path.join(tempDir, "error.log");
    expect(fs.existsSync(logPath)).toBe(false);
  });
});
