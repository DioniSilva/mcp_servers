import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { catalogItemMetadataSchema } from "../src/catalog/schema.js";
import { loadCatalog } from "../src/catalog/loader.js";
import {
  getCatalog,
  listCatalog,
  renderCatalog,
  searchCatalog
} from "../src/catalog/service.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("catalog schemas", () => {
  it("validates required metadata", () => {
    const parsed = catalogItemMetadataSchema.parse({
      id: "example-skill",
      name: "Example Skill",
      description: "A valid example.",
      tags: ["example"],
      version: "0.1.0",
      kind: "skill",
      contentPath: "catalog/skills/example-skill.md"
    });

    expect(parsed.id).toBe("example-skill");
  });

  it("rejects unsafe ids", () => {
    expect(() =>
      catalogItemMetadataSchema.parse({
        id: "Bad ID",
        name: "Bad",
        description: "Invalid id.",
        tags: [],
        version: "0.1.0",
        kind: "skill",
        contentPath: "catalog/skills/bad.md"
      })
    ).toThrow();
  });
});

describe("catalog loading and lookup", () => {
  it("loads all example catalog items", async () => {
    const index = await loadCatalog(rootDir);
    expect(index.items.map((item) => item.id).sort()).toEqual([
      "code-review-checklist",
      "implementation-plan",
      "mcp-client-configs",
      "obsidian-integration-install",
      "obsidian-integration-tools",
      "obsidian-kb-workflow",
      "repo-search"
    ]);
  });

  it("lists items by kind and tag", async () => {
    const index = await loadCatalog(rootDir);
    expect(listCatalog(index, { kind: "skill" }).map((item) => item.id)).toEqual([
      "code-review-checklist",
      "obsidian-kb-workflow"
    ]);
    expect(listCatalog(index, { tag: "coding" }).map((item) => item.id)).toEqual([
      "code-review-checklist",
      "implementation-plan",
      "repo-search"
    ]);
  });

  it("searches item content", async () => {
    const index = await loadCatalog(rootDir);
    const results = searchCatalog(index, { query: "stdio" });
    expect(results.map((item) => item.id)).toContain("mcp-client-configs");
  });

  it("gets and renders an item by id", async () => {
    const index = await loadCatalog(rootDir);
    const item = getCatalog(index, { id: "repo-search" });
    const rendered = renderCatalog(index, { id: item.id });

    expect(item.kind).toBe("tool");
    expect(rendered.metadata.id).toBe("repo-search");
    expect(rendered.content).toContain("recommendedCommand: rg");
  });
});
