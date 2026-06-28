export interface KbScaffoldInput {
  name: string;
  rootPath?: string;
  description?: string;
  includeBases?: boolean;
}

export interface KbFile {
  path: string;
  content: string;
}

export interface KbScaffold {
  rootPath: string;
  files: KbFile[];
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createKbScaffold(input: KbScaffoldInput): KbScaffold {
  const slug = slugify(input.name);
  if (!slug) {
    throw new Error("KB name must contain at least one letter or number.");
  }

  const rootPath = trimSlashes(input.rootPath ?? `Knowledge Bases/${slug}`);
  const description =
    input.description ?? "LLM-maintained knowledge base following the Karpathy pattern.";
  const includeBases = input.includeBases ?? true;

  const files: KbFile[] = [
    {
      path: `${rootPath}/raw/README.md`,
      content: `# Raw Sources\n\nImmutable source material for ${input.name}. The LLM may read files in this folder, but should not rewrite source documents.\n`
    },
    {
      path: `${rootPath}/assets/README.md`,
      content: `# Assets\n\nLocal images, PDFs, and other attachments referenced by raw sources or generated wiki pages.\n`
    },
    {
      path: `${rootPath}/outputs/README.md`,
      content: `# Outputs\n\nQuery answers, analysis pages, charts, slide decks, and other generated outputs that may be filed back into the wiki.\n`
    },
    {
      path: `${rootPath}/schema.md`,
      content: schemaContent(input.name, description)
    },
    {
      path: `${rootPath}/wiki/index.md`,
      content: indexContent(input.name, description)
    },
    {
      path: `${rootPath}/wiki/log.md`,
      content: logContent(input.name)
    }
  ];

  if (includeBases) {
    files.push({
      path: `${rootPath}/KB Dashboard.base`,
      content: dashboardBaseContent(rootPath)
    });
  }

  return { rootPath, files };
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function schemaContent(name: string, description: string): string {
  return `# ${name} Schema\n\n${description}\n\n## Operating Model\n\n- Raw sources are immutable and live under \`raw/\`.\n- The LLM owns generated wiki pages under \`wiki/\`.\n- Every ingest should update summaries, backlinks, \`wiki/index.md\`, and \`wiki/log.md\`.\n- Useful query outputs can be filed back into the wiki when they improve future work.\n- Periodic linting should find contradictions, stale claims, orphan pages, missing concept pages, and weak cross-links.\n\n## Ingest Workflow\n\n1. Read the new source from \`raw/\`.\n2. Create or update the relevant summary, entity, and concept pages.\n3. Add backlinks between related wiki pages.\n4. Update \`wiki/index.md\` with a one-line summary.\n5. Append an entry to \`wiki/log.md\`.\n\n## Query Workflow\n\n1. Read \`wiki/index.md\` first.\n2. Open the most relevant wiki pages and sources.\n3. Answer with citations to wiki pages or raw sources.\n4. Offer to file durable outputs back into \`outputs/\` or \`wiki/\`.\n`;
}

function indexContent(name: string, description: string): string {
  return `# ${name} Index\n\n${description}\n\n## Overview\n\nThis index is content-oriented. Keep it current whenever sources are ingested or wiki pages are changed.\n\n## Wiki Pages\n\n- [[log|Log]] - Chronological maintenance log.\n`;
}

function logContent(name: string): string {
  return `# ${name} Log\n\nThis log is append-only. Use entries like:\n\n## [YYYY-MM-DD] ingest | Source Title\n\n- Source: \`raw/source.md\`\n- Updated pages:\n- Notes:\n`;
}

function dashboardBaseContent(rootPath: string): string {
  return `filters:\n  and:\n    - 'file.ext == \"md\"'\n    - file.inFolder(\"${rootPath}/wiki\")\n\nviews:\n  - type: table\n    name: \"Wiki Pages\"\n    order:\n      - file.name\n      - file.mtime\n      - tags\n`;
}
