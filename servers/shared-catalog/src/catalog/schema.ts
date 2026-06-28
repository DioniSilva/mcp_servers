import { z } from "zod";

export const catalogKinds = ["skill", "tool", "prompt", "resource"] as const;

export const catalogKindSchema = z.enum(catalogKinds);

export const jsonSchemaLikeSchema = z.record(z.unknown());

export const catalogItemMetadataSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9._-]*$/, "id must be lowercase and URL-safe"),
  name: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  version: z.string().min(1),
  kind: catalogKindSchema,
  contentPath: z.string().min(1),
  inputSchema: jsonSchemaLikeSchema.optional(),
  clientHints: z.record(z.unknown()).optional()
});

export const catalogItemSchema = catalogItemMetadataSchema.extend({
  content: z.string(),
  uri: z.string().min(1)
});

export type CatalogKind = z.infer<typeof catalogKindSchema>;
export type CatalogItemMetadata = z.infer<typeof catalogItemMetadataSchema>;
export type CatalogItem = z.infer<typeof catalogItemSchema>;

export function catalogUri(kind: CatalogKind, id: string): string {
  return `catalog://${kind}/${id}`;
}
