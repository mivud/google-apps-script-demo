# Project: google-apps-script-demo

Responsive web app (desktop/mobile) with a database-agnostic frontend.
Data can live in **Google Sheets (via Apps Script Web App)** or **Supabase**; switching must only require a config change.

## Working Rules (mandatory)

1. **Ask when ambiguous.** If a task, requirement, or scope is unclear, ask before acting.
2. **Plan before code.** Assess every task first. If it involves non-trivial logic (multiple files, new module, data flow, schema), write a plan and **wait for the user's approval** before writing code. Use the `plan-feature` skill.
3. **Review before tests.** After coding, stop and let the user review. **Do not run tests** until the user explicitly asks (use the `run-tests` skill then).
4. **Commits only on request.** Never commit or push unless the user asks. **Never add Co-Authored-By lines** or any Claude attribution to commits or PRs.
   - When committing, follow the GitHub commit convention (Conventional Commits): `<type>(<optional scope>): <imperative summary>`, e.g. `feat(adapters): add Supabase adapter`.
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Summary in English, lowercase, no trailing period, max ~72 chars; add a body for the "why" when needed; use `!` or a `BREAKING CHANGE:` footer for breaking changes.
   - One logical change per commit.
5. **SOLID always.** See the SOLID checklist below.
6. **Responsive always.** Every frontend screen must work well on both desktop and mobile: mobile-first CSS, fluid layouts, touch-friendly targets (>= 44px), no horizontal scroll, and verified at common breakpoints (~360px, ~768px, ~1280px).
7. **Visible feedback on every async operation.** Any UI action that calls an API must disable its control while pending and show a loading effect (spinner/skeleton), then restore on success or error. This also covers data loading (lists, detail pages, initial fetch, refresh): always show a loading state (skeleton/spinner) and an error state with retry. Use the shared `LoadingButton` / `useAsyncAction` / `useAsyncData` pattern, never ad-hoc handling.
8. **Delegate complex work.** Give complex or multi-area parts to the agents in `.claude/agents/`, run independent ones in parallel, and keep only short summaries in the main thread to save context and tokens. Do trivial edits directly.
9. **English only for artifacts.** Code comments, docs, and diagrams (Mermaid) are written in English. All identifiers must be English too: variables, functions, classes, files, folders, DB tables/columns, and branch names (no Vietnamese or unaccented-Vietnamese names). Chat with the user may be in Vietnamese.

## Architecture

```
Frontend (static, Cloudflare Pages / GitHub Pages)
   -> DataService interface (the only thing UI code may call)
        -> SheetsAdapter    -> Apps Script Web App -> Google Sheet
        -> SupabaseAdapter  -> Supabase (Postgres/REST)
```

- UI components never call `fetch` or the Supabase client directly.
- Provider is selected by env var `VITE_DB_PROVIDER=sheets|supabase` through a factory.
- Use UUID ids and flat schemas; column names in Sheets match Postgres columns.
- Apps Script is used only as an API layer (JSON via `doGet`/`doPost`), not as the UI host.

Planned layout (create only when approved in a plan):

```
frontend/
  src/
    core/        # domain types, DataService interface (no dependencies)
    adapters/    # sheets/, supabase/ implementations (client side)
    services/    # use-case logic depending on DataService
    ui/          # components, pages
    config/      # provider factory, env parsing
  docs/          # frontend docs, one file per module
backend/
  apps-script/   # .clasp.json + src/ (Main.gs, composition/, shared/, modules/<module>/{domain,application,interface,infrastructure}); pushed with clasp
  supabase/      # SQL migrations, RLS policies
  docs/          # backend docs, one file per module
```

Frontend and backend are fully separated: code, docs, and dependencies never mix. They communicate only through the documented API contract.

### Feature modules

Code is organized by **feature module** (today: `equipment`, `maintenance`, `category`) so new modules can be added later without touching existing ones. Each module owns its slice end to end:

