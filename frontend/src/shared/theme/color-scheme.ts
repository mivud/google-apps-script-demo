// Single source of the color scheme rules: the inline script in index.html gets META_THEME_COLORS injected
// by vite-theme-plugin.ts so the browser chrome color never flashes either.
export const COLOR_SCHEME_MODES = ['light', 'dark', 'system'] as const
export type ColorSchemeMode = (typeof COLOR_SCHEME_MODES)[number]
export type ResolvedColorScheme = 'light' | 'dark'

export const DEFAULT_COLOR_SCHEME_MODE: ColorSchemeMode = 'system'
export const COLOR_SCHEME_STORAGE_KEY = 'app.color-scheme'
export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

// Matches --background in styles/tokens.css (oklch(1 0 0) and oklch(0.145 0 0)).
export const META_THEME_COLORS: Record<ResolvedColorScheme, string> = { light: '#ffffff', dark: '#0a0a0a' }

export function isColorSchemeMode(value: unknown): value is ColorSchemeMode {
  return typeof value === 'string' && (COLOR_SCHEME_MODES as readonly string[]).includes(value)
}

export function resolveColorScheme(mode: ColorSchemeMode, prefersDark: boolean): ResolvedColorScheme {
  if (mode === 'system') return prefersDark ? 'dark' : 'light'
  return mode
}
