import { z } from "zod";
import type { CatalogIndex } from "./loader.js";
import { catalogKindSchema, type CatalogItem } from "./schema.js";

export const listCatalogInputSchema = z.object({
  kind: catalogKindSchema.optional(),
  tag: z.string().optional(),
  query: z.string().optional()
});

export const getCatalogInputSchema = z.object({
  id: z.string().min(1)
});

export const searchCatalogInputSchema = z.object({
  query: z.string().min(1),
  kind: catalogKindSchema.optional(),
  tag: z.string().optional()
});

export const renderCatalogInputSchema = z.object({
  id: z.string().min(1)
});

export type ListCatalogInput = z.infer<typeof listCatalogInputSchema>;
export type GetCatalogInput = z.infer<typeof getCatalogInputSchema>;
export type SearchCatalogInput = z.infer<typeof searchCatalogInputSchema>;
export type RenderCatalogInput = z.infer<typeof renderCatalogInputSchema>;

export interface RenderedCatalogItem {
  metadata: Omit<CatalogItem, "content">;
  content: string;
}

export function listCatalog(
  index: CatalogIndex,
  input: ListCatalogInput
): CatalogItem[] {
  return sortItems(index.items.filter((item) => matchesFilters(item, input)));
}

export function getCatalog(
  index: CatalogIndex,
  input: GetCatalogInput
): CatalogItem {
  const item = index.byId.get(input.id);
  if (!item) {
    throw new Error(`Catalog item not found: ${input.id}`);
  }
  return item;
}

export function searchCatalog(
  index: CatalogIndex,
  input: SearchCatalogInput
): CatalogItem[] {
  return sortItems(index.items.filter((item) => matchesFilters(item, input)));
}

export function renderCatalog(
  index: CatalogIndex,
  input: RenderCatalogInput
): RenderedCatalogItem {
  const item = getCatalog(index, input);
  const { content, ...metadata } = item;
  return { metadata, content };
}

export function findByUri(index: CatalogIndex, uri: string): CatalogItem {
  const item = index.byUri.get(uri);
  if (!item) {
    throw new Error(`Catalog resource not found: ${uri}`);
  }
  return item;
}

function matchesFilters(
  item: CatalogItem,
  input: { kind?: string; tag?: string; query?: string }
): boolean {
  if (input.kind && item.kind !== input.kind) {
    return false;
  }
  if (input.tag && !item.tags.includes(input.tag)) {
    return false;
  }
  if (input.query && !matchesQuery(item, input.query)) {
    return false;
  }
  return true;
}

function matchesQuery(item: CatalogItem, query: string): boolean {
  const normalizedQuery = normalize(query);
  const haystack = normalize(
    [item.id, item.name, item.description, item.tags.join(" "), item.content].join(
      "\n"
    )
  );
  return haystack.includes(normalizedQuery);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("en-US");
}

function sortItems(items: CatalogItem[]): CatalogItem[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}
