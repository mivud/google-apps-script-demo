// Single source of the theme list: the inline script in index.html gets it injected by vite-theme-plugin.ts.
// A new theme also needs blocks in styles/themes.css and `theme.<name>` keys (enforced by the Messages type).
export const THEMES = ['green', 'blue', 'violet', 'rose', 'orange', 'amber', 'black'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'green'
export const THEME_STORAGE_KEY = 'app.theme'

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}
