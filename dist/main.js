#!/usr/bin/env node
import { startServer } from "./presentation/mcp/server.js";
import { logger } from "./infrastructure/logger.js";
process.env.CONFLUENCE_MCP_SERVICE = "1";
process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception in MCP service", error);
});
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection in MCP service", reason);
});
startServer();
//# sourceMappingURL=main.js.map