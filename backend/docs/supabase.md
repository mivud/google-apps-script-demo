# Supabase

**Setup guide:** [supabase-setup](supabase-setup.md).

**Purpose:** Postgres storage for identity (users, roles, claims), equipment and maintenance logs, and expense tracking.

**Scripts** (run in order in the SQL editor; each is idempotent and describes the final state, no incremental history)
1. [001_api.sql](../supabase/migrations/001_api.sql): shared layer. `caller_email`, `is_google_login`, `set_audit_columns`, access resolution (`identity_*`), `current_app_role`, `has_role`, `has_claim`, RPCs `current_identity` and `preview_access`.
2. [002_users.sql](../supabase/migrations/002_users.sql): `users`, `roles`, `claims`, `user_roles`, `role_claims`, `user_claims`, lockout rules, RLS (`identity.read` / `identity.write`), seed of the `super` role and the six permission claims. The header shows how to add the first super user.
3. [003_device_management.sql](../supabase/migrations/003_device_management.sql): `categories`, `equipment`, `maintenance_logs` (`device.mgt.read` / `device.mgt.write`). Equipment also holds nullable `purchase_date`, `warranty_months` (0..600), `warranty_expiry_date` (set by a trigger from purchase date + months, month end clamped), `note`, `vendor`; `maintenance_logs.vendor`; blank strings are normalized to null. Codes: `purchase_date_invalid`, `warranty_months_invalid`, `warranty_requires_purchase_date`, `note_too_long`, `vendor_too_long`.
4. [004_expense_tracking.sql](../supabase/migrations/004_expense_tracking.sql): `payment_methods`, `fixed_expense_templates`, `expenses`, `generate_fixed_expenses` (`expense.read` / `expense.write`). Templates have `payment_day` (smallint 1..31 or null, code `payment_day_invalid`); expenses have `paid_at` (only for fixed expenses, else `expense_not_fixed`). `generate_fixed_expenses` sets `spent_on` to the payment day (capped to the month length, the 1st when null) while `statement_month` stays the requested month.

The previous incremental scripts (001-009 and phase 2) were removed from the repo (see git history before commit 334dc3b); an existing database that already ran them does not need the new scripts.

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

**Rules**
- Column names are identical to the Google Sheet headers.
- No `anon` access anywhere: access requires a Google login (`is_google_login()`: provider `google` and a verified email in the JWT), an active row in `users`, and the matching permission claim. Still disable every other Supabase auth provider and email signup (Authentication > Providers), so nobody can register with an allowlisted email.
- Never put the `service_role` key in the frontend.
- Only the `super` role bypasses permission checks. Effective claims merge additively: a role claim is dropped only when the user owns the same (key, value). `users` also has an own-row read policy.
- Lockout codes: `last_super` and `self_lockout`. Other stable codes: `role_protected`, `role_in_use`, `claim_in_use`, `claim_unknown`, `limit_exceeded`, `user_email_duplicate`.
- Device-management tables keep `created_at` / `modified_at` audit names (see Audit autofill); identity and expense tables use `created` / `last_modified` filled from the JWT email.
