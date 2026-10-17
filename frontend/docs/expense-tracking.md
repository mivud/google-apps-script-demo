# expense-tracking

Monthly expense tracking: expenses per statement month, payment methods and fixed expense templates. Code: [modules/expense-tracking](../src/modules/expense-tracking), app host: [app/expense](../src/app/expense). Related: [launcher](launcher.md), [config](config.md), [roles](roles.md).

## Access

- App access: claim `permission` = `expense.read` (registry entry `expense`, path `/expense`, via `accessClaimKey`). Seed `permission=expense.read` in the claims catalog and assign it to a role or user. Without it the tile is hidden and a typed URL redirects to `/` (same behavior as the other apps).
- Data access inside the app: claim `permission` = `expense.read` (list) and `permission` = `expense.write` (create, update, delete, generate). `useCanWriteExpenses` hides every write control for users without `expense.write` (the `super` role also passes, through `hasPermission` of [access-control](access-control.md); `PERMISSION_CLAIM_KEY` is re-used from there); the backend / RLS is authoritative.

## Model

- `PaymentMethod` {id, name, active, statementClosingDay} (the id is typed by the user on create, 1-40 chars of `[a-z0-9_-]`, read-only on edit; the form pre-checks it against the loaded list and shows field errors for `payment_method_id_invalid`, `payment_method_id_taken`, `payment_method_name_taken`); `FixedExpenseTemplate` {description, amount, paymentMethodId, active, totalMonths, monthsAdded}; `Expense` {description, amount, paymentMethodId, spentOn `YYYY-MM-DD`, statementMonth `YYYY-MM`, isFixed, templateId}. All carry the shared audit fields. Amount is a positive integer in VND.
- `statementClosingDay` (1-31 or null = calendar month, code `payment_method_closing_day_invalid`): the list shows the cycle ("Cycle 21 - 20", start = closing day + 1, 31 wraps to 1). `resolveStatementMonth(spentOn, closingDay)` ([statement-month.ts](../src/modules/expense-tracking/domain/statement-month.ts)) mirrors the server: up to the closing day (capped to the month length) is the same month, later is the next one. The expense form pre-fills and previews the statement month ("auto") when the date or payment method changes, until the user edits the month by hand; the payload always carries `statement_month`. Changing a closing day does not alter existing expenses; `generateFixed` ignores the cycle.
- Amounts: a template amount is optional (empty or 0 = null, e.g. electricity). `generateFixed` copies it, so a generated `Expense.amount` can be null (pending): the list shows a dash plus an "Amount needed" button that opens the edit dialog focused on the amount, which cannot be cleared again. Manual create requires an amount (`expense_amount_required`). `summarizeExpenses` skips pending rows and returns `pendingCount`, shown as a notice above the totals.
- Payment method on a template is optional too (null = differs each month); a generated expense then has `paymentMethodId` null and shows a "Payment method needed" button that opens the edit dialog focused on the select ([pending-field.tsx](../src/modules/expense-tracking/ui/components/pending-field.tsx), shared with "Amount needed"). Manual create requires one (`expense_payment_method_required`) and an update never clears it. `summarizeExpenses` keeps the amount of such rows in a visible "No payment method" bucket (`paymentMethodId: null`) and returns `unassignedCount`; the summary shows a notice when `pendingCount` or `unassignedCount` is above 0.
- `totalMonths` is `number | null`: empty or 0 in the form means no end (null, recurs every month, never completed, counter still increments). `monthsAdded` is server-owned: never sent, shown as `monthsAdded/totalMonths` with a "Completed" badge when equal. `totalMonths` cannot go below `monthsAdded` (`total_months_below_added`).
- `summarizeExpenses` ([domain](../src/modules/expense-tracking/domain/expense-summary.ts)) is the pure replacement of the sheet summary cells: total, fixed and variable cards; its per-payment-method buckets feed the donut chart only.
- Default order of the list (applied in `ExpenseService`, so identical for every provider): fixed expenses first, then newest `spentOn` first (missing or invalid dates last), then newest `created`, then `id` ([compareExpensesForDisplay](../src/modules/expense-tracking/domain/expense.ts)); the table has no column sorting.

## Public behavior

