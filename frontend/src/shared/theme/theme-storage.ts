import { DEFAULT_THEME, isTheme, THEME_STORAGE_KEY, type Theme } from './themes'

// Storage can throw (private mode, blocked cookies), so the app must work without it.
export function readSavedTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignored: the choice simply will not persist.
  }
}

// The inline script in index.html already applied the saved theme before React rendered.
export function readAppliedTheme(): Theme {
  const applied = document.documentElement.dataset.theme
  return isTheme(applied) ? applied : (readSavedTheme() ?? DEFAULT_THEME)
}
