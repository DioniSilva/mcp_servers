# MCP Servers

Workspace for reusable local MCP servers.

## Structure

```text
mcp_servers/
  package.json
  package-lock.json
  servers/
    shared-catalog/
      package.json
      src/
      tests/
      catalog/
    obsidian-integration/
      package.json
      src/
      tests/
      resources/
```

Each subdirectory in `servers/` is an independently publishable MCP server.

## Development

Install dependencies from the root:

```bash
npm install
```

Run validations for all workspaces:

```bash
npm run typecheck
npm test
npm run build
```

Run commands for a specific server:

```bash
npm run dev -w servers/shared-catalog
npm run release:check -w servers/shared-catalog
npm run release:pack -w servers/shared-catalog
npm run dev -w servers/obsidian-integration
```

## Releases

Releases are automated from the `main` branch with GitHub Actions. When changes to a server are merged or pushed to `main`, the matching release workflow validates the workspace, creates the npm tarball, and publishes a GitHub Release if one does not already exist for that server version.

The `shared-catalog` server uses tags in this format:

```text
shared-catalog-vX.Y.Z
```

Manual local validation is still available:

```bash
npm run release:check -w servers/shared-catalog
npm run release:pack -w servers/shared-catalog
```

Generated `.tgz` files are local release artifacts and should not be committed.

## Server Roles

- `shared-catalog` is read-only discovery for skills, tool definitions, prompts, and resources.
- `obsidian-integration` is operational and can read or modify an Obsidian vault through the `obsidian` CLI.

Before using `obsidian-integration`, confirm:

```bash
obsidian help
```

Obsidian must be open. Optionally set `OBSIDIAN_VAULT` in the MCP client environment to target a specific vault. If `OBSIDIAN_VAULT` is missing, operational tools return `OBSIDIAN_VAULT_DECISION_REQUIRED`, including known vaults when available; the agent must explicitly ask whether to use the most recently focused vault or create/select a vault before retrying.

Use `obsidian.vaults` and `obsidian.vault_info` to inspect available vaults before running operations. Destructive passthrough commands return `OBSIDIAN_COMMAND_CONFIRMATION_REQUIRED` and require explicit user approval plus the matching `confirmationId` before execution. `obsidian.kb_create` writes scaffolds through validated vault filesystem paths so directories and `.base` files are created exactly.

## Installing a Server from a GitHub Release

Each server should provide an installer script that resolves the latest release for that server-specific tag prefix. This avoids relying on GitHub `releases/latest`, which is repository-wide and can point to another server in this monorepo.

Install or update the latest `shared-catalog` release:

```bash
scripts/install-latest-shared-catalog.sh
```

Install or update without cloning this repository:

```bash
curl -fsSL https://raw.githubusercontent.com/DioniSilva/mcp_servers/main/scripts/install-latest-shared-catalog.sh | bash
```

You can also install a specific released asset directly:

```bash
npm install -g https://github.com/DioniSilva/mcp_servers/releases/download/shared-catalog-v0.6.0/shared-catalog-mcp-server-0.6.0.tgz
```

Then use the installed binary in an MCP client configuration:

```json
{
  "mcpServers": {
    "shared-catalog": {
      "command": "shared-catalog-mcp",
      "args": []
    }
  }
}
```

The `shared-catalog` MCP server also exposes `catalog.update_info`, a read-only tool that returns the current server version, tag pattern, public installer URL, and recommended install/update commands.

Install or update the Obsidian integration server:

```bash
curl -fsSL https://raw.githubusercontent.com/DioniSilva/mcp_servers/main/scripts/install-latest-obsidian-integration.sh | bash
```

Then configure:

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

## Servers

- [Shared Catalog MCP Server](./servers/shared-catalog/README.md): read-only MCP catalog for sharing skills, tool definitions, prompts, and resources.
- [Obsidian Integration MCP Server](./servers/obsidian-integration/README.md): operational MCP server for Obsidian vaults and Karpathy-style knowledge bases.