- One repository per aggregate ([application](../src/modules/expense-tracking/application)); services validate input and delegate. `update(id, patch, expectedLastModified)` fails with `conflict` when stale.
- `generateFixed(month)` returns `{created, skipped}`: the backend creates one expense per active, not completed template that has none for the month and raises `monthsAdded` by 1; running it twice adds nothing. The UI toasts both counts.
- Stable error codes (`payment_method_in_use`, `payment_method_id_invalid`, `payment_method_id_taken`, `payment_method_name_taken`, `payment_method_not_found`, `statement_month_invalid`, `expense_*`, `total_months_*`) are translated through [translateError](../src/shared/i18n/translate-error.ts) (en + vi).
- Deletes use the shared confirm dialog + toast flow.

## Providers

- Sheets: [googlesheet](../src/modules/expense-tracking/infrastructure/persistence/googlesheet) calls actions `expense-tracking.expense.list|create|update|delete|generateFixed`, `expense-tracking.paymentMethod.*`, `expense-tracking.fixedTemplate.*` on `VITE_EXPENSE_API_URL` with the Google ID token; payloads are snake_case.
- Supabase: [supabase](../src/modules/expense-tracking/infrastructure/persistence/supabase), selected by [create-expense-tracking-services.ts](../src/modules/expense-tracking/infrastructure/create-expense-tracking-services.ts).
- In-memory repositories for tests: [testing](../src/modules/expense-tracking/testing).
- Tests (`npm test`): domain, services on the in-memory repositories, row mappers, the sheets repositories with a mocked caller, shared table helpers and the colour swatches. The Supabase repositories and most pages are not covered yet.

## UI

Routes: `/expense` (month list: month picker, summary cards, expense table with fixed/variable badge, add/edit dialog, generate button), `/expense/payment-methods`, `/expense/fixed-expenses`. Layouts stack as cards below 768px; targets are 44px. Cards use `.summary-grid` in [layout.css](../src/styles/layout.css).

## Search, filters and reload

The three tables use the shared DataTable toolbar ([design-system](design-system.md)): search plus filters (expenses: payment method incl. "No payment method", type, needs amount/payment method; payment methods: status, statement cycle; templates: status, progress, missing amount/payment method), URL-synced, with a Reload icon button in the toolbar action group. Filtering is client-side over the loaded rows; the month totals stay for the whole month and say so. The actions column is right-aligned (`align: 'end'`).

## Payment method color

`PaymentMethod.color` is `#rrggbb` (lowercase) or null (payload `color`, code `payment_method_color_invalid`). The dialog offers a "None" radio, ten preset swatches, a custom-color picker chip and a hex field (both edit the same value) with a live preview. Everywhere a method is shown (expense and template tables, methods list, method selects and the expenses filter) the shared `PaymentMethodBadge` tints the badge with `color-mix` over the card color while the name keeps the normal text color, so contrast cannot break. The selects use the shared `RichSelect`. The donut keeps its own validated slot colors and is not recolored from this field.

## Statistics card, creator filter and chart

The expenses page has one "Statistics" card with two tabs ([expense-statistics.tsx](../src/modules/expense-tracking/ui/components/expense-statistics.tsx)): "Summary" (month total, fixed and variable cards plus the pending and unassigned notices, whole month, ignores filters) and "By payment method" (the donut, follows the table filters). Each tab shows its scope caption inside the panel. The card is rendered through the toolbar `renderAbove` slot, so it sits between the toolbar and the table.

The expenses table has a "Created by" column and select filter (URL key `createdBy`): options are the distinct `createdBy` values of the loaded rows, sorted; `import` or an empty value shows as "Unknown". The chart "Spending by payment method" ([spending-chart.tsx](../src/modules/expense-tracking/ui/components/spending-chart.tsx)) is a donut between the toolbar and the table, driven by the same filtered rows (search and every filter), unlike the month summary cards above, which keep the whole-month totals. The centre shows the total (or the hovered slice). Buckets come from `summarizeExpenses`; each payment method keeps a fixed color slot by its position in the payment methods list (first four methods), other methods fold into a gray "Other" slice whose tooltip lists them, and "No payment method" is gray too. Pending-amount rows are excluded and mentioned in a note. It uses the shared [DonutChart](../src/shared/components/donut-chart.tsx) through the toolbar `renderAbove` slot.

## Limits

No pagination (one month is small). Deleting a payment method in use is refused by the backend.
