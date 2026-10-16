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
   - **Always re-read these commit rules right before every commit.** Commits of Claude files on `core/agents` use no `(claude)` scope.
   - **Claude config goes through `core/agents` first.** Commit changes to the basic Claude files (`CLAUDE.md`, `.claude/`) on branch `core/agents`, then merge `core/agents` into the working branches (`dev`, feature branches such as `devices-mgt`). Never commit Claude files directly on a feature branch. Branch names must not collide with an existing branch used as a prefix (e.g. `dev/x` is impossible while `dev` exists).
5. **SOLID always.** See the SOLID checklist below.
6. **Responsive always.** Every frontend screen must work well on both desktop and mobile: mobile-first CSS, fluid layouts, touch-friendly targets (>= 44px), no horizontal scroll, and verified at common breakpoints (~360px, ~768px, ~1280px).
7. **Visible feedback on every async operation.** Any UI action that calls an API must disable its control while pending and show a loading effect (spinner/skeleton), then restore on success or error. This also covers data loading (lists, detail pages, initial fetch, refresh): always show a loading state (skeleton/spinner) and an error state with retry. Use the shared `LoadingButton` / `useAsyncAction` / `useAsyncData` pattern, never ad-hoc handling.
8. **Delegate complex work.** Give complex or multi-area parts to the agents in `.claude/agents/`, run independent ones in parallel, and keep only short summaries in the main thread to save context and tokens. Agents read only their scope and report in <= 10 lines; before a big task check context size and ask the user before any compact (see `plan-feature` step 0). Do trivial edits directly.
9. **English only for artifacts.** Code comments, docs, and diagrams (Mermaid) are written in English. All identifiers must be English too: variables, functions, classes, files, folders, DB tables/columns, and branch names (no Vietnamese or unaccented-Vietnamese names). Chat with the user may be in Vietnamese.
10. **Security first (highest priority).** Check security while coding, not only afterwards: validate all input at the boundary, never trust the client, no secrets in code, logs, URLs or `VITE_*` env vars (they are public in the bundle), generic error messages, least privilege (OAuth scopes, RLS, tokens). Dev agents follow this checklist; after coding run `review-security-backend` / `review-security-frontend` (agents `security-reviewer-backend` / `security-reviewer-frontend`) together with `review-solid`, fix critical and high findings before handing over for review. Security findings outrank style and speed.

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
  apps-script/   # .clasp.json + src/ (Main.gs, composition/, shared/, modules/device-management/...); pushed with clasp
  supabase/      # SQL migrations, RLS policies
  docs/          # backend docs, one file per module
```

Frontend and backend are fully separated: code, docs, and dependencies never mix. They communicate only through the documented API contract.

### Modules (the primary unit)

**The module is the main unit of organization** (today: the backend module `device-management` groups the entities `equipment`, `maintenance_log` and `category`). Always decide the module first (a bounded context that owns several related entities), then apply the clean architecture layers *inside* it. Do not create sub-modules. New modules can be added without touching existing ones. Each module owns its slice end to end:

- **Frontend:** model types, repository interface, service, adapter parts (sheets + supabase), UI pages/components, i18n messages, and a short doc `frontend/docs/<module>.md`. Expose a small public API (`index.ts`); other modules import only that, never deep paths.
- **Backend:** Apps Script actions namespaced `<module>.<entity>.<action>` (e.g. `device-management.category.list`), one SQL migration per module (`NNN_<module>.sql`), and `backend/docs/<module>.md`.
- **Dependencies:** a module may depend on `core/` shared pieces (errors, `Page`, async hooks, `Modal`) and, when truly needed, on another module's public API or service interface. No circular module dependencies; cross-module rules go in the depending module's service, not in the other module's internals.
- **Shared composition only:** `DataService` is composed from per-module repository interfaces; the factory and `ServicesProvider` are the only places that know all modules.
- New module = follow the `add-module` skill. Do not grow a module by dumping unrelated logic into it.
- Migration status: Apps Script is organized as `src/modules/device-management/` (see below); the frontend (still laid out by layer: `core/`, `adapters/`, `services/`, `ui/`) follows afterwards into `modules/<module>/{domain,application,infrastructure/persistence/{googlesheet,supabase},ui}` with `app/` (composition) and `shared/`.

### Clean architecture inside each module

Dependencies point inward only: `endpoints` (backend) / `ui` (frontend) and `persistence`/`infrastructure` -> `application` -> `domain`.

Backend (Apps Script) layout of a module:

```
src/modules/<module>/
  <Module>Module.gs        # namespace root + public surface for the composition root
  domain/entities/         # models: Equipment, Category, MaintenanceLog
  domain/values/           # value objects: EquipmentCriteria
  application/<feature>/commands/   # one file per write use case: CreateEquipment
  application/<feature>/queries/    # one file per read use case: ListEquipment
  application/<feature>/            # <Feature>SupportService (rules shared by the feature's use cases)
  endpoints/               # <Entity>Endpoints: request <-> use case input, errors -> codes
  persistence/googlesheet/ # <Entity>Service: repository/lookup implementations, migrations
