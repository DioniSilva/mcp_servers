import { createHash } from "node:crypto";

const deniedCommandNames = new Set(["delete", "remove", "trash", "wipe", "reset"]);

export interface CommandConfirmationRequiredPayload {
  code: "OBSIDIAN_COMMAND_CONFIRMATION_REQUIRED";
  command: string;
  args: string[];
  confirmationId: string;
  risk: string;
  expectedImpact: string;
  retry: {
    confirmDestructive: true;
    confirmationId: string;
  };
}

export interface CommandConfirmationInvalidPayload {
  code: "OBSIDIAN_COMMAND_CONFIRMATION_INVALID";
  message: string;
  expectedConfirmationId: string;
  receivedConfirmationId: string | null;
}

export function getObsidianCommand(args: string[]): string {
  const command = args.find((arg) => !arg.startsWith("vault="));
  if (!command) {
    throw new Error("Missing Obsidian CLI command.");
  }

  return command;
}

export function findDeniedObsidianCommand(args: string[]): string | null {
  const command = getObsidianCommand(args);
  const normalized = command.toLocaleLowerCase("en-US");
  const commandParts = normalized.split(":");

  if (commandParts.some((part) => deniedCommandNames.has(part))) {
    return command;
  }

  return null;
}

export function confirmationIdForArgs(args: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify(args))
    .digest("hex")
    .slice(0, 16);
}

export function commandConfirmationRequiredPayload(
  args: string[]
): CommandConfirmationRequiredPayload {
  const command = getObsidianCommand(args);
  const confirmationId = confirmationIdForArgs(args);

  return {
    code: "OBSIDIAN_COMMAND_CONFIRMATION_REQUIRED",
    command,
    args,
    confirmationId,
    risk:
      "This Obsidian CLI command is potentially destructive and can remove or reset user data.",
    expectedImpact:
      "If confirmed, the MCP server will run exactly this argv array once using spawn without a shell.",
    retry: {
      confirmDestructive: true,
      confirmationId
    }
  };
}

export function commandConfirmationInvalidPayload(
  args: string[],
  receivedConfirmationId: string | undefined
): CommandConfirmationInvalidPayload {
  const expectedConfirmationId = confirmationIdForArgs(args);
  return {
    code: "OBSIDIAN_COMMAND_CONFIRMATION_INVALID",
    message:
      "The destructive command confirmation does not match the requested Obsidian CLI argv array.",
    expectedConfirmationId,
    receivedConfirmationId: receivedConfirmationId ?? null
  };
}

export function isCommandConfirmationValid(
  args: string[],
  input: { confirmDestructive?: boolean; confirmationId?: string }
): boolean {
  return Boolean(
    input.confirmDestructive && input.confirmationId === confirmationIdForArgs(args)
  );
}

export function assertAllowedObsidianArgs(args: string[]): void {
  const deniedCommand = findDeniedObsidianCommand(args);
  if (deniedCommand) {
    throw new Error(
      `Blocked Obsidian CLI command "${deniedCommand}". The denylist is a safety rail, not a complete security boundary.`
    );
  }
}
