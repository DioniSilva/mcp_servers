---
id: obsidian-integration-install
name: Obsidian Integration Install
description: Installation and setup instructions for the Obsidian Integration MCP Server.
tags: [obsidian, mcp, install]
version: 0.1.0
kind: resource
contentPath: catalog/resources/obsidian-integration-install.md
---

# Obsidian Integration MCP Server

Install or update:

```bash
curl -fsSL https://raw.githubusercontent.com/DioniSilva/mcp_servers/main/scripts/install-latest-obsidian-integration.sh | bash
```

MCP client command:

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

`OBSIDIAN_VAULT` is optional. When set, it targets a specific vault.

Operational tools do not use the most recent vault silently. If `OBSIDIAN_VAULT` is not set, the server returns `OBSIDIAN_VAULT_DECISION_REQUIRED`; the agent must ask whether to use the most recently focused vault or create/select a vault before retrying with `useRecentVault=true`.

Before using operational tools, run `obsidian.health`. If it reports `OBSIDIAN_CLI_NOT_FOUND`, install or enable the Obsidian CLI integration, confirm `obsidian help` works in a terminal, and open Obsidian.
