export const LANGUAGES = ['en', 'vi'] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_STORAGE_KEY = 'app.language'

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

// Storage can throw (private mode, blocked cookies), so the app must work without it.
function readSaved(): Language | null {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguage(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Ignored: the choice simply will not persist.
  }
}

export function detectInitialLanguage(): Language {
  const saved = readSaved()
  if (saved) return saved
  const browser = typeof navigator !== 'undefined' ? navigator.language : ''
  return browser?.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

export const LOCALES: Record<Language, string> = { en: 'en-US', vi: 'vi-VN' }
