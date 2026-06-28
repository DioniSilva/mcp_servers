import { z } from "zod";
import {
  commandConfirmationInvalidPayload,
  commandConfirmationRequiredPayload,
  findDeniedObsidianCommand,
  isCommandConfirmationValid,
  type CommandConfirmationInvalidPayload,
  type CommandConfirmationRequiredPayload
} from "../obsidian/guardrails.js";
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
import {
  ensureVaultDirs,
  listKnownVaults,
  resolveVaultInfo,
  writeVaultFile,
  type ObsidianVault,
  type VaultInfo
} from "../obsidian/vaults.js";

const vaultSelectionSchema = z.object({
  vault: z.string().min(1).optional(),
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
  args: z.array(z.string().min(1)).min(1),
  confirmDestructive: z.boolean().default(false),
  confirmationId: z.string().optional()
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

export const vaultInfoInputSchema = z.object({
  vault: z.string().min(1).optional(),
  useRecentVault: z.boolean().default(false)
});

type OperationalResult =
  | ObsidianCommandResult
  | MissingCliPayload
  | VaultDecisionRequiredPayload
  | CommandConfirmationRequiredPayload;

export async function executeObsidianTool(
  name: string,
  rawInput: unknown
): Promise<unknown> {
  switch (name) {
    case "obsidian.health":
      return obsidianHealth();
    case "obsidian.vaults":
      return obsidianVaults();
    case "obsidian.vault_info":
      return obsidianVaultInfo(vaultInfoInputSchema.parse(rawInput));
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
    case "obsidian.cli_run":
      return runCliPassthrough(cliRunInputSchema.parse(rawInput));
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
  knownVaults: ObsidianVault[] | null;
  vaultTarget: string | null;
  resolvedVaultPath: string | null;
  requiresVaultDecision: boolean;
  vaultDecision?: VaultDecisionRequiredPayload;
  guidance: readonly string[];
}> {
  const vaultTarget = process.env.OBSIDIAN_VAULT ?? null;
  const [cliAvailable, knownVaultsResult] = await Promise.all([
    isObsidianCliAvailable(),
    listKnownVaults()
  ]);
  const knownVaults = Array.isArray(knownVaultsResult) ? knownVaultsResult : null;
  const resolvedVaultPath = vaultTarget
    ? knownVaults?.find((vault) => vault.name === vaultTarget)?.path ?? null
    : null;

  return {
    cliAvailable,
    knownVaults,
    vaultTarget,
    resolvedVaultPath,
    requiresVaultDecision: !vaultTarget,
    vaultDecision: vaultTarget ? undefined : vaultDecisionRequiredPayload(knownVaults ?? undefined),
    guidance: missingCliPayload().guidance
  };
}

async function runOperationalTool(
  args: string[],
  options: { useRecentVault?: boolean; vault?: string } = {}
): Promise<OperationalResult> {
  const finalArgs = withExplicitVault(args, options.vault);
  const hasVaultTarget =
    finalArgs.some((arg) => arg.startsWith("vault=")) || Boolean(process.env.OBSIDIAN_VAULT);
  if (!hasVaultTarget && !options.useRecentVault) {
    const knownVaults = await listKnownVaults();
    return vaultDecisionRequiredPayload(Array.isArray(knownVaults) ? knownVaults : undefined);
  }

  const denied = findDeniedObsidianCommand(finalArgs);
  if (denied) {
    return commandConfirmationRequiredPayload(finalArgs);
  }
  return runObsidian(finalArgs, { useRecentVault: options.useRecentVault });
}

async function runOperationalToolFromInput(
  args: string[],
  input: { useRecentVault?: boolean; vault?: string }
): Promise<OperationalResult> {
  return runOperationalTool(args, {
    useRecentVault: input.useRecentVault,
    vault: input.vault
  });
}

async function runCliPassthrough(input: z.infer<typeof cliRunInputSchema>): Promise<
  | OperationalResult
  | CommandConfirmationInvalidPayload
> {
  const finalArgs = withExplicitVault(input.args, input.vault);
  const denied = findDeniedObsidianCommand(finalArgs);

  if (denied) {
    if (!input.confirmDestructive) {
      return commandConfirmationRequiredPayload(finalArgs);
    }
    if (!isCommandConfirmationValid(finalArgs, input)) {
      return commandConfirmationInvalidPayload(finalArgs, input.confirmationId);
    }
  }

  return runObsidian(finalArgs, { useRecentVault: input.useRecentVault });
}

async function createKnowledgeBase(
  input: z.infer<typeof kbCreateInputSchema>
): Promise<{
  rootPath: string;
  vault: VaultInfo | null;
  created: Array<{ path: string; ok: true }>;
  error?: MissingCliPayload | VaultDecisionRequiredPayload | { code: string; message: string };
}> {
  const scaffold = createKbScaffold(input);
  const vault = await resolveVaultInfo(input);

  if ("code" in vault) {
    return { rootPath: scaffold.rootPath, vault: null, created: [], error: vault };
  }

  if (!vault.available || !vault.path) {
    const knownVaults = await listKnownVaults();
    return {
      rootPath: scaffold.rootPath,
      vault,
      created: [],
      error: vaultDecisionRequiredPayload(Array.isArray(knownVaults) ? knownVaults : undefined)
    };
  }

  try {
    await ensureVaultDirs(
      vault.path,
      ["raw", "wiki", "outputs", "assets"].map((dir) => `${scaffold.rootPath}/${dir}`)
    );

    const created = [];
    for (const file of scaffold.files) {
      await writeVaultFile(vault.path, file.path, file.content);
      created.push({ path: file.path, ok: true as const });
    }

    return { rootPath: scaffold.rootPath, vault, created };
  } catch (error) {
    return {
      rootPath: scaffold.rootPath,
      vault,
      created: [],
      error: {
        code: "OBSIDIAN_KB_CREATE_FAILED",
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

async function kbStatus(input: z.infer<typeof kbStatusInputSchema>): Promise<{
  rootPath: string;
  index: OperationalResult;
  log: OperationalResult;
  schema: OperationalResult;
  missing: string[];
  complete: boolean;
}> {
  const root = input.rootPath.replace(/^\/+|\/+$/g, "");
  const [index, log, schema] = await Promise.all([
    runOperationalTool(["read", `path=${root}/wiki/index.md`], input),
    runOperationalTool(["read", `path=${root}/wiki/log.md`], input),
    runOperationalTool(["read", `path=${root}/schema.md`], input)
  ]);
  const entries = [
    ["wiki/index.md", index],
    ["wiki/log.md", log],
    ["schema.md", schema]
  ] as const;
  const missing = entries
    .filter(([, result]) => "ok" in result && !result.ok)
    .map(([path]) => `${root}/${path}`);
  const complete = entries.every(([, result]) => "ok" in result && result.ok);

  return { rootPath: root, index, log, schema, missing, complete };
}

async function obsidianVaults(): Promise<ObsidianVault[] | MissingCliPayload> {
  return listKnownVaults();
}

async function obsidianVaultInfo(
  input: z.infer<typeof vaultInfoInputSchema>
): Promise<VaultInfo | MissingCliPayload> {
  return resolveVaultInfo(input);
}

function withExplicitVault(args: string[], vault: string | undefined): string[] {
  if (!vault || args.some((arg) => arg.startsWith("vault="))) {
    return args;
  }
  return [`vault=${vault}`, ...args];
}
