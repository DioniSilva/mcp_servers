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

The recommended flow is to package each server independently with `npm pack` and attach the `.tgz` to a GitHub Release.

Example for the `shared-catalog` server:

```bash
npm run release:check -w servers/shared-catalog
npm run release:pack -w servers/shared-catalog
```

The generated `.tgz` file is a local release artifact and should not be committed.

## Servers

- [Shared Catalog MCP Server](./servers/shared-catalog/README.md): read-only MCP catalog for sharing skills, tool definitions, prompts, and resources.
