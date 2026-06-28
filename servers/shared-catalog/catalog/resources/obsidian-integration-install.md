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

`OBSIDIAN_VAULT` is optional. If it is not set, the Obsidian CLI targets the most recently focused vault.

Before using operational tools, run `obsidian.health`. If it reports `OBSIDIAN_CLI_NOT_FOUND`, install or enable the Obsidian CLI integration, confirm `obsidian help` works in a terminal, and open Obsidian.
