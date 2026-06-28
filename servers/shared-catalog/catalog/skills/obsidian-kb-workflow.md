---
id: obsidian-kb-workflow
name: Obsidian KB Workflow
description: Workflow for creating Karpathy-style LLM knowledge bases in Obsidian.
tags: [obsidian, knowledge-base, karpathy]
version: 0.1.0
kind: skill
contentPath: catalog/skills/obsidian-kb-workflow.md
---

# Obsidian KB Workflow

Use the `obsidian-integration` MCP server to create and maintain an LLM knowledge base in Obsidian.

1. Install the server with the public installer.
2. Configure an MCP client with `obsidian-integration-mcp`.
3. Run `obsidian.health` first.
4. If no vault target is configured, use `obsidian.vaults` or `obsidian.vault_info`, then ask the user whether to use a known vault, the recent vault, or a newly opened vault.
5. Run `obsidian.kb_create` with an explicit `vault` when possible to scaffold:
   - `raw/`
   - `wiki/`
   - `outputs/`
   - `assets/`
   - `schema.md`
   - `wiki/index.md`
   - `wiki/log.md`
   - optional `KB Dashboard.base`
6. Treat raw sources as immutable.
7. Let the LLM maintain wiki pages, backlinks, index, and log.
8. File durable query outputs back into the wiki when useful.
9. Periodically lint for contradictions, stale claims, orphan pages, and missing concepts.
