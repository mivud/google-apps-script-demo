# Supabase

**Purpose:** Postgres storage for equipment and maintenance logs.

**Files:** [001_init.sql](../supabase/migrations/001_init.sql), [002_rls_policies.sql](../supabase/migrations/002_rls_policies.sql)

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
- v1 policies give the `anon` role full access because there is no login. The anon key ships in the frontend bundle, so anyone with the app link can read and write. Tighten the policies when auth is added.
- Never put the `service_role` key in the frontend.
