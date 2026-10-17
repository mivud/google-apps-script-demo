import { describe, expect, it } from 'vitest'
import { injectThemes, META_COLORS_PLACEHOLDER, THEMES_PLACEHOLDER } from '../../../vite-theme-plugin'
import html from '../../../index.html?raw'
import {
  COLOR_SCHEME_STORAGE_KEY,
  isColorSchemeMode,
  META_THEME_COLORS,
  resolveColorScheme,
} from './color-scheme'
import { DEFAULT_THEME, isTheme, THEME_STORAGE_KEY, THEMES } from './themes'

describe('themes', () => {
  it('accepts only known theme names', () => {
    expect(isTheme('green')).toBe(true)
    expect(isTheme('black')).toBe(true)
    expect(isTheme('purple')).toBe(false)
    expect(isTheme(undefined)).toBe(false)
  })

  it('defaults to a known theme', () => {
    expect(isTheme(DEFAULT_THEME)).toBe(true)
  })

  it('index.html carries the placeholders and both storage keys for the inline script', () => {
    expect(html).toContain(`var THEMES = ${THEMES_PLACEHOLDER}`)
    expect(html).toContain(`var META_COLORS = ${META_COLORS_PLACEHOLDER}`)
    expect(html).toContain(`'${THEME_STORAGE_KEY}'`)
    expect(html).toContain(`'${COLOR_SCHEME_STORAGE_KEY}'`)
  })

  it('injects the THEMES list and meta colors in place of the placeholders', () => {
    const injected = injectThemes(html)
    expect(injected).not.toContain(THEMES_PLACEHOLDER)
    expect(injected).not.toContain(META_COLORS_PLACEHOLDER)
    expect(injected).toContain(`var THEMES = ${JSON.stringify(THEMES)}`)
    expect(injected).toContain(`var META_COLORS = ${JSON.stringify(META_THEME_COLORS)}`)
  })
})

describe('color scheme', () => {
  it('accepts only known modes', () => {
    expect(isColorSchemeMode('system')).toBe(true)
    expect(isColorSchemeMode('auto')).toBe(false)
  })

  it('system follows the OS preference, explicit modes ignore it', () => {
    expect(resolveColorScheme('system', true)).toBe('dark')
    expect(resolveColorScheme('system', false)).toBe('light')
    expect(resolveColorScheme('light', true)).toBe('light')
    expect(resolveColorScheme('dark', false)).toBe('dark')
  })
})
