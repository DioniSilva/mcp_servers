import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  appendInputSchema,
  cliRunInputSchema,
  createInputSchema,
  executeObsidianTool,
  kbCreateInputSchema,
  kbStatusInputSchema,
  readInputSchema,
  searchInputSchema,
  toolResultJson,
  vaultInfoInputSchema
} from "./tools.js";

const resourceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../resources"
);

const resources = [
  {
    uri: "obsidian-skill://obsidian-cli",
    name: "Obsidian CLI Skill",
    description: "Guidance for using the Obsidian CLI.",
    mimeType: "text/markdown",
    path: "skills/obsidian-cli.md"
  },
  {
    uri: "obsidian-skill://obsidian-markdown",
    name: "Obsidian Markdown Skill",
    description: "Guidance for Obsidian Flavored Markdown.",
    mimeType: "text/markdown",
    path: "skills/obsidian-markdown.md"
  },
  {
    uri: "obsidian-skill://obsidian-bases",
    name: "Obsidian Bases Skill",
    description: "Guidance for Obsidian Bases files.",
    mimeType: "text/markdown",
    path: "skills/obsidian-bases.md"
  },
  {
    uri: "obsidian-kb://karpathy-pattern",
    name: "Karpathy LLM Knowledge Base Pattern",
    description: "Distilled reference pattern for LLM-maintained Obsidian KBs.",
    mimeType: "text/markdown",
    path: "kb/karpathy-pattern.md"
  }
];

const tools = [
  {
    name: "obsidian.health",
    description:
      "Reports whether the Obsidian CLI is available and how to fix setup issues.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} }
  },
  {
    name: "obsidian.vaults",
    description: "Lists known Obsidian vaults reported by the Obsidian CLI.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} }
  },
  {
    name: "obsidian.vault_info",
    description: "Resolves an Obsidian vault name or the recent vault to its local path.",
    inputSchema: zodToJsonSchema(vaultInfoInputSchema)
  },
  {
    name: "obsidian.search",
    description: "Searches Obsidian notes via the Obsidian CLI.",
    inputSchema: zodToJsonSchema(searchInputSchema)
  },
  {
    name: "obsidian.read",
    description: "Reads an Obsidian note by path or file name.",
    inputSchema: zodToJsonSchema(readInputSchema)
  },
  {
    name: "obsidian.create",
    description: "Creates an Obsidian note with validated input.",
    inputSchema: zodToJsonSchema(createInputSchema)
  },
  {
    name: "obsidian.append",
    description: "Appends content to an existing Obsidian note.",
    inputSchema: zodToJsonSchema(appendInputSchema)
  },
  {
    name: "obsidian.cli_run",
    description:
      "Runs an allowed Obsidian CLI command using argv passthrough. Never uses a shell.",
    inputSchema: zodToJsonSchema(cliRunInputSchema)
  },
  {
    name: "obsidian.kb_create",
    description: "Creates a Karpathy-style LLM knowledge base scaffold.",
    inputSchema: zodToJsonSchema(kbCreateInputSchema)
  },
  {
    name: "obsidian.kb_status",
    description: "Reads KB index, log, and schema status files.",
    inputSchema: zodToJsonSchema(kbStatusInputSchema)
  }
];

export function createMcpServer(): Server {
  const server = new Server(
    { name: "obsidian-integration-mcp-server", version: "0.3.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    toolResultJson(
      await executeObsidianTool(
        request.params.name,
        request.params.arguments ?? {}
      )
    )
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: resources.map(({ path: _path, ...resource }) => resource)
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resource = resources.find((item) => item.uri === request.params.uri);
    if (!resource) {
      throw new Error(`Unknown resource: ${request.params.uri}`);
    }

    const text = await fs.readFile(path.join(resourceRoot, resource.path), "utf8");
    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text
        }
      ]
    };
  });

  return server;
}

export async function startMcpServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await createMcpServer().connect(transport);
}
