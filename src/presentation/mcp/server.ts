// src/presentation/mcp/server.ts
import { startStdioServer } from "./transport/stdio.js";
import { logger } from "../../infrastructure/logger.js";

export async function startServer(): Promise<void> {
  try {
    await startStdioServer();
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}
