import { z } from "zod";
import {
  getCatalog,
  getCatalogInputSchema,
  listCatalog,
  listCatalogInputSchema,
  renderCatalog,
  renderCatalogInputSchema,
  searchCatalog,
  searchCatalogInputSchema
} from "../catalog/service.js";
import type { CatalogIndex } from "../catalog/loader.js";

export const catalogToolNames = [
  "catalog.list",
  "catalog.get",
  "catalog.search",
  "catalog.render"
] as const;

export type CatalogToolName = (typeof catalogToolNames)[number];

export function executeCatalogTool(
  index: CatalogIndex,
  name: string,
  rawInput: unknown
): unknown {
  switch (name) {
    case "catalog.list":
      return listCatalog(index, parseInput(listCatalogInputSchema, rawInput)).map(
        summarizeItem
      );
    case "catalog.get":
      return getCatalog(index, parseInput(getCatalogInputSchema, rawInput));
    case "catalog.search":
      return searchCatalog(
        index,
        parseInput(searchCatalogInputSchema, rawInput)
      ).map(summarizeItem);
    case "catalog.render":
      return renderCatalog(index, parseInput(renderCatalogInputSchema, rawInput));
    default:
      throw new Error(`Unknown catalog tool: ${name}`);
  }
}

export function toolResultJson(value: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  rawInput: unknown
): z.infer<T> {
  return schema.parse(rawInput ?? {});
}

function summarizeItem(item: {
  id: string;
  name: string;
  description: string;
  tags: string[];
  version: string;
  kind: string;
  uri: string;
}): Omit<typeof item, "content"> {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    tags: item.tags,
    version: item.version,
    kind: item.kind,
    uri: item.uri
  };
}