```

- **domain:** entities and pure business rules (e.g. category tree, cycle check, name rules). No `SpreadsheetApp`, `fetch`, React or any framework.
- **application:** the feature is the entity area (`equipment`, `category`, `maintenance`); each use case is one file under `commands/` (changes state) or `queries/` (reads). Depends only on domain and **ports** (`Clock`, `IdGenerator`, repositories). Time and ids always come through ports so they are replaceable.
- **endpoints (backend) / ui (frontend):** endpoints or pages that translate requests to use-case input and errors to codes; row <-> entity mappers.
- **infrastructure:** non-database port implementations (locks, token guard, system clock, uuid).
- **persistence/<provider>:** all database access code of one provider in its own folder: `persistence/googlesheet` (Apps Script) and `persistence/supabase`. Shared pieces live in `shared/persistence/<provider>`, module-specific ones in `modules/<module>/persistence/<provider>`. A new provider means a new `persistence/<provider>` folder, never edits to another provider's folder.
- **Composition root** is the only place that wires implementations to ports. Modules reach each other only through public ports/`index.ts`, never through internals.
- Keep files short (about <= 100 lines; split by responsibility past ~300). Shared technical pieces (clock, id generator, sheet table, token guard...) live in `shared/`, one file per class so reviews stay easy.

Naming rules:
- **Models** (entities, value objects) have no suffix: `Equipment`, `EquipmentCriteria`.
- **Use cases** that bundle the command/query with its handling logic in one file are named after the use case, no suffix: `CreateEquipment`, `ListEquipment`.
- **Every other class has a role suffix**: `EquipmentEndpoints`, `EquipmentService` (persistence), `EquipmentSupportService`, `Router`... File name equals the class name.
- Apps Script has one global scope and no imports: each module exposes one root namespace `<Module>` (e.g. `DeviceManagement`) with layer sub-namespaces (`DeviceManagement.Domain.Equipment`, `DeviceManagement.Application.CreateEquipment`, `DeviceManagement.Persistence.GoogleSheet.EquipmentService`, `DeviceManagement.Endpoints.EquipmentEndpoints`). Registration of handlers happens inside functions (never at file load), and file load order is fixed by `filePushOrder` in `.clasp.json` (the module root file loads first).

## Domain-Driven Design Rules

Applied on top of the clean architecture layers; they guide how the `domain` and `application` layers are modeled.

- **Ubiquitous language:** use the business terms of the domain for every name (`Equipment`, `MaintenanceLog`, `Category`, `retire`, `repair`), the same word in code, API actions, UI labels and docs. No technical synonyms (`Item`, `Record`, `Manager`).
- **Bounded context = module:** a module owns one consistent model. A term may mean different things in two modules; do not share entities between modules, share only ids and public ports.
- **Entities:** identified by id (UUID), carry audit fields, and protect their own invariants through domain functions (validate, change status). Business rules live in `domain`, never in endpoints, use cases or persistence.
- **Value objects:** immutable, compared by value, validated on creation (`EquipmentCriteria`, status, quantity, maintenance type). Prefer a value object over a loose primitive that has rules.
- **Aggregates:** one aggregate root per consistency boundary; code outside refers to it by id and changes it only through the root. Equipment owns its maintenance logs (a log cannot exist without equipment; deleting equipment cascades). `Category` is its own aggregate; equipment references it by id only. One transaction/lock changes one aggregate.
- **Repositories:** one port per aggregate root, in `application` (interface) with the implementation in `persistence/<provider>`. They load and save whole aggregates and return domain entities, never storage rows or sheet ranges.
- **Domain services:** logic that spans several entities or does not fit one entity (e.g. category tree cycle check) is a pure function in `domain`, with no I/O.
- **Use cases orchestrate, not decide:** load the aggregate, call domain behavior, save, return. No business rule inline in a use case.
- **Domain errors:** domain rules fail with explicit typed errors and stable codes (`category_cycle`), translated to the API only in `endpoints`.
- **Anti-corruption at the edges:** payload and row mapping (snake_case, sheet columns, UTC strings) stays in `endpoints` and `persistence`; the domain only sees domain types.
- **Domain events:** not used yet. Add them only when another module must react to a change, and decide then with a plan.

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
- Docs are split per side and per module: `frontend/docs/<module>.md` and `backend/docs/<module>.md` (e.g. `device-management.md`, `auth.md`); no single monolithic doc.
- Each module doc is short and in English: purpose, public API/behavior, key rules, limits. Add a Mermaid diagram only when it clarifies.
- Link to the code with relative paths when it helps (e.g. `[EquipmentService](../src/services/equipment-service.ts)`); do not copy code into docs.
- Update the module doc in the same change that alters the module.
- Secrets (Supabase keys, Apps Script URLs) go in env files, never committed.

## Claude Config in This Repo

- Agents: `.claude/agents/` (architect, frontend-dev, data-adapter-dev, apps-script-dev, solid-reviewer, security-reviewer-backend, security-reviewer-frontend, docs-writer)
- Skills: `.claude/skills/` (plan-feature, add-module, add-data-adapter, review-solid, review-security-backend, review-security-frontend, write-docs, run-tests)
- Commands: `.claude/commands/` (`/start-session frontend|backend|full`, `/sync-docs`)
- Settings: `.claude/settings.json` (push/test commands require confirmation, attribution disabled)
- Guide: [docs/claude-workflow.md](docs/claude-workflow.md)
