# AGENTS.md

Minimal guidance for AI agents working in this repository.

## Structure

- The `mcp_servers` root is an npm workspaces monorepo, not an MCP server.
- Each publishable MCP server lives in `servers/<server-name>/`.
- The current server is `servers/shared-catalog`.
- Keep a single `package-lock.json` at the repository root.

## Commands

Run aggregate commands from the root when a change can affect more than one workspace:

```bash
npm run typecheck
npm test
npm run build
```

Run server-specific commands with `-w`:

```bash
npm run dev -w servers/shared-catalog
npm run release:check -w servers/shared-catalog
npm run release:pack -w servers/shared-catalog
```

## Conventions

- Keep the root lightweight: workspace files, general documentation, and shared configuration only.
- Do not place MCP server code directly at the root.
- Each server should have its own `package.json`, `README.md`, `src/`, `tests/`, and, when applicable, `catalog/`.
- Keep `stdio` as the default transport for local MCP servers unless explicitly decided otherwise.
- Catalog servers should remain read-only and must not execute local commands.

## Catalog

For `servers/shared-catalog`:

- Items live in `catalog/skills`, `catalog/tools`, `catalog/prompts`, and `catalog/resources`.
- Required metadata: `id`, `name`, `description`, `tags`, `version`, `kind`, `contentPath`.
- `contentPath` must point to the real path inside the package.
- Cataloged tools describe reusable capabilities; they must not execute actions.

## Release

- Distribution uses `npm pack` plus a GitHub Release per server.
- Run `npm run release:check -w servers/<name>` before packaging.
- Run `npm run release:pack -w servers/<name>` to generate the `.tgz`.
- Do not commit `.tgz`, `dist/`, `node_modules/`, or local cache files.

## Best Practices

- Prefer small changes localized to the affected server.
- Update the server README when commands, paths, or client configuration change.
- Update the root README when the monorepo structure or shared workflow changes.
- Before finishing, report which validations were run and any validation that could not be run.
