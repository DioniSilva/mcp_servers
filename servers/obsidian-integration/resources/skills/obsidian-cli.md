# Obsidian CLI Skill

Use the `obsidian` CLI to interact with a running Obsidian instance.

Core conventions:

- Parameters use `key=value` syntax.
- Quote values with spaces.
- `file=<name>` resolves like a wikilink.
- `path=<path>` targets an exact path from the vault root.
- `vault=<name>` can be passed first to target a specific vault.

Common commands:

```bash
obsidian read file="My Note"
obsidian create name="New Note" content="# Hello" silent
obsidian append file="My Note" content="New line"
obsidian search query="search term" limit=10
obsidian property:set name="status" value="done" file="My Note"
```

This MCP server calls the CLI via `spawn("obsidian", args)` and never through a shell.
