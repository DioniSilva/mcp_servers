# Obsidian Bases Skill

Create `.base` files as YAML documents with filters, formulas, properties, summaries, and views.

Minimal example:

```yaml
filters:
  and:
    - 'file.ext == "md"'
    - file.inFolder("Knowledge Bases")

views:
  - type: table
    name: "Notes"
    order:
      - file.name
      - file.mtime
      - tags
```

Quote formulas that contain double quotes with single quotes. When subtracting dates, access a duration field such as `.days` before applying numeric functions.
