# AGENTS.md

Minimal guidance for AI agents working in this repository.

## Structure

- The `mcp_servers` root is an npm workspaces monorepo, not an MCP server.
- Each publishable MCP server lives in `servers/<server-name>/`.
- Each server should have a matching installer or updater script in `scripts/install-latest-<server-name>.sh`.
- Current servers are `servers/shared-catalog` and `servers/obsidian-integration`.
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
- Operational servers such as `obsidian-integration` may modify local state and must document prerequisites, guardrails, and setup diagnostics.

## Catalog

For `servers/shared-catalog`:

- Items live in `catalog/skills`, `catalog/tools`, `catalog/prompts`, and `catalog/resources`.
- Required metadata: `id`, `name`, `description`, `tags`, `version`, `kind`, `contentPath`.
- `contentPath` must point to the real path inside the package.
- Cataloged tools describe reusable capabilities; they must not execute actions.

## Obsidian Integration

For `servers/obsidian-integration`:

- The server operates through the `obsidian` CLI and requires Obsidian to be open.
- `OBSIDIAN_VAULT` is optional and should map to `vault=<name>` CLI arguments.
- If `OBSIDIAN_VAULT` is missing, operational tools must return `OBSIDIAN_VAULT_DECISION_REQUIRED` and the agent must ask whether to use the most recently focused vault or create/select a vault before retrying.
- `obsidian.health` must remain available even when the CLI is missing.
- Full CLI passthrough must use argv arrays with `spawn`, never shell execution.
- Destructive command names must remain blocked by the minimal denylist.
- KB scaffolds follow the Karpathy pattern: immutable raw sources, LLM-owned wiki pages, index, log, schema, outputs, and assets.

## Release

- Releases are automated by GitHub Actions on pushes to `main`.
- Use server-prefixed tags, for example `shared-catalog-v0.1.0`.
- Installer scripts must resolve the newest release for their own server tag prefix instead of relying on GitHub `releases/latest`, because this is a monorepo.
- MCP update-info tools must be read-only and may return installer URLs or commands, but must not execute installation or update actions.
- Run `npm run release:check -w servers/<name>` before changing release workflows.
- Use `npm run release:pack -w servers/<name>` only for local packaging checks.
- Do not commit `.tgz`, `dist/`, `node_modules/`, or local cache files.

## Best Practices

- Prefer small changes localized to the affected server.
- Update the server README when commands, paths, or client configuration change.
- Update the root README when the monorepo structure or shared workflow changes.
- Before finishing, report which validations were run and any validation that could not be run.
