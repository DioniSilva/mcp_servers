import { spawn } from "node:child_process";

export const missingCliGuidance = [
  "Install or enable the Obsidian CLI integration used by this environment.",
  "Confirm `obsidian help` works in a terminal.",
  "Open Obsidian before using operational tools.",
  "Optionally set OBSIDIAN_VAULT to target a specific vault."
] as const;

export interface MissingCliPayload {
  code: "OBSIDIAN_CLI_NOT_FOUND";
  message: string;
  guidance: readonly string[];
}

export interface ObsidianCommandResult {
  ok: boolean;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function missingCliPayload(): MissingCliPayload {
  return {
    code: "OBSIDIAN_CLI_NOT_FOUND",
    message:
      "The obsidian CLI was not found. This MCP server requires the Obsidian CLI and a running Obsidian instance for operational tools.",
    guidance: missingCliGuidance
  };
}

export function isMissingCliError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export function withVaultArg(
  args: string[],
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const vault = env.OBSIDIAN_VAULT;
  if (!vault || args.some((arg) => arg.startsWith("vault="))) {
    return args;
  }
  return [`vault=${vault}`, ...args];
}

export async function isObsidianCliAvailable(
  runner: (args: string[]) => Promise<ObsidianCommandResult> = runObsidianRaw
): Promise<boolean> {
  try {
    const result = await runner(["help"]);
    return result.ok || result.exitCode !== null;
  } catch (error) {
    if (isMissingCliError(error)) {
      return false;
    }
    return true;
  }
}

export async function runObsidian(
  args: string[],
  options: { env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}
): Promise<ObsidianCommandResult | MissingCliPayload> {
  try {
    return await runObsidianRaw(withVaultArg(args, options.env), options);
  } catch (error) {
    if (isMissingCliError(error)) {
      return missingCliPayload();
    }
    throw error;
  }
}

export function runObsidianRaw(
  args: string[],
  options: { env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}
): Promise<ObsidianCommandResult> {
  const timeoutMs = options.timeoutMs ?? 15000;

  return new Promise((resolve, reject) => {
    const child = spawn("obsidian", args, {
      env: { ...process.env, ...options.env },
      shell: false
    });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({
        ok: exitCode === 0,
        command: "obsidian",
        args,
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        exitCode
      });
    });
  });
}
