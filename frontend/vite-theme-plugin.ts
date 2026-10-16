import type { Plugin } from 'vite'
import { META_THEME_COLORS } from './src/shared/theme/color-scheme.ts'
import { THEMES } from './src/shared/theme/themes.ts'

export const THEMES_PLACEHOLDER = '__THEMES__'
export const META_COLORS_PLACEHOLDER = '__META_COLORS__'

export function injectThemes(html: string): string {
  return html
    .replace(THEMES_PLACEHOLDER, JSON.stringify(THEMES))
    .replace(META_COLORS_PLACEHOLDER, JSON.stringify(META_THEME_COLORS))
}

// The inline script in index.html runs before first paint and cannot import modules,
// so the theme list and meta colors are injected at build/serve time from the single sources.
export function themeListPlugin(): Plugin {
  return { name: 'inject-theme-list', transformIndexHtml: injectThemes }
}
