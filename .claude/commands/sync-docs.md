---
name: sync-docs
description: Sync module docs with what was done in this session, using the session summary plus uncommitted changes. Use at the end of a session or after a coding task.
disable-model-invocation: true
---

# Sync docs

Updates only `frontend/docs/<module>.md` and `backend/docs/<module>.md`. Never touches CLAUDE.md, memory or code.

1. **Summarize the session** from the conversation in at most 10 bullets: what changed, per module, and any new behavior, rule or limit.
2. **Verify against git**: `git status --short` and `git diff --stat` (then `git diff` per file only where needed). Drop summary items the diff does not support; add changed modules the summary missed.
3. **Map to docs**: group changes by side (frontend/backend) and module. If a module has no doc, note it as "new doc needed".
4. **Delegate** to the `docs-writer` agent, one call per side, in parallel when both sides changed. Give it only: the module list, the bullets for that side, and the changed file paths. It must read the source before writing and keep each doc short (purpose, behavior, key rules, limits; Mermaid only if it clarifies).
5. **Report in at most 8 lines**: docs updated or created (paths), and anything skipped because it could not be verified in code.

Rules:
- Docs are English only; no code pasted, relative links to code.
- Do not commit; docs changes go with the code change they describe.
- If there are no uncommitted changes and the session did no work, say so and stop.
