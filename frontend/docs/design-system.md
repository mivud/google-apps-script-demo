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

`AppShell` (flat header + `SettingsMenu` (its footer shows the frontend and backend versions, see [VersionInfo](../src/app/version-info.tsx)), top nav >= 768px, bottom `TabBar` below; nav items come in as props), `NavItem`, `TabBar`, `SettingsMenu`, `ThemePicker`, `ColorSchemePicker`, `LanguageSwitcher`, `GlassSurface` (kept name and API; renders the flat `.surface` card), `Button` (`LoadingButton` is an alias), `Field`, `TextInput`, `Select`, `Textarea`, `SearchInput`, `Badge`, `Icon`, `PageHeader`, `Pager`, `EmptyState`, `DescriptionList`, plus `Modal`, `Spinner`, `Skeleton` (muted shimmer), error components. Shared code never imports from `modules/` or `app/`.

`Button` variants: `default` (primary), `outline`, `secondary`, `ghost`, `destructive`, `link`; sizes `default`, `sm`, `icon` (square). Radius lg, 0.875rem/500, 2px ring at 50% on focus, 1px press, disabled at 50% opacity. `loading` disables it, sets `aria-busy` and shows a spinner before the label. Inputs: transparent (dark: `--input` 30%), `--control-border` border (3:1 on the page background; `--input` stays the subtle fill and divider color), radius md, 16px text below 768px (no iOS zoom) and 0.875rem above, focus ring, `aria-invalid` red ring, disabled uses a muted fill and text instead of opacity. `Badge` tones (`success`, `warning`, `neutral`, `danger`) are fully rounded 12% tints with AA text.

`DataTable` (generic columns; real table from 768px with row hover `--muted` 50%, stacked labelled cards below, no horizontal scroll; `TableSkeleton`) and `TreeList` (see below). Pages compose only shared components: `SurfaceList`/`SurfaceListItem`, `FormError`, layout wrappers in `Layout.tsx`, `InlineSkeleton`. `Field`-based inputs accept `hideLabel` and `adornment`.

## TreeList

Generic WAI-ARIA tree ([TreeList](../src/shared/components/tree-list.tsx), [TreeItem](../src/shared/components/tree-item.tsx), pure key model in [tree-navigation](../src/shared/components/tree-navigation.ts)). `role="tree"`, rows `treeitem` with `aria-level/setsize/posinset/selected`, `aria-expanded` on parents only, children in `role="group"`. jsTree look: guide lines under each parent chevron, rotating chevron, closed/open folder and file icons, hover and selected (primary tint + `--primary-ink`) highlight, animated collapse (grid rows; off under `prefers-reduced-motion`), rows `--control-height` (44px mobile, 36px desktop).

Behavior: click selects, chevron only toggles, double-click or Enter toggles parents. Roving tabindex: Up/Down, Right (expand or first child), Left (collapse or parent), Home/End, Enter/Space, `*` expands siblings. Expansion and selection are controlled when `onExpandedChange` / `onSelectedChange` are passed. Built-in toolbar (expand/collapse all). `renderActions` controls sit outside the treeitem: always visible below the label on mobile and touch (`hover: none`), icon-only and shown on hover, selection or focus from 768px with a mouse. Not included: context menu, inline rename, drag and drop, typeahead.

## Known limits

`--control-border` keeps input borders at about 3:1; other decorative borders (`--border`, `--input`) are subtle by design and are not relied on to identify controls.
