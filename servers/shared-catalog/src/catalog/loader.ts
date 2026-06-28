import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import {
  catalogItemMetadataSchema,
  catalogItemSchema,
  catalogKinds,
  catalogUri,
  type CatalogItem,
  type CatalogItemMetadata,
  type CatalogKind
} from "./schema.js";

const kindDirectories: Record<CatalogKind, string> = {
  skill: "skills",
  tool: "tools",
  prompt: "prompts",
  resource: "resources"
};

export class CatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogValidationError";
  }
}

export interface CatalogIndex {
  rootDir: string;
  items: CatalogItem[];
  byId: Map<string, CatalogItem>;
  byUri: Map<string, CatalogItem>;
}

export async function loadCatalog(rootDir: string): Promise<CatalogIndex> {
  const catalogDir = path.join(rootDir, "catalog");
  const items = (
    await Promise.all(
      catalogKinds.map(async (kind) => loadKindItems(catalogDir, kind))
    )
  ).flat();

  const byId = new Map<string, CatalogItem>();
  const byUri = new Map<string, CatalogItem>();

  for (const item of items) {
    if (byId.has(item.id)) {
      throw new CatalogValidationError(`Duplicate catalog id: ${item.id}`);
    }
    if (byUri.has(item.uri)) {
      throw new CatalogValidationError(`Duplicate catalog URI: ${item.uri}`);
    }
    byId.set(item.id, item);
    byUri.set(item.uri, item);
  }

  return { rootDir, items, byId, byUri };
}

async function loadKindItems(
  catalogDir: string,
  kind: CatalogKind
): Promise<CatalogItem[]> {
  const directory = path.join(catalogDir, kindDirectories[kind]);
  const files = await listFiles(directory);
  const expectedExtensions =
    kind === "tool" ? new Set([".yaml", ".yml"]) : new Set([".md"]);

  return Promise.all(
    files
      .filter((file) => expectedExtensions.has(path.extname(file)))
      .map((file) => loadCatalogFile(catalogDir, kind, file))
  );
}

async function listFiles(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          return listFiles(fullPath);
        }
        if (entry.isFile()) {
          return [fullPath];
        }
        return [];
      })
    );
    return nested.flat();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function loadCatalogFile(
  catalogDir: string,
  expectedKind: CatalogKind,
  filePath: string
): Promise<CatalogItem> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed =
    expectedKind === "tool"
      ? parseYamlCatalogFile(raw)
      : parseMarkdownCatalogFile(raw, filePath);

  const relativePath = path.relative(path.dirname(catalogDir), filePath);
  const metadata = catalogItemMetadataSchema.parse(parsed.metadata);

  if (metadata.kind !== expectedKind) {
    throw new CatalogValidationError(
      `${relativePath} declares kind "${metadata.kind}" but is under "${expectedKind}"`
    );
  }

  if (metadata.contentPath !== relativePath) {
    throw new CatalogValidationError(
      `${relativePath} contentPath must be "${relativePath}"`
    );
  }

  return catalogItemSchema.parse({
    ...metadata,
    content: parsed.content,
    uri: catalogUri(metadata.kind, metadata.id)
  });
}

function parseYamlCatalogFile(raw: string): {
  metadata: CatalogItemMetadata;
  content: string;
} {
  const parsed = YAML.parse(raw);
  return {
    metadata: parsed,
    content: raw.trimEnd()
  };
}

function parseMarkdownCatalogFile(
  raw: string,
  filePath: string
): { metadata: CatalogItemMetadata; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new CatalogValidationError(
      `${filePath} must start with YAML frontmatter`
    );
  }

  return {
    metadata: YAML.parse(match[1]),
    content: match[2].trim()
  };
}
