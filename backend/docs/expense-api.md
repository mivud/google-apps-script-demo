# expense-api

**Purpose:** standalone Apps Script Web App for personal expense tracking (module `expense-tracking`: payment methods, fixed expense templates, expenses). Code: [apps-script-expense-api](../apps-script-expense-api). Users, roles and claims come from [identity-api](identity-api.md); the shared building blocks come from the `SharedKernelLibrary` library pinned to version 6 ([shared-library](shared-library.md)). Version `1.0.0-beta.2` ([package.json](../apps-script-expense-api/package.json), `API_VERSION` in [SystemEndpoints.gs](../apps-script-expense-api/src/composition/SystemEndpoints.gs)).

## Contract

`POST` with `Content-Type: text/plain` and body `{ "idToken", "action", "payload" }`. Response `{ ok, data, error }`. Error codes: `VALIDATION` (domain rules put the stable code in `error.message`), `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL`. `doGet` returns `{ service, version }` without authentication. Audit fields are server-filled and never accepted from clients; the actor is the verified token email.

| Action | Needs | Payload | Result |
|---|---|---|---|
| `expense-tracking.expense.list` | read | `statement_month` | `{ items: [Expense] }`, `spent_on` desc then `created` desc |
| `expense-tracking.expense.create` | write | `description`, `amount`, `payment_method_id`, `spent_on`, `statement_month?` (computed from the payment method when omitted), `is_fixed?` | Expense |
| `expense-tracking.expense.update` | write | `id`, patch fields, `expected_last_modified` | Expense |
| `expense-tracking.expense.delete` | write | `id` | `{}` |
| `expense-tracking.expense.generateFixed` | write | `statement_month` | `{ items: [created Expense], skipped }` |
| `expense-tracking.paymentMethod.list/create/update/delete` | read / write | create: `id`, `name`, `active?`, `statement_closing_day?`, `color?`; update: `id`, `name?`, `active?`, `statement_closing_day?`, `color?`, `expected_last_modified` (the id is never changed) | PaymentMethod / `{ items }` / `{}` |
| `expense-tracking.fixedTemplate.list/create/update/delete` | read / write | `description`, `amount?`, `payment_method_id?`, `total_months?`, `active?` (update adds `id`, `expected_last_modified`) | Template / `{ items }` / `{}` |
| `system.version.get` | any signed-in user | none | `{ version }` |

## Data

Sheets (columns equal the Postgres columns; the four audit columns `created, created_by, last_modified, last_modified_by` come last; booleans are `TRUE`/`FALSE` text; created by the installer on the first valid request):

- `payment_methods`: `id, name, active, statement_closing_day, color` (`id` is a client-chosen text key, not a UUID; the other entities keep UUID ids)
- `fixed_expense_templates`: `id, description, amount (blank = none yet), payment_method_id (blank = none yet), total_months (blank = unlimited), months_added, active`
- `expenses`: `id, description, amount (blank only on rows with a template_id), payment_method_id (blank only on rows with a template_id), spent_on, statement_month, is_fixed, template_id`

Before the rename the tab was `money_sources` and the columns `money_source_id`; on the first request after the upgrade the installer renames the tab and those headers by name (data kept). Older tabs are upgraded by header name: new columns are added with blank cells (a blank `total_months` reads as unlimited, a blank `months_added` as 0, a blank `statement_closing_day` as no cycle).

## Rules

