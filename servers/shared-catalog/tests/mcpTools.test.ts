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

  it("returns read-only update information", async () => {
    const index = await loadCatalog(rootDir);
    const info = executeCatalogTool(index, "catalog.update_info", {});

    expect(info).toEqual({
      packageName: "shared-catalog-mcp-server",
      currentVersion: "0.6.0",
      tagPrefix: "shared-catalog-v",
      releaseTagPattern: "shared-catalog-vX.Y.Z",
      installerUrl:
        "https://raw.githubusercontent.com/DioniSilva/mcp_servers/main/scripts/install-latest-shared-catalog.sh",
      installCommand:
        "curl -fsSL https://raw.githubusercontent.com/DioniSilva/mcp_servers/main/scripts/install-latest-shared-catalog.sh | bash",
      updateCommand:
        "curl -fsSL https://raw.githubusercontent.com/DioniSilva/mcp_servers/main/scripts/install-latest-shared-catalog.sh | bash",
      note: "This tool is read-only. It does not install or update the local server."
    });
  });
});
