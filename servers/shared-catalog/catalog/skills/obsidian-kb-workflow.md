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
4. Run `obsidian.kb_create` to scaffold:
   - `raw/`
   - `wiki/`
   - `outputs/`
   - `assets/`
   - `schema.md`
   - `wiki/index.md`
   - `wiki/log.md`
   - optional `KB Dashboard.base`
5. Treat raw sources as immutable.
6. Let the LLM maintain wiki pages, backlinks, index, and log.
7. File durable query outputs back into the wiki when useful.
8. Periodically lint for contradictions, stale claims, orphan pages, and missing concepts.
