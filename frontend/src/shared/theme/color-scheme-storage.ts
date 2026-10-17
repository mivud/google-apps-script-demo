import { COLOR_SCHEME_STORAGE_KEY, DEFAULT_COLOR_SCHEME_MODE, isColorSchemeMode, type ColorSchemeMode } from './color-scheme'

// Storage can throw (private mode, blocked cookies), so the app must work without it.
export function readColorSchemeMode(): ColorSchemeMode {
  try {
    const saved = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    return isColorSchemeMode(saved) ? saved : DEFAULT_COLOR_SCHEME_MODE
  } catch {
    return DEFAULT_COLOR_SCHEME_MODE
  }
}

export function saveColorSchemeMode(mode: ColorSchemeMode): void {
  try {
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, mode)
  } catch {
    // Ignored: the choice simply will not persist.
  }
}
