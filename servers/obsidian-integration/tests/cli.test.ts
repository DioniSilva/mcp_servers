import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  assertAllowedObsidianArgs,
  confirmationIdForArgs,
  isCommandConfirmationValid
} from "../src/obsidian/guardrails.js";
import { createKbScaffold } from "../src/obsidian/kb.js";
import {
  missingCliPayload,
  runObsidian,
  vaultDecisionRequiredPayload,
  withVaultArg
} from "../src/obsidian/cli.js";
import {
  ensureVaultDirs,
  parseVaultsOutput,
  resolveInsideVault,
  resolveVaultInfo,
  writeVaultFile
} from "../src/obsidian/vaults.js";
import {
  buildAppendArgs,
  buildCreateArgs,
  buildReadArgs,
  buildSearchArgs,
  executeObsidianTool
} from "../src/mcp/tools.js";

describe("Obsidian CLI helpers", () => {
  it("prepends OBSIDIAN_VAULT when no vault arg is present", () => {
    expect(withVaultArg(["search", "query=test"], { OBSIDIAN_VAULT: "Lab" })).toEqual([
      "vault=Lab",
      "search",
      "query=test"
    ]);
  });

  it("does not duplicate an explicit vault arg", () => {
    expect(withVaultArg(["vault=Other", "read"], { OBSIDIAN_VAULT: "Lab" })).toEqual([
      "vault=Other",
      "read"
    ]);
  });

  it("builds safe argv arrays", () => {
    expect(buildSearchArgs({ query: "llm", limit: 5, useRecentVault: false })).toEqual([
      "search",
      "query=llm",
      "limit=5"
    ]);
    expect(buildReadArgs({ path: "A/B.md", useRecentVault: false })).toEqual([
      "read",
      "path=A/B.md"
    ]);
    expect(
      buildCreateArgs({
        name: "A",
        content: "# A",
        silent: true,
        overwrite: false,
        useRecentVault: false
      })
    ).toEqual(["create", "name=A", "content=# A", "silent"]);
    expect(buildAppendArgs({ file: "A", content: "More", useRecentVault: false })).toEqual([
      "append",
      "file=A",
      "content=More"
    ]);
  });

  it("blocks denied passthrough commands", () => {
    expect(() => assertAllowedObsidianArgs(["delete", "path=A.md"])).toThrow(
      /Blocked/
    );
    expect(() => assertAllowedObsidianArgs(["property:set"])).not.toThrow();
  });

  it("returns confirmation payload for denied passthrough commands", async () => {
    const result = await executeObsidianTool("obsidian.cli_run", {
      args: ["vault=Lab", "delete", "path=A.md"]
    });

    expect(result).toMatchObject({
      code: "OBSIDIAN_COMMAND_CONFIRMATION_REQUIRED",
      command: "delete",
      confirmationId: confirmationIdForArgs(["vault=Lab", "delete", "path=A.md"]),
      retry: {
        confirmDestructive: true
      }
    });
  });

  it("rejects destructive confirmation ids that do not match the argv array", async () => {
    const result = await executeObsidianTool("obsidian.cli_run", {
      args: ["vault=Lab", "delete", "path=A.md"],
      confirmDestructive: true,
      confirmationId: "wrong"
    });

    expect(result).toMatchObject({
      code: "OBSIDIAN_COMMAND_CONFIRMATION_INVALID",
      expectedConfirmationId: confirmationIdForArgs(["vault=Lab", "delete", "path=A.md"]),
      receivedConfirmationId: "wrong"
    });
  });

  it("accepts destructive confirmation only for the same argv array", () => {
    const args = ["vault=Lab", "delete", "path=A.md"];
    const confirmationId = confirmationIdForArgs(args);

    expect(isCommandConfirmationValid(args, {
      confirmDestructive: true,
      confirmationId
    })).toBe(true);
    expect(isCommandConfirmationValid(["vault=Lab", "delete", "path=B.md"], {
      confirmDestructive: true,
      confirmationId
    })).toBe(false);
  });

  it("returns missing CLI guidance shape", () => {
    expect(missingCliPayload()).toMatchObject({
      code: "OBSIDIAN_CLI_NOT_FOUND",
      guidance: expect.arrayContaining([
        "Confirm `obsidian help` works in a terminal."
      ])
    });
  });

  it("returns vault decision guidance shape", () => {
    expect(vaultDecisionRequiredPayload()).toMatchObject({
      code: "OBSIDIAN_VAULT_DECISION_REQUIRED",
      choices: expect.arrayContaining([
        expect.objectContaining({ id: "use_recent_vault" }),
        expect.objectContaining({ id: "create_or_select_vault" })
      ])
    });
  });

  it("requires an explicit vault decision before using the recent vault", async () => {
    const result = await runObsidian(["search", "query=test"], {
      env: {},
      useRecentVault: false
    });

    expect(result).toMatchObject({
      code: "OBSIDIAN_VAULT_DECISION_REQUIRED"
    });
  });
});

