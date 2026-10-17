# Supabase

**Purpose:** Postgres storage for equipment and maintenance logs.

**Files:** [001_init.sql](../supabase/migrations/001_init.sql), [002_rls_policies.sql](../supabase/migrations/002_rls_policies.sql), [003_auth.sql](../supabase/migrations/003_auth.sql) (Google login, `users` allowlist, role policies)

**Schema**
- `categories`: id, parent_id (nullable self FK, `on delete restrict`; NULL = root), name (non-blank), plus audit columns.
- `equipment`: id, category_id (nullable FK to categories, `on delete restrict`; NULL = uncategorized), name, description, status (`active|in_repair|retired`), quantity (>= 0), plus audit columns.
- `maintenance_logs`: id, equipment_id (FK, cascade delete), type (`new|repair|replacement|maintenance`), performed_at, note, plus audit columns.
- Audit columns (all tables): `created_at`, `modified_at` (timestamptz, UTC), `created_by`, `last_modified_by` (text, default `''`).

**Audit autofill**
- Trigger `set_audit_timestamps` (before insert/update) forces the timestamps server-side: insert sets `created_at = modified_at = now()`; update keeps `created_at` from the old row and sets `modified_at = now()`. Client-supplied values are ignored.
- `created_by` / `last_modified_by` stay `''` until login exists. Later hook: set them from the authenticated user inside the trigger function.
- Datetime strings exchanged with the app are UTC, millisecond precision, `+00:00` offset (e.g. `2026-10-16T08:00:00.123+00:00`), same as the Sheets backend.
- Equipment ordering: `modified_at` DESC, then `id` ASC (index `equipment_modified_at_idx`). Logs: `performed_at` DESC, then `id` ASC.

**Category rules** (same as the Sheets backend)
- Sibling names are unique case-insensitively: unique index `categories_sibling_name_uq` on `(coalesce(parent_id, zero-uuid), lower(btrim(name)))`. A violation maps to `category_name_duplicate`.
- Trigger `categories_reject_cycle` raises `category_cycle` (check violation) for a self-parent or a descendant parent.
- Delete is blocked by `on delete restrict` (foreign key violation) when the category has children (`category_has_children`) or equipment (`category_in_use`); the adapter tells them apart.
- Indexes: `categories_parent_id_idx`, `equipment_category_id_idx`. `categories` has the audit trigger and the v1 anon policy.
- Migration note: `001_init.sql` was edited in place (`equipment.category` text replaced by `category_id`). For an existing database, create `categories`, insert one root row per distinct old name, update `equipment.category_id`, then drop `category`; or recreate the tables if the data is disposable.

**Rules**
- Column names are identical to the Google Sheet headers.
- Apply the migrations in order in the Supabase SQL editor.
- The v1 policies in `002` gave `anon` full access; the anon key ships in the frontend bundle. Apply `003_auth.sql` so access requires a Google login and an allowlisted role (see the next point).
- `003_auth.sql` only trusts Google logins: `current_app_role()` and the `users` policy require `app_metadata.provider = 'google'` and a verified email in the JWT. Still disable every other Supabase auth provider and email signup (Authentication > Providers), so nobody can register with an allowlisted email.
- Never put the `service_role` key in the frontend.

**Permission access ([009_permission_access.sql](../supabase/migrations/009_permission_access.sql))**
- Replaces the admin/viewer policies of 003-007: only the `super` role bypasses; `viewer` is dropped (its rows stay as plain data, `admin` assignments are copied to `super`).
- Identity tables need claim `permission=identity.read` / `identity.write`; device tables (`categories`, `equipment`, `maintenance_logs`) need `device.mgt.read` / `device.mgt.write`; expense tables keep `expense.read` / `expense.write`. `users` keeps its own-row read.
- Helpers: `has_role(text)`, `has_claim(key, value)` (super bypass); `preview_access` needs `identity.read`. Effective claims merge additively; a role claim is dropped only when the user owns the same (key, value). No `users.role` fallback.
- Lockout codes: `last_super` (was `last_admin`) and `self_lockout`. Grant the permission claims to roles before applying, otherwise only `super` users keep access.
