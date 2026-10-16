---
name: write-docs
description: Write or update English documentation and Mermaid diagrams under docs/. Use when the user asks for docs, architecture notes, or diagrams.
---

# Write docs

1. Read the relevant source first; document only real behavior.
2. Delegate to the `docs-writer` agent or write directly in `frontend/docs/<module>.md` or `backend/docs/<module>.md` (one file per module, never mixed).
3. English only, concise, with relative links to the referenced code. Use Mermaid for diagrams only when helpful:
   - architecture: `flowchart`
   - request flow: `sequenceDiagram`
   - data model: `erDiagram`
4. Structure: purpose, how it works, configuration, limitations.
5. Do not commit.
