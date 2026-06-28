const deniedCommandNames = new Set(["delete", "remove", "trash", "wipe", "reset"]);

export function assertAllowedObsidianArgs(args: string[]): void {
  const command = args.find((arg) => !arg.startsWith("vault="));
  if (!command) {
    throw new Error("Missing Obsidian CLI command.");
  }

  const normalized = command.toLocaleLowerCase("en-US");
  const commandParts = normalized.split(":");

  if (commandParts.some((part) => deniedCommandNames.has(part))) {
    throw new Error(
      `Blocked Obsidian CLI command "${command}". The denylist is a safety rail, not a complete security boundary.`
    );
  }
}
