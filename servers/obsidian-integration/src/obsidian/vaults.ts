import { promises as fs } from "node:fs";
import path from "node:path";
import {
  missingCliPayload,
  runObsidianRaw,
  type MissingCliPayload,
  type ObsidianCommandResult
} from "./cli.js";

export interface ObsidianVault {
  name: string;
  path: string;
}

export interface VaultInfo {
  name: string | null;
  path: string | null;
  available: boolean;
}

export function parseVaultsOutput(stdout: string): ObsidianVault[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...pathParts] = line.split("\t");
      return {
        name,
        path: pathParts.join("\t")
      };
    })
    .filter((vault) => vault.name && vault.path);
}

export async function listKnownVaults(
  runner: (args: string[]) => Promise<ObsidianCommandResult> = runObsidianRaw
): Promise<ObsidianVault[] | MissingCliPayload> {
  try {
    const result = await runner(["vaults", "verbose"]);
    if (!result.ok) {
      return [];
    }
    return parseVaultsOutput(result.stdout);
  } catch (error) {
    if (isMissingCliError(error)) {
      return missingCliPayload();
    }
    throw error;
  }
}

export async function resolveVaultInfo(input: {
  vault?: string;
  useRecentVault?: boolean;
  env?: NodeJS.ProcessEnv;
  runner?: (args: string[]) => Promise<ObsidianCommandResult>;
}): Promise<VaultInfo | MissingCliPayload> {
  const runner = input.runner ?? runObsidianRaw;
  const target = input.vault ?? input.env?.OBSIDIAN_VAULT ?? process.env.OBSIDIAN_VAULT;

  if (target) {
    const known = await listKnownVaults(runner);
    if (!Array.isArray(known)) {
      return known;
    }
    const vault = known.find((item) => item.name === target);
    return {
      name: target,
      path: vault?.path ?? null,
      available: Boolean(vault?.path)
    };
  }

  if (!input.useRecentVault) {
    return {
      name: null,
      path: null,
      available: false
    };
  }

  try {
    const [nameResult, pathResult] = await Promise.all([
      runner(["vault", "info=name"]),
      runner(["vault", "info=path"])
    ]);
    const name = nameResult.stdout.trim() || null;
    const vaultPath = pathResult.stdout.trim() || null;
    return {
      name,
      path: vaultPath,
      available: Boolean(name && vaultPath && nameResult.ok && pathResult.ok)
    };
  } catch (error) {
    if (isMissingCliError(error)) {
      return missingCliPayload();
    }
    throw error;
  }
}

export function resolveInsideVault(vaultPath: string, relativePath: string): string {
  const normalizedVault = path.resolve(vaultPath);
  const resolved = path.resolve(normalizedVault, relativePath);
  const relative = path.relative(normalizedVault, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes Obsidian vault: ${relativePath}`);
  }

  return resolved;
}

export async function writeVaultFile(
  vaultPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  const target = resolveInsideVault(vaultPath, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

export async function ensureVaultDirs(
  vaultPath: string,
  relativeDirs: string[]
): Promise<void> {
  for (const dir of relativeDirs) {
    await fs.mkdir(resolveInsideVault(vaultPath, dir), { recursive: true });
  }
}

function isMissingCliError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
