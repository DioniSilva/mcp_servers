import { z } from "zod";
import { assertAllowedObsidianArgs } from "../obsidian/guardrails.js";
import {
  isObsidianCliAvailable,
  missingCliPayload,
  runObsidian,
  type MissingCliPayload,
  type ObsidianCommandResult,
  type VaultDecisionRequiredPayload,
  vaultDecisionRequiredPayload
} from "../obsidian/cli.js";
import { createKbScaffold } from "../obsidian/kb.js";

const vaultSelectionSchema = z.object({
  useRecentVault: z.boolean().default(false)
});

export const searchInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).optional()
}).merge(vaultSelectionSchema);

export const readInputSchema = z
  .object({
    path: z.string().min(1).optional(),
    file: z.string().min(1).optional()
  })
  .merge(vaultSelectionSchema)
  .refine((input) => input.path || input.file, {
    message: "Either path or file is required."
  });

export const createInputSchema = z.object({
  name: z.string().min(1),
  content: z.string().default(""),
  silent: z.boolean().default(true),
  overwrite: z.boolean().default(false)
}).merge(vaultSelectionSchema);

export const appendInputSchema = z
  .object({
    path: z.string().min(1).optional(),
    file: z.string().min(1).optional(),
    content: z.string().min(1)
  })
  .merge(vaultSelectionSchema)
  .refine((input) => input.path || input.file, {
    message: "Either path or file is required."
  });

export const cliRunInputSchema = z.object({
  args: z.array(z.string().min(1)).min(1)
}).merge(vaultSelectionSchema);

export const kbCreateInputSchema = z.object({
  name: z.string().min(1),
  rootPath: z.string().min(1).optional(),
  description: z.string().optional(),
  includeBases: z.boolean().default(true)
}).merge(vaultSelectionSchema);

export const kbStatusInputSchema = z.object({
  rootPath: z.string().min(1)
}).merge(vaultSelectionSchema);

export async function executeObsidianTool(
  name: string,
  rawInput: unknown
): Promise<unknown> {
  switch (name) {
    case "obsidian.health":
      return obsidianHealth();
    case "obsidian.search":
      return runOperationalToolFromInput(
        buildSearchArgs(searchInputSchema.parse(rawInput)),
        searchInputSchema.parse(rawInput)
      );
    case "obsidian.read":
      return runOperationalToolFromInput(
        buildReadArgs(readInputSchema.parse(rawInput)),
        readInputSchema.parse(rawInput)
      );
    case "obsidian.create":
      return runOperationalToolFromInput(
        buildCreateArgs(createInputSchema.parse(rawInput)),
        createInputSchema.parse(rawInput)
      );
    case "obsidian.append":
      return runOperationalToolFromInput(
        buildAppendArgs(appendInputSchema.parse(rawInput)),
        appendInputSchema.parse(rawInput)
      );
    case "obsidian.cli_run": {
      const input = cliRunInputSchema.parse(rawInput);
      assertAllowedObsidianArgs(input.args);
      return runOperationalToolFromInput(input.args, input);
    }
    case "obsidian.kb_create":
      return createKnowledgeBase(kbCreateInputSchema.parse(rawInput));
    case "obsidian.kb_status":
      return kbStatus(kbStatusInputSchema.parse(rawInput));
    default:
      throw new Error(`Unknown Obsidian tool: ${name}`);
  }
}

export function toolResultJson(value: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }]
  };
}

export function buildSearchArgs(input: z.infer<typeof searchInputSchema>): string[] {
  return [
    "search",
    `query=${input.query}`,
    ...(input.limit ? [`limit=${input.limit}`] : [])
  ];
}

export function buildReadArgs(input: z.infer<typeof readInputSchema>): string[] {
  return ["read", input.path ? `path=${input.path}` : `file=${input.file}`];
}

export function buildCreateArgs(input: z.infer<typeof createInputSchema>): string[] {
  return [
    "create",
    `name=${input.name}`,
    `content=${input.content}`,
    ...(input.silent ? ["silent"] : []),
    ...(input.overwrite ? ["overwrite"] : [])
  ];
}

export function buildAppendArgs(input: z.infer<typeof appendInputSchema>): string[] {
  return [
    "append",
    input.path ? `path=${input.path}` : `file=${input.file}`,
    `content=${input.content}`
  ];
}

async function obsidianHealth(): Promise<{
  cliAvailable: boolean;
  vaultTarget: string | null;
  requiresVaultDecision: boolean;
  vaultDecision?: VaultDecisionRequiredPayload;
  guidance: readonly string[];
}> {
  const vaultTarget = process.env.OBSIDIAN_VAULT ?? null;
  return {
    cliAvailable: await isObsidianCliAvailable(),
    vaultTarget,
    requiresVaultDecision: !vaultTarget,
    vaultDecision: vaultTarget ? undefined : vaultDecisionRequiredPayload(),
    guidance: missingCliPayload().guidance
  };
}

async function runOperationalTool(
  args: string[],
  options: { useRecentVault?: boolean } = {}
): Promise<ObsidianCommandResult | MissingCliPayload | VaultDecisionRequiredPayload> {
  assertAllowedObsidianArgs(args);
  return runObsidian(args, { useRecentVault: options.useRecentVault });
}

async function runOperationalToolFromInput(
  args: string[],
  input: { useRecentVault?: boolean }
): Promise<ObsidianCommandResult | MissingCliPayload | VaultDecisionRequiredPayload> {
  return runOperationalTool(args, { useRecentVault: input.useRecentVault });
}

async function createKnowledgeBase(
  input: z.infer<typeof kbCreateInputSchema>
): Promise<{
  rootPath: string;
  created: Array<ObsidianCommandResult | MissingCliPayload | VaultDecisionRequiredPayload>;
}> {
  const scaffold = createKbScaffold(input);
  const created = [];

  for (const file of scaffold.files) {
    const result = await runOperationalTool([
      "create",
      `name=${file.path}`,
      `content=${file.content}`,
      "silent",
      "overwrite"
    ], { useRecentVault: input.useRecentVault });
    created.push(result);

    if ("code" in result) {
      break;
    }
  }

  return { rootPath: scaffold.rootPath, created };
}

async function kbStatus(input: z.infer<typeof kbStatusInputSchema>): Promise<{
  rootPath: string;
  index: ObsidianCommandResult | MissingCliPayload | VaultDecisionRequiredPayload;
  log: ObsidianCommandResult | MissingCliPayload | VaultDecisionRequiredPayload;
  schema: ObsidianCommandResult | MissingCliPayload | VaultDecisionRequiredPayload;
}> {
  const root = input.rootPath.replace(/^\/+|\/+$/g, "");
  const [index, log, schema] = await Promise.all([
    runOperationalTool(["read", `path=${root}/wiki/index.md`], {
      useRecentVault: input.useRecentVault
    }),
    runOperationalTool(["read", `path=${root}/wiki/log.md`], {
      useRecentVault: input.useRecentVault
    }),
    runOperationalTool(["read", `path=${root}/schema.md`], {
      useRecentVault: input.useRecentVault
    })
  ]);

  return { rootPath: root, index, log, schema };
}
