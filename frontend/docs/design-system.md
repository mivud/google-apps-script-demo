# Design system

Flat, neutral look ported from the admin client (shadcn radix-nova) to plain CSS: white page, cards with a 1px border and soft shadow, accent color only on primary actions and active states. Blur is reserved for the dialog, the settings popover and the mobile tab bar. Mobile-first.

## Styles ([src/styles](../src/styles))

- `tokens.css`: semantic oklch tokens (`--background`, `--foreground`, `--card`, `--popover`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--input`, `--control-border`, `--ring`, `--destructive`, `--primary-foreground`, `--success`, `--warning`), radius scale (`--radius` 0.75rem, `-sm/-md/-lg/-xl/-2xl/-4xl`, `--radius-pill`), `--shadow-soft-sm/md/lg`, motion (`--duration-fast/base/slow`, `--ease-standard`), z-index scale (`--z-index-header/tabbar/dropdown/overlay`), `--tap` and `--control-height` (44px below 768px, 36px from 768px; `--control-height-sm` 44/32px), thin scrollbar color, and the `--glass-*` tokens used by blurred surfaces. The dark block applies under `html[data-color-scheme='dark']`.
- `themes.css`: accent presets (only `--primary`, plus `--primary-foreground` / `--primary-ink` when needed).
- `base.css`: reset, typography, focus ring, thin scrollbar, a11y helpers. `layout.css`: shell, flat header, tab bar, grids. `controls.css`: inputs, field, buttons, segmented picker, badges. `components.css`: surfaces, popover, dialog, loading, lists, data table, tree.
- Fallbacks: no `backdrop-filter`, `prefers-reduced-transparency` or `prefers-contrast: more` switch the blurred surfaces to opaque; `prefers-reduced-motion` disables animations.
- The old names (`--bg`, `--surface`, `--text`, `--danger*`, `--primary-bg/-text`, `--field-bg`) were migrated and removed; `--muted` changed meaning (now a background, text uses `--muted-foreground`).

## Accent presets

`green` (default), `blue`, `violet`, `rose`, `orange`, `amber`, `black`. Each light preset keeps white text on `--primary` at >= 4.5:1, so a darker shade is used where the 600 shade fails: green-700 (green-600 is ~3.3:1), orange-700 (~3.6:1), rose-700 (rose-600 is borderline ~4.5:1). Amber-600 takes dark text (`--primary-foreground`) and uses amber-700 as text color on white (`--primary-ink`, used by links and active nav). Dark presets use the 500 shade with dark text (violet uses 400 to reach 4.5:1). `black` inverts to white in dark mode.

Add a theme: add its light and dark blocks in `themes.css` (override only `--primary`; add `--primary-foreground` if white text fails, `--primary-ink` if the fill is too light as text), its name in `THEMES` ([themes.ts](../src/shared/theme/themes.ts)), plus `theme.<name>` keys in `en.ts` and `vi.ts` (the `Messages` type makes a missing key fail `tsc`). The `ThemePicker` swatch reads `--primary` from the same light block.

## Color scheme

Mode `light | dark | system` (default `system`), stored in `localStorage['app.color-scheme']`; the accent stays in `app.theme`. [ColorSchemeProvider](../src/shared/theme/color-scheme-provider.tsx) resolves the mode (system follows `prefers-color-scheme` live through `useSyncExternalStore`) and applies `data-color-scheme` + the `color-scheme` CSS property on `<html>` and the `theme-color` meta ([apply-color-scheme.ts](../src/shared/theme/apply-color-scheme.ts)). `ColorSchemePicker` (3-option radiogroup with sun/moon/laptop icons) lives in `SettingsMenu`. `AppearanceProvider` mounts both providers.

## No-flash mechanism

A synchronous inline script in `index.html` reads both storage keys (try/catch, validated), resolves the scheme with `matchMedia`, and sets `data-theme`, `data-color-scheme`, `style.colorScheme` and the meta color before first paint. [vite-theme-plugin.ts](../vite-theme-plugin.ts) injects `THEMES` (`__THEMES__`) and `META_THEME_COLORS` (`__META_COLORS__`) from their single sources; the providers start from the same storage.

## Shared components ([src/shared/components](../src/shared/components))

`AppShell` (flat header + `SettingsMenu` (its footer shows the frontend and backend versions, see [VersionInfo](../src/app/version-info.tsx)), top nav >= 768px, bottom `TabBar` below; nav items come in as props with a router `to` path, rendered as `Link`), `NavItem`, `TabBar`, `SettingsMenu`, `ThemePicker`, `ColorSchemePicker`, `LanguageSwitcher`, `GlassSurface` (kept name and API; renders the flat `.surface` card), `Button` (`LoadingButton` is an alias), `Field`, `TextInput`, `Select`, `Textarea`, `SearchInput`, `Badge`, `Icon`, `PageHeader`, `Pager`, `EmptyState`, `DescriptionList`, plus `Modal`, `Spinner`, `Skeleton` (muted shimmer), error components. Shared code never imports from `modules/` or `app/`.

`Button` variants: `default` (primary), `outline`, `secondary`, `ghost`, `destructive`, `link`; sizes `default`, `sm`, `icon` (square). Radius lg, 0.875rem/500, 2px ring at 50% on focus, 1px press, disabled at 50% opacity. `loading` disables it, sets `aria-busy` and shows a spinner before the label. Inputs: transparent (dark: `--input` 30%), `--control-border` border (3:1 on the page background; `--input` stays the subtle fill and divider color), radius md, 16px text below 768px (no iOS zoom) and 0.875rem above, focus ring, `aria-invalid` red ring, disabled uses a muted fill and text instead of opacity. `Badge` tones (`success`, `warning`, `neutral`, `danger`) are fully rounded 12% tints with AA text.

Delete flow: `useDeleteAction` ([hook](../src/shared/hooks/use-delete-action.tsx)) opens `ConfirmDeleteDialog` (Yes/No, both locked and Esc ignored while pending), runs the call, then shows a success or error toast via `ToastProvider`/`useToast` ([src/shared/toast](../src/shared/toast); mounted once in `main.tsx`; top of screen on mobile, bottom-right from 768px). `RowActions` ([component](../src/shared/components/row-actions.tsx)) renders `Edit | Delete` icon buttons for an actions column of a `DataTable`; no menu to open (Delete is omitted for protected items). `DataTable` (generic columns; real table from 768px with row hover `--muted` 50%, stacked labelled cards below, no horizontal scroll; `TableSkeleton`) and `TreeList` (see below). Pages compose only shared components: `SurfaceList`/`SurfaceListItem`, `FormError`, layout wrappers in `Layout.tsx`, `InlineSkeleton`. `Field`-based inputs accept `hideLabel` and `adornment`.

## TreeList

Generic WAI-ARIA tree ([TreeList](../src/shared/components/tree-list.tsx), [TreeItem](../src/shared/components/tree-item.tsx), pure key model in [tree-navigation](../src/shared/components/tree-navigation.ts)). `role="tree"`, rows `treeitem` with `aria-level/setsize/posinset/selected`, `aria-expanded` on parents only, children in `role="group"`. jsTree look: guide lines under each parent chevron, rotating chevron, closed/open folder and file icons, hover and selected (primary tint + `--primary-ink`) highlight, animated collapse (grid rows; off under `prefers-reduced-motion`), rows `--control-height` (44px mobile, 36px desktop).

Behavior: click selects, chevron only toggles, double-click or Enter toggles parents. Roving tabindex: Up/Down, Right (expand or first child), Left (collapse or parent), Home/End, Enter/Space, `*` expands siblings. Expansion and selection are controlled when `onExpandedChange` / `onSelectedChange` are passed. Built-in toolbar (expand/collapse all). `renderActions` controls sit outside the treeitem: always visible below the label on mobile and touch (`hover: none`), icon-only and shown on hover, selection or focus from 768px with a mouse. Not included: context menu, inline rename, drag and drop, typeahead.

## Known limits

`--control-border` keeps input borders at about 3:1; other decorative borders (`--border`, `--input`) are subtle by design and are not relied on to identify controls.

## DataTable toolbar (search, filters, reload)

`DataTable` ([data-table.tsx](../src/shared/components/data-table.tsx)) has an opt-in `toolbar` prop; without it the table renders exactly as before. A column can also set `align: 'end'` to right-align its header and cells (use it on the actions column; CSS uses `text-align: end`).

How to adopt in a page (config only):

1. Build `filters: FilterDefinition<Row>[]` ([table-filters.ts](../src/shared/table-filters.ts)): `key` (also the URL param), `label` and a `predicate(row, value)` called only for non-"all" values. Pick the `kind`: `select` (long lists; `options` start with `ALL_VALUE`), `radio` (a few fixed choices; `options` start with `ALL_VALUE`; rendered as a joined segmented control of real radio inputs in a fieldset) or `toggle` (independent on/off flag; no options; all toggles share one checkbox group captioned by `toolbar.toggleGroupLabel`). Example: `{ key: 'type', label, kind: 'radio', options: [{ value: ALL_VALUE, label: 'All types' }, { value: 'fixed', label: 'Fixed' }], predicate: (row, v) => row.isFixed === (v === 'fixed') }` and `{ key: 'needsAmount', label: 'Needs amount', kind: 'toggle', predicate: (row) => row.amount === null }`. "All" / off means no active filter for the badge count.
2. Pass `toolbar={{ searchLabel, searchFields: (row) => [...], filters, itemsName, urlSync: true, actions: <ReloadButton source={list} /> }}`. Search is trimmed, case- and accent-insensitive ([search-text.ts](../src/shared/search-text.ts)).
3. The toolbar is made of separate blocks at every width: the action strip on top; row A with the search field first and then the `select` filters (one line when they fit, wrapping only when full; the search is full width at 360px); row B with the `radio` groups and the `toggle` checkbox group on their own line below, never sharing a line with row A. A row with no controls is not rendered. Then the count line ("N of M items") with a "Clear filters" button beside it while a filter is active; the empty state offers "Clear filters" too.
4. `urlSync: true` keeps search (`q`) and filters in the URL via [use-table-query.ts](../src/shared/hooks/use-table-query.ts); unknown values fall back to "all". Do not put sensitive data in the search.
5. [ActionGroup](../src/shared/components/action-group.tsx) is the joined icon-button set for the `actions` slot: `<ActionGroup label={t('table.actions')} actions={[reload]} />` with `reload = useReloadAction(list)` (or `<ReloadButton source={list} />` when Reload is the only action). Each entry is `{id, icon, label, onClick, loading?, disabled?}`; `label` is both the aria-label and the tooltip, and `loading` swaps the icon for a spinner. A future Export button is just one more entry, e.g. `{ id: 'export', icon: 'download', label: t('table.export'), onClick: exportRows }` (add the icon and key then; export is not implemented yet).
6. Layout: the action group sits in its own right-aligned row at the very top of the table block (no row when there are no actions), shown as a compact 32px function-key strip (`size="sm"`, 44px on coarse pointers). Below it come the search field (with the Filters toggle beside it on phones), the filters (always open from 768px) and the count.

Not yet adopted by device-management, identity, roles or users.

### Buttons

[Button](../src/shared/components/button.tsx) renders its children in one centered `.btn-content` row (icon + label + badge, gap 6px, icons do not shrink). While `loading`, the content turns transparent and a spinner overlays it, so the button never changes width. Icon-only buttons (`size="icon"`) have the same 44px height and border as text buttons.

### Donut chart

[DonutChart](../src/shared/components/donut-chart.tsx) shows each item's share of the total as a ring (about a third of the radius thick, starting at 12 o'clock, clockwise): `items: {key, label, value, count, colorIndex?, members?}[]`, `formatValue`, `totalLabel` (centre caption), `title`, `caption`, header labels, `emptyMessage` and an optional `note`. Slices keep the caller's stable order and fixed colors (`colorIndex` 1-4 maps to `--chart-series-N`, none means the gray `--chart-neutral`), so filtering never repaints survivors; a slice below 2 degrees is widened to stay hoverable (labels keep the true share); a single 100% slice is a full ring; zero total shows the empty message. The legend (swatch, name, amount, share) is the direct labelling, slices are separated by a 2px surface-colored gap, hover or focus on a slice or legend row highlights both, updates the centre text and shows a tooltip, and a "Show as table" toggle gives the same numbers. A hatch overlay appears under `forced-colors` and print. Layout: ring on top at 360px, ring left and legend right from 768px.

Palette check (dataviz `validate_palette.js`, `--pairs all` because any two slices can touch after filtering; surfaces light #ffffff and dark #171717 = `--card`): only a set of four validates, so slots 1, 4, 5, 6 of the reference palette are used (light `#2a78d6 #eda100 #e87ba4 #008300`, dark `#3987e5 #c98500 #d55181 #008300`). Light: worst CVD 13.0, worst normal-vision 19.6, contrast WARN for yellow and magenta (relief: legend labels and table view). Dark: worst CVD 6.9 (WARN band, secondary encoding required: legend, gaps, table), worst normal-vision 19.3, contrast passes. Five or six slots fail the hard normal-vision floor, so more methods fold into "Other". The gray (de-emphasis) only has to pass contrast; against magenta (light) and magenta/yellow (dark) its pair deltas are below the floors, which the legend, gaps and table cover.

### Amount input

[AmountInput](../src/shared/components/amount-input.tsx) is the field for whole amounts (VND): `<AmountInput label={t('expense.amount')} value={amount} onChange={setAmount} />` with `value: number | null` (null = empty), so forms keep their own rules (required, or "empty / 0 means none"). It is a text input (`inputMode="numeric"`, `autoComplete="off"`) with the live mask `#,###` (comma every 3 digits, never the browser locale). Only digits are kept (pasted spaces, dots, signs and currency text are dropped), leading zeros collapse, at most 12 digits, and the caret stays at the same digit when separators move; Backspace/Delete next to a comma removes the neighbouring digit. Digits are right-aligned. The pure helpers (`formatAmountDigits`, `parseAmountDigits`, `maskInput`) live in [amount-mask.ts](../src/shared/amount-mask.ts); display columns use the same grouping through `useMoneyFormat`.

### Tabs

[Tabs](../src/shared/components/tabs.tsx): `<Tabs label={t('...')} tabs={[{ id, label, content }]} initialId="summary" />`. Underline style with `role="tablist"` / `tab` / `tabpanel`, `aria-selected` / `aria-controls`, roving tabindex, Left/Right/Home/End select and focus (activation on focus), a visible inset focus ring and 44px tabs on coarse pointers. Only the selected panel is rendered (a chart in another tab is not computed). The strip scrolls inside itself if the labels do not fit, never the page.

### RichSelect

[RichSelect](../src/shared/components/rich-select.tsx) is a listbox-style select for options that need more than text (colored badges, icons): `<RichSelect label value options={[{ value, label }]} onChange renderOption={(option) => <Badge ... />} />`. It is wrapped by Field like the native select (label, error, aria-invalid), uses the select-only combobox pattern (`aria-haspopup="listbox"`, `aria-activedescendant`), supports Up/Down/Home/End, type-ahead, Enter/Space and Escape, closes on outside click, and has compact 32px rows. A table filter of kind `select` can opt in with `renderOption`. Keep the native `Select` for plain text options.
