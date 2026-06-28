#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./catalog/loader.js";
import { startMcpServer } from "./mcp/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

try {
  const catalog = await loadCatalog(rootDir);
  await startMcpServer(catalog);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start shared catalog MCP server: ${message}`);
  process.exit(1);
}
