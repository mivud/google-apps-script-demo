import { META_THEME_COLORS, type ResolvedColorScheme } from './color-scheme'

// The attribute drives the CSS tokens; the inline style keeps native widgets and scrollbars in sync.
export function applyColorScheme(scheme: ResolvedColorScheme): void {
  const root = document.documentElement
  root.dataset.colorScheme = scheme
  root.style.colorScheme = scheme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_THEME_COLORS[scheme])
}