describe("KB scaffold", () => {
  it("creates the Karpathy-style layout", () => {
    const scaffold = createKbScaffold({ name: "LLM Systems" });
    expect(scaffold.rootPath).toBe("Knowledge Bases/llm-systems");
    expect(scaffold.files.map((file) => file.path)).toEqual([
      "Knowledge Bases/llm-systems/raw/README.md",
      "Knowledge Bases/llm-systems/assets/README.md",
      "Knowledge Bases/llm-systems/outputs/README.md",
      "Knowledge Bases/llm-systems/schema.md",
      "Knowledge Bases/llm-systems/wiki/index.md",
      "Knowledge Bases/llm-systems/wiki/log.md",
      "Knowledge Bases/llm-systems/KB Dashboard.base"
    ]);
    expect(scaffold.files.find((file) => file.path.endsWith("schema.md"))?.content).toContain(
      "Raw sources are immutable"
    );
  });

  it("supports custom root path and no base file", () => {
    const scaffold = createKbScaffold({
      name: "AI",
      rootPath: "/Research/AI/",
      includeBases: false
    });
    expect(scaffold.rootPath).toBe("Research/AI");
    expect(scaffold.files.some((file) => file.path.endsWith(".base"))).toBe(false);
  });

  it("validates scaffold paths stay inside the vault", async () => {
    const vaultPath = await mkdtemp(path.join(tmpdir(), "obsidian-vault-"));
    try {
      await ensureVaultDirs(vaultPath, ["Knowledge Bases/test/raw"]);
      await writeVaultFile(vaultPath, "Knowledge Bases/test/schema.md", "# Schema\n");

      await expect(readFile(path.join(vaultPath, "Knowledge Bases/test/schema.md"), "utf8"))
        .resolves.toBe("# Schema\n");
      expect(() => resolveInsideVault(vaultPath, "../outside.md")).toThrow(
        /escapes/
      );
    } finally {
      await rm(vaultPath, { recursive: true, force: true });
    }
  });
});

describe("Vault helpers", () => {
  it("parses known vault output from the Obsidian CLI", () => {
    expect(parseVaultsOutput("bradesco_kb\t/Users/me/bradesco_kb\nWork\t/Users/me/Work"))
      .toEqual([
        { name: "bradesco_kb", path: "/Users/me/bradesco_kb" },
        { name: "Work", path: "/Users/me/Work" }
      ]);
  });

  it("resolves vault info from a named known vault", async () => {
    const result = await resolveVaultInfo({
      vault: "Lab",
      runner: async () => ({
        ok: true,
        command: "obsidian",
        args: ["vaults", "verbose"],
        stdout: "Lab\t/Users/me/Lab",
        stderr: "",
        exitCode: 0
      })
    });

    expect(result).toEqual({
      name: "Lab",
      path: "/Users/me/Lab",
      available: true
    });
  });
});

describe("MCP tool contracts", () => {
  it("returns health even if the CLI is missing or unavailable", async () => {
    const health = await executeObsidianTool("obsidian.health", {});
    expect(health).toMatchObject({
      cliAvailable: expect.any(Boolean),
      knownVaults: expect.anything(),
      requiresVaultDecision: expect.any(Boolean),
      guidance: expect.arrayContaining([
        "Open Obsidian before using operational tools."
      ])
    });
  });

  it("returns a vault decision with known vaults when no target is selected", async () => {
    const result = await executeObsidianTool("obsidian.search", {
      query: "llm",
      useRecentVault: false
    });

    expect(result).toMatchObject({
      code: "OBSIDIAN_VAULT_DECISION_REQUIRED"
    });
  });
});
