# Obsidian Integration MCP Server

Operational MCP server for integrating AI coding agents with Obsidian vaults.

This server can read and modify an Obsidian vault through the `obsidian` CLI. It is intentionally separate from `shared-catalog`, which remains read-only.

## Requirements

- Node.js 20+
- npm
- Obsidian open locally
- `obsidian help` must work in a terminal

If the CLI is unavailable, operational tools return `OBSIDIAN_CLI_NOT_FOUND` with setup guidance. The `obsidian.health` tool works even when the CLI is missing.

## Installation

Install or update from the public installer:

```bash
curl -fsSL https://raw.githubusercontent.com/DioniSilva/mcp_servers/main/scripts/install-latest-obsidian-integration.sh | bash
```

Configure an MCP client with:

```json
{
  "mcpServers": {
    "obsidian-integration": {
      "command": "obsidian-integration-mcp",
      "args": [],
      "env": {
        "OBSIDIAN_VAULT": "Your Vault Name"
      }
    }
  }
}
```

`OBSIDIAN_VAULT` is optional but operational tools will not silently use the most recently focused vault. If `OBSIDIAN_VAULT` is not set, tools return `OBSIDIAN_VAULT_DECISION_REQUIRED`, including known vaults when available. The agent must explicitly ask whether the user wants to use the most recently focused vault or create/select a vault first.

After explicit user confirmation, the agent can retry the same operation with:

```json
{
  "useRecentVault": true
}
```

If the user wants a new vault, create or open it in Obsidian first, then configure `OBSIDIAN_VAULT` in the MCP client environment or pass `vault` to the specific tool call.

## Tools

- `obsidian.health`: checks CLI availability and setup guidance.
- `obsidian.vaults`: lists known Obsidian vaults.
- `obsidian.vault_info`: resolves a vault name or the recent vault to a local path.
- `obsidian.search`: searches notes via Obsidian CLI.
- `obsidian.read`: reads a note by path or file.
- `obsidian.create`: creates notes with validated input.
- `obsidian.append`: appends content to notes.
- `obsidian.cli_run`: full CLI passthrough using argv arrays, never shell execution.
- `obsidian.kb_create`: creates a Karpathy-style LLM KB scaffold.
- `obsidian.kb_status`: reads KB index, log, and schema files.

## Guardrails

`obsidian.cli_run` treats command names such as `delete`, `remove`, `trash`, `wipe`, and `reset` as destructive. The first call returns `OBSIDIAN_COMMAND_CONFIRMATION_REQUIRED` with a `confirmationId` instead of executing. After explicit user approval, retry exactly the same argv array with `confirmDestructive: true` and that `confirmationId`.

The denylist is a safety rail, not a complete security boundary.

## LLM Knowledge Base Scaffold

`obsidian.kb_create` creates:

```text
raw/
wiki/
outputs/
assets/
schema.md
wiki/index.md
wiki/log.md
KB Dashboard.base
```

The scaffold follows the Karpathy pattern: raw sources are immutable, generated wiki pages are maintained by the LLM, and index/log/schema files guide future ingest, query, and lint workflows.

`obsidian.kb_create` resolves the target vault path and writes the scaffold through validated filesystem paths. This avoids Obsidian CLI note-name interpretation for directories and `.base` files, and blocks any scaffold path that would escape the vault directory.

## Development

```bash
npm install
npm run typecheck -w servers/obsidian-integration
npm test -w servers/obsidian-integration
npm run build -w servers/obsidian-integration
```

## Release

Releases are automated by GitHub Actions on pushes to `main`.

Release tags use:

```text
obsidian-integration-vX.Y.Z
```
