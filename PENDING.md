# Pending work

Snapshot of what is unfinished. Branch: `feature/devices-management`. Done items are removed; see `git log` for history.

## Needs you (cannot be done by Claude)

- [ ] **Review all code** before merging (backend commits and the frontend commits).
- [ ] **Push branches** `core/agents` (2 local commits ahead), `dev`, `feature/devices-management`. `git push` from this machine fails with "Repository not found" (no GitHub credentials).
- [ ] **Terminal 3 / Gemini (Antigravity):** decide what to delegate; briefs are not written yet.
- [ ] **Run the frontend contract tests** (`npm run test:contract`) only against a dedicated test sheet: they create and delete real rows.

## Backend handoff (frontend cannot do these)

- [ ] Reject a third category level in the backend (`category_depth_exceeded`); today only the frontend enforces the 2-level rule.
- [ ] Maintenance API asymmetry: `maintenance.listByEquipment` should read `equipment_id` (keep `equipmentId` as a temporary alias) and return NOT_FOUND for an unknown equipment id. Afterwards drop the camelCase key in `SheetsAdapter.listByEquipment`.
- [ ] Investigate slow Web App responses seen earlier (POST up to about 60 s): check the deployed version with `clasp deployments` and time `doPost`.

## Verification still to do

- [ ] Real calls with the token on the deployed Apps Script (sheet tabs auto-creation, `SpreadsheetApp`, `LockService`, legacy migration). The Node test suite (`npm test` in `backend/apps-script`) covers domain, use cases and endpoint routing only.
- [ ] Backend test gaps: `RequestParser`, `ResponseWriter`, token and lock guards, `SpreadsheetTable`, `SheetInstaller` / `SheetUpgrade`, legacy equipment migration.
- [ ] Old versus new behavior on real sheet data (legacy `category` text column migration was never run on data).
- [ ] Physical phone check (`dvh` / safe areas), dialogs and forms in dark mode, and contrast of the accent presets measured with a tool (current values are estimates).
- [ ] Frontend: the in-memory fake does not enforce the 2-level depth rule (the contract suite builds 3-level trees); consider a fake option or a separate fixture.

## Review follow-ups

- [ ] A DDD pass of `device-management` against the DDD rules (business rules still inside some backend use cases).
- [ ] Optional naming and readability from the review: persistence classes are named `*Service` although they are repository factories (`*Persistence` / `*Gateway` suggested); repeated `DeviceManagement.Domain.X` references could use a local alias in 4 files; `compare` in `MaintenanceLog` and `EquipmentCriteria` returns 1 for equal ids.
- [ ] Optional frontend structure notes: kebab-case file names versus "file name = class name"; `supabase-adapter.ts` (190 lines), `sheets-adapter.ts` (150 lines) and the contract suite (287 lines) exceed the ~100 line guideline.
- [ ] Decide whether `shared/interface` (`RequestParser`, `Router`, `ResponseWriter`) should also be renamed to `endpoints`.
- [ ] Apps Script lock scope: JSON serialization happens after the lock is released (considered harmless).
- [ ] Legacy category named like an `Object.prototype` property (for example `constructor`) can mis-resolve during the one-time migration.

## Planned work

- [ ] **Supabase phase** (after the app is complete on Sheets):
  - Run `001_init.sql` and `002_rls_policies.sql` on the Supabase project `apps-script-demo` (never run); consider one migration per module (`NNN_<module>.sql`) and the `persistence/supabase` layout.
  - Fix review findings on the Supabase adapter: PostgREST 416 for out-of-range pages, 22P02 for malformed ids (`get` must return null, `update` / `remove` must be `NotFoundError`), search normalization parity, empty-patch `update`.
  - Verify the Postgres error to `category_*` code mapping (cycle trigger message must contain `category_cycle`) and the `+00:00` datetime format.
  - No automatic migration exists for an already-created Postgres schema.
- [ ] **Deployment:** enable Pages with source "GitHub Actions", set repo Variables (`VITE_DB_PROVIDER`, `VITE_SHEETS_API_URL`, `VITE_IDENTITY_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), merge to `main` (the workflow only runs on `main`). Later: move to Cloudflare Pages (`VITE_BASE_PATH=/`) and attach the custom domain.
- [x] **Authentication:** done. Google sign-in with an email allowlist, a `super` role and `permission` claims (`identity.*`, `device.mgt.*`, `expense.*`); `created_by` / `last_modified_by` hold the resolved email. See `backend/docs/auth.md` and `backend/docs/identity-api.md`. Supabase RLS follows `003_auth.sql`.

## Nice to have

- [ ] Filter "uncategorized only", tree widget for category selection in forms (currently a native `<select>`), manual ordering and merging of categories, context menu / inline rename / drag and drop on the category tree, sortable table columns.
- [ ] Extra request when filtering by category (the category list is fetched to expand descendants; the backend does not expand them).
- [ ] `frontend/.env.example` could not be created (repo permission blocks writing `.env*`); the variable list lives in the root README instead.

## Repo state notes

- `frontend/node_modules` was restored with `npm ci`; it is git-ignored.
- Claude config commits go through `core/agents` first, then merge into `dev` and feature branches (see `CLAUDE.md`).
