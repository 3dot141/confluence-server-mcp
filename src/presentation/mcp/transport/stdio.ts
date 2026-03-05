// src/presentation/mcp/transport/stdio.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { toolDefinitions } from "../tools/definitions.js";
import { handleToolCall } from "../tools/handlers.js";
import { logger } from "../../../infrastructure/logger.js";

export async function startStdioServer(): Promise<void> {
  const transport = new StdioServerTransport();

  const server = new Server(
    {
      name: "confluence-mcp-server",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: toolDefinitions };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Tool called: ${name}`);
    try {
      return await handleToolCall(name, (args as Record<string, unknown>) || {});
    } catch (error) {
      logger.error(`Tool call failed: ${name}`, error);
      throw error;
    }
  });

  await server.connect(transport);
  logger.info("Confluence MCP Server started (stdio mode)");
}
