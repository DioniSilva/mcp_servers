import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog/loader.js";
import { executeCatalogTool, toolResultJson } from "../src/mcp/catalogTools.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("MCP catalog tool contract", () => {
  it("returns stable JSON text content for catalog.list", async () => {
    const index = await loadCatalog(rootDir);
    const result = toolResultJson(
      executeCatalogTool(index, "catalog.list", { kind: "prompt" })
    );

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: expect.any(String)
        }
      ]
    });
    expect(JSON.parse(result.content[0].text)).toEqual([
      {
        id: "implementation-plan",
        name: "Implementation Plan",
        description:
          "Prompt for turning a request into an executable implementation plan.",
        tags: ["planning", "coding"],
        version: "0.1.0",
        kind: "prompt",
        uri: "catalog://prompt/implementation-plan"
      }
    ]);
  });

  it("does not execute cataloged tools", async () => {
    const index = await loadCatalog(rootDir);
    const tool = executeCatalogTool(index, "catalog.get", { id: "repo-search" });

    expect(tool).toMatchObject({
      id: "repo-search",
      clientHints: {
        execution: "not-supported"
      }
    });
  });
});
