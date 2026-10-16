---
name: start-session
description: Load the minimal base context for a new session. Argument is frontend, backend or full. Use at the start of a session before any task.
argument-hint: frontend | backend | full
disable-model-invocation: true
---

# Start session

Scope = `$ARGUMENTS` (`frontend`, `backend` or `full`; if empty or unknown, ask which one and stop).

CLAUDE.md and the memory index are already loaded: do not re-read them. Load only the map below, cheaply (Glob/Grep, headings and first lines, never whole files).

1. **Repo state** (one Bash call): `git branch --show-current`, `git status --short`, `git log --oneline -5`.
2. **Modules**: list module folders for the scope (Glob only).
3. **Docs index**: list `frontend/docs/*.md` and/or `backend/docs/*.md` for the scope; read only the first heading and purpose line of each.
4. **Entry points** (read only if they exist; skip silently otherwise):
   - frontend: `frontend/src/core` `DataService` interface, `frontend/src/config` provider factory, `ServicesProvider`, app routes.
   - backend: `backend/apps-script/.clasp.json` (`filePushOrder`), `src/composition/Composition.gs`, `backend/supabase` migration file names.
   - full: both lists above, plus the API contract between frontend and backend.
5. **Report in at most 12 lines**: branch and dirty files, modules found, docs found, entry points read, and any mismatch (e.g. module without doc). Then ask what to work on.

Rules:
- Do not open module internals or implementation files; they are read later, per task, with Grep and offset/limit.
- Stay inside the chosen scope (`frontend` never reads `backend/` and vice versa).
- Do not edit, run tests or commit.