- `amount`: positive integer VND (`amount_invalid`), required on manual expenses (`expense_amount_required`). Fixed templates may have no amount (missing, null, empty or 0 is stored as a blank cell and returned as `null`). An expense generated from a template then has `amount: null` until the user fills it with `expense.update` (a positive integer); an amount that is already set can be changed but never cleared. Example: an electricity template without amount produces the expense `amount: null` each month, the user sets 850000 later. The server computes no totals. `description`: trimmed, 1-200 chars (`description_invalid`). `spent_on`: a real `YYYY-MM-DD` date (`spent_on_invalid`). `statement_month`: `YYYY-MM`, defaults to the month of `spent_on` (`statement_month_invalid`).
- Invalid sheet data (an expense row with no `template_id` and a blank payment method or a blank or non-positive-integer amount) is skipped by reads instead of failing the list; a template with an unusable amount reads as no amount.
- `payment_method_id` on a fixed template is optional (missing, null or empty = none, blank cell, JSON `null`); when set it must reference an existing payment method (`payment_method_not_found`). A manual expense requires one (`expense_payment_method_required`); an expense generated from a template copies the template value, possibly none. `expense.update` can set a missing payment method (it must exist) but never clear one that is set. Example: an electricity template with no amount and no payment method generates an expense with `amount: null` and `payment_method_id: null`; the user fills both later with `expense.update`. Deleting a payment method still fails with `payment_method_in_use` while any expense or template references it; empty references do not count.
- Payment method `color`: optional, null, missing or empty means no colour (blank cell, JSON `null`); otherwise exactly `#RRGGBB` (hex digits, stored lowercase), else `payment_method_color_invalid`. Update may change it or clear it with null.
- Payment method `statement_closing_day`: optional integer 1-31, null or empty means no billing cycle (`payment_method_closing_day_invalid` for 0, negatives, decimals, text). On `expense.create`, an omitted `statement_month` is computed from it: no closing day gives the month of `spent_on`; otherwise let `limit = min(closing_day, last day of the spent_on month)`; `spent_on` day <= limit stays in its month, later days go to the next month (December rolls to January). Closing day 20: `2026-09-21` -> `2026-10`, `2026-10-20` -> `2026-10`, `2026-10-21` -> `2026-11`; closing day 31 in February uses 28/29. A `statement_month` sent by the client is validated (`YYYY-MM`) and kept as an explicit choice. `expense.update` recomputes nothing unless `statement_month` is in the patch, changing a closing day never touches existing expenses, and `generateFixed` ignores the cycle (the requested month is used).
- Payment method id: sent by the client on create, trimmed, 1-40 chars, only `a-z 0-9 _ -` (`payment_method_id_invalid`; uppercase is rejected, never converted). Immutable after create. Compared ignoring case, a duplicate fails with `payment_method_id_taken`; the check and the insert run under the same write lock. Expenses and templates reference it as `payment_method_id` (this string).
- Payment method name: trimmed, 1-60 chars (`payment_method_name_invalid`), unique ignoring case (`payment_method_name_taken`). Deleting one referenced by any expense or template fails with `payment_method_in_use`. Expenses and templates must reference an existing payment method (`payment_method_not_found`).
- Templates: `total_months` is optional: missing, null, empty or 0 means unlimited (stored as a blank cell, returned as `null`); when set it is an integer from 1 to 1200 (`total_months_invalid`). `months_added` starts at 0, is server-owned and never read from the payload. When set, `total_months` cannot go below `months_added` (`total_months_below_added`).
- `expense.generateFixed`: for each active template that is unlimited or has `months_added < total_months` and no expense yet for (`template_id`, `statement_month`), creates one `is_fixed` expense (`spent_on` = first day of the month) and adds 1 to `months_added`, all inside the write lock. `skipped` counts the active templates that created nothing (already generated for the month or completed). Re-running a month changes nothing. Deleting a generated expense does not decrement the counter. The expense is saved before the counter, so a failure midway never counts a month without an expense. Known limit: if an expense exists for the month but the counter was not incremented (a failure between the two writes), nothing self-heals; the template is skipped and `months_added` stays one low until corrected by hand.
- `template_id` is set only by `generateFixed`; clients cannot send it. Updates use optimistic concurrency: a stale `expected_last_modified` gives `conflict`.
- All authenticated users with read access see all rows.

## Access

The token is verified by identity-api (`auth.access.resolve`, answer cached about 60 s). The result `{ email, role, claims }` is checked here: reads need claim `permission=expense.read`, every other action needs `permission=expense.write` (key and value match exactly, case-sensitive); role `admin` passes both. The frontend shows the expense app when the user holds `permission=expense.read`, and allows edits with `permission=expense.write`.

Claims to seed in identity-api (`claims.claim.create`), then add to roles or users:

| key | value | Meaning |
|---|---|---|
| `permission` | `expense.read` | may list payment methods, templates and expenses |
| `permission` | `expense.write` | may create, update, delete and generate |

## Script properties

| Property | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth Web client id the tokens are issued for (same as the other APIs) |
| `IDENTITY_API_URL` | identity-api Web App URL (`https://script.google.com/macros/s/<id>/exec`) |
| `SPREADSHEET_ID` | id of the `nexus-expense-data` spreadsheet |

No secrets are stored in code. The schema signature is kept by the installer in its own script property.

## Setup runbook

Values below are real for this repository (none is a secret). Each step says whether it is done.

| # | Step | Status |
|---|------|--------|
| 1 | Spreadsheet `nexus-expense-data`, id `1bnwVBICPg68xxcoercd7mM9_zZLkkq-BUhDTQwNF5Bk`, in the Drive folder `apps-script` ([open](https://docs.google.com/spreadsheets/d/1bnwVBICPg68xxcoercd7mM9_zZLkkq-BUhDTQwNF5Bk/edit)). Leave it empty; the installer creates the tabs on the first valid request | Done |
| 2 | Standalone project `expense-api`, Script ID `1IfeqfnGT44_gEA2k1sJAD6kV2SKrpKwJaoyc33cgP_LhYfm4HRCv6MwC` ([editor](https://script.google.com/d/1IfeqfnGT44_gEA2k1sJAD6kV2SKrpKwJaoyc33cgP_LhYfm4HRCv6MwC/edit)), set in [.clasp.json](../apps-script-expense-api/.clasp.json) | Done |
| 3 | `appsscript.json` links `SharedKernelLibrary` at version 6 | Done |
| 4 | Script Properties set: `GOOGLE_CLIENT_ID` (same client id as identity-api), `IDENTITY_API_URL` (identity-api URL ending in `/exec`), `SPREADSHEET_ID` (step 1) | Done |
| 5 | `clasp push -f` from `backend/apps-script-expense-api` | Done |
| 6 | Version 1 and Web App deployment (`clasp create-deployment -V 1`), id `AKfycbx-RuR866SuMDlaX4f4LWaG6QWH-7N3ELbwogOryx5whzFzoRv3d_gz4DCD0Dm4hsCy`, URL `https://script.google.com/macros/s/AKfycbx-RuR866SuMDlaX4f4LWaG6QWH-7N3ELbwogOryx5whzFzoRv3d_gz4DCD0Dm4hsCy/exec` (the `VITE_EXPENSE_API_URL` value) | Done |
| 7 | Authorize once: in the editor open `Main.gs`, pick the function **`authorizeScopes`** (not `doGet`) and press Run, Review permissions, tick **both** permissions (Sheets and "Connect to an external service"), Allow | **You** (consent screen) |
| 8 | In identity-api, seed the two claims above and grant them to the right roles or users | **You** |
| 9 | Frontend: set `VITE_EXPENSE_API_URL` in `frontend/.env.local` and in GitHub (Settings > Secrets and variables > Actions > Variables), then run the Pages workflow again | **You** |
| 10 | Supabase only: run `backend/supabase/migrations/008_expense_tracking.sql` | **You** (only for `VITE_DB_PROVIDER=supabase`) |

After step 7, `GET` on the URL returns `{service, version}` (before the consent it returns an HTML error page). A POST with a missing or fake `idToken` returns `UNAUTHORIZED`. Call `system.version.get` with a valid token; the first valid request creates the three tabs.

### After every change
Push, `clasp create-version "<text>"`, then `clasp redeploy AKfycbx-RuR866SuMDlaX4f4LWaG6QWH-7N3ELbwogOryx5whzFzoRv3d_gz4DCD0Dm4hsCy -V <version>` so the URL stays the same. A library change also needs a new library version pinned in `appsscript.json`.

## Limits

No paging (data is small); lists are filtered in memory. Tests: `npm test` in [apps-script-expense-api](../apps-script-expense-api) (`node --test`, all `.gs` files loaded in push order) covers the value objects, the statement cycle and the payment method and generate-fixed commands with in-memory fakes; endpoints and persistence are not covered.
