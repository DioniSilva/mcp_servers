# Karpathy LLM Knowledge Base Pattern

This resource distills the Obsidian note `Patterns/LLM Knowledge Base By Andrey Karpathy.md` used as the reference for this server.

The pattern has three layers:

- Raw sources: immutable source material such as articles, papers, repos, datasets, and images.
- Wiki: LLM-generated markdown pages that summarize, synthesize, cross-link, and update the knowledge base.
- Schema: operating instructions that tell the LLM how to ingest, query, lint, and maintain the wiki.

Core operations:

- Ingest one or more raw sources and compile them into wiki pages.
- Query the wiki, synthesize answers with citations, and optionally file useful outputs back into the wiki.
- Lint the wiki for contradictions, stale claims, orphan pages, missing concepts, and weak cross-links.

The generated KB scaffold follows this structure:

```text
raw/
wiki/
outputs/
assets/
schema.md
wiki/index.md
wiki/log.md
KB Dashboard.base
```

The LLM owns generated wiki maintenance; the user curates sources and directs exploration.
