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

`OBSIDIAN_VAULT` is optional. When set, the server prepends `vault=<name>` to Obsidian CLI calls. When omitted, the CLI targets the most recently focused vault.

## Tools

- `obsidian.health`: checks CLI availability and setup guidance.
- `obsidian.search`: searches notes via Obsidian CLI.
- `obsidian.read`: reads a note by path or file.
- `obsidian.create`: creates notes with validated input.
- `obsidian.append`: appends content to notes.
- `obsidian.cli_run`: full CLI passthrough using argv arrays, never shell execution.
- `obsidian.kb_create`: creates a Karpathy-style LLM KB scaffold.
- `obsidian.kb_status`: reads KB index, log, and schema files.

## Guardrails

`obsidian.cli_run` blocks command names such as `delete`, `remove`, `trash`, `wipe`, and `reset`. This denylist is a safety rail, not a complete security boundary.

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
