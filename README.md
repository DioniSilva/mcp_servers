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
npm install -g https://github.com/DioniSilva/mcp_servers/releases/download/shared-catalog-v0.1.0/shared-catalog-mcp-server-0.1.0.tgz
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

## Servers

- [Shared Catalog MCP Server](./servers/shared-catalog/README.md): read-only MCP catalog for sharing skills, tool definitions, prompts, and resources.
