#!/usr/bin/env node
import { startMcpServer } from "./mcp/server.js";

try {
  await startMcpServer();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start Obsidian integration MCP server: ${message}`);
  process.exit(1);
}
