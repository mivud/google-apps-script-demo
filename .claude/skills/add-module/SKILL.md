---
name: add-module
description: Add a new feature module (model, repository, service, adapters, backend actions/migration, UI, i18n, docs) isolated from the existing modules. Use when the user asks for a new domain area such as suppliers, locations or users.
disable-model-invocation: true
---

# Add a feature module

Read CLAUDE.md ("Feature modules") first. A module must be addable without editing other modules' internals.

1. **Ask and plan.** Clarify fields, relations to other modules, delete rules, filters, and who may edit. Use the `plan-feature` skill; wait for approval before coding.
2. **Plan the slice** in the plan, one section per clean-architecture layer (see CLAUDE.md "Clean architecture inside each module"): domain (entity + audit fields + pure rules), application (use cases, repository port, uses `Clock`/`IdGenerator` ports), interface/ui (handlers, mappers, pages and components, i18n keys en + vi), infrastructure (Sheets and Supabase implementations, migration `NNN_<module>.sql`), backend action names `<module>.<action>`, docs. Follow the Clean Code Rules. The module is the main unit: keep one file (or small folder) per layer per module and do not fragment it into per-feature or per-use-case files, folders or namespaces.
3. **Delegate in parallel** (keep the main context small), with disjoint file scopes:
   - `apps-script-dev`: `src/modules/<module>/{domain,application,interface,infrastructure}` plus `<Name>Module.gs`, registration in `src/composition/Composition.gs` and `filePushOrder` in `.clasp.json`, sheet tab and upgrade path, `backend/docs/<module>.md`, SQL migration and RLS entry.
   - `frontend-dev`: model, repository interface, service, adapters, mappers, contract tests, UI, i18n, `frontend/docs/<module>.md`. If the slice is large, run `data-adapter-dev` for model/adapters/services first and `frontend-dev` for UI after.
4. **Wire up** only in the shared composition points: `DataService` composition, provider factory, `ServicesProvider`, app routes/header links.
5. **Rules to enforce:**
   - Audit fields on every model (`created_at`, `modified_at` UTC `+00:00`, `created_by`, `last_modified_by`), server-filled.
   - Same behavior on Sheets and Supabase (ordering, pagination, error codes); stable error `code`s translated through i18n.
   - UI uses `useAsyncData` / `useAsyncAction` / `LoadingButton`; mobile-first, tap targets >= 44px.
   - No imports from another module's internals; no circular dependencies.
6. **Verify:** `npx tsc -b`, `node --check` on every `.gs` (temp copies) and a stubbed concatenated load in `filePushOrder` order to catch load-order errors. Do not run tests until the user asks. Then run `review-solid`, stop for the user's review, and commit only when asked.
