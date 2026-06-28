import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { CatalogIndex } from "../catalog/loader.js";
import { findByUri } from "../catalog/service.js";
import {
  getCatalogInputSchema,
  listCatalogInputSchema,
  renderCatalogInputSchema,
  searchCatalogInputSchema
} from "../catalog/service.js";
import { executeCatalogTool, toolResultJson } from "./catalogTools.js";

const toolDefinitions = [
  {
    name: "catalog.list",
    description: "Lists catalog items by kind, tag, and optional text query.",
    inputSchema: zodToJsonSchema(listCatalogInputSchema)
  },
  {
    name: "catalog.get",
    description: "Returns a complete catalog item by id.",
    inputSchema: zodToJsonSchema(getCatalogInputSchema)
  },
  {
    name: "catalog.search",
    description: "Searches item names, descriptions, tags, and content.",
    inputSchema: zodToJsonSchema(searchCatalogInputSchema)
  },
  {
    name: "catalog.render",
    description: "Returns ready-to-use content with normalized metadata.",
    inputSchema: zodToJsonSchema(renderCatalogInputSchema)
  }
];

export function createMcpServer(index: CatalogIndex): Server {
  const server = new Server(
    {
      name: "shared-catalog-mcp-server",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    toolResultJson(
      executeCatalogTool(
        index,
        request.params.name,
        request.params.arguments ?? {}
      )
    )
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: index.items.map((item) => ({
      uri: item.uri,
      name: item.name,
      description: item.description,
      mimeType: item.kind === "tool" ? "application/yaml" : "text/markdown"
    }))
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const item = findByUri(index, request.params.uri);
    return {
      contents: [
        {
          uri: item.uri,
          mimeType: item.kind === "tool" ? "application/yaml" : "text/markdown",
          text: item.content
        }
      ]
    };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: index.items
      .filter((item) => item.kind === "prompt")
      .map((item) => ({
        name: item.id,
        title: item.name,
        description: item.description
      }))
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const item = index.byId.get(request.params.name);
    if (!item || item.kind !== "prompt") {
      throw new Error(`Catalog prompt not found: ${request.params.name}`);
    }

    return {
      description: item.description,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: renderPromptTemplate(
              item.content,
              request.params.arguments ?? {}
            )
          }
        }
      ]
    };
  });

  return server;
}

export async function startMcpServer(index: CatalogIndex): Promise<void> {
  const server = createMcpServer(index);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function renderPromptTemplate(
  template: string,
  args: Record<string, unknown>
): string {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const value = args[key];
    return typeof value === "string" ? value : "";
  });
}