- **Frontend:** model types, repository interface, service, adapter parts (sheets + supabase), UI pages/components, i18n messages, and a short doc `frontend/docs/<module>.md`. Expose a small public API (`index.ts`); other modules import only that, never deep paths.
- **Backend:** Apps Script actions namespaced `<module>.<action>` (e.g. `category.list`), one SQL migration per module (`NNN_<module>.sql`), and `backend/docs/<module>.md`.
- **Dependencies:** a module may depend on `core/` shared pieces (errors, `Page`, async hooks, `Modal`) and, when truly needed, on another module's public API or service interface. No circular module dependencies; cross-module rules go in the depending module's service, not in the other module's internals.
- **Shared composition only:** `DataService` is composed from per-module repository interfaces; the factory and `ServicesProvider` are the only places that know all modules.
- New module = follow the `add-module` skill. Do not grow a module by dumping unrelated logic into it.
- Migration status: Apps Script is being split into `src/modules/<module>/{domain,application,interface,infrastructure}`; the frontend (still laid out by layer: `core/`, `adapters/`, `services/`, `ui/`) follows afterwards into `modules/<module>/{domain,application,infrastructure,ui}` with `app/` (composition) and `shared/`.

### Clean architecture inside each module

Dependencies point inward only: `interface` and `infrastructure` -> `application` -> `domain`.

- **domain:** entities and pure business rules (e.g. category tree, cycle check, name rules). No `SpreadsheetApp`, `fetch`, React or any framework.
- **application:** use cases (`CreateCategory`, `RemoveCategory`...) depending only on domain and **ports** (interfaces) such as `CategoryRepository`, `Clock`, `IdGenerator`. Time and ids always come through the `Clock` / `IdGenerator` ports so they are replaceable.
- **interface (backend) / ui (frontend):** handlers or pages that translate requests to use-case input and errors to codes; row <-> entity mappers.
- **infrastructure:** port implementations (Sheets, Supabase, locks, token guard, system clock, uuid).
- **Composition root** is the only place that wires implementations to ports. Modules reach each other only through public ports/`index.ts`, never through internals.
- Apps Script has one global scope and no imports: each module exposes one namespace object (e.g. `CategoryModule`), registration of handlers happens inside functions (never at file load), and file load order is fixed by `filePushOrder` in `.clasp.json`.

## Clean Code Rules

- Small functions that do one thing at one level of abstraction (about <= 20 lines, <= 3 parameters; group more into an object).
- Intention-revealing names; no cryptic abbreviations; no magic numbers or strings (named constants).
- Guard clauses instead of deep nesting; no boolean flag parameters; no dead code; no duplication.
- Errors are explicit (`ApiError` / typed errors with stable codes), not ambiguous `null`/`undefined` when failure is meaningful.
- Comments explain *why*, briefly, in English.

## SOLID Checklist

- **S**: one reason to change per module/class; split UI, use-case, and data access.
- **O**: add a new provider by adding an adapter, not by editing existing ones.
- **L**: every adapter must be substitutable behind `DataService` with identical semantics (errors, ordering, pagination).
- **I**: keep interfaces small and focused; do not force consumers to depend on methods they do not use.
- **D**: depend on abstractions (`DataService`), inject implementations through the factory.

## Conventions

- Comments explain *why*, not *what*; keep them sparse and in English.
- Docs are split per side and per module: `frontend/docs/<module>.md` and `backend/docs/<module>.md` (e.g. `equipment.md`, `auth.md`); no single monolithic doc.
- Each module doc is short and in English: purpose, public API/behavior, key rules, limits. Add a Mermaid diagram only when it clarifies.
- Link to the code with relative paths when it helps (e.g. `[EquipmentService](../src/services/equipment-service.ts)`); do not copy code into docs.
- Update the module doc in the same change that alters the module.
- Secrets (Supabase keys, Apps Script URLs) go in env files, never committed.

## Claude Config in This Repo

- Agents: `.claude/agents/` (architect, frontend-dev, data-adapter-dev, apps-script-dev, solid-reviewer, docs-writer)
- Skills: `.claude/skills/` (plan-feature, add-data-adapter, review-solid, write-docs, run-tests)
- Settings: `.claude/settings.json` (commit/push/test commands require confirmation, attribution disabled)
