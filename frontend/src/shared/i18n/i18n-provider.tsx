import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en, type Messages } from './en'
import { vi } from './vi'
import { I18nContext, type I18nValue } from './i18n-context'
import { detectInitialLanguage, saveLanguage, type Language } from './language-storage'

const CATALOGS: Record<Language, Messages> = { en, vi }

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    document.title = CATALOGS[language]['app.name']
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    saveLanguage(next)
  }, [])

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => interpolate(CATALOGS[language][key], params),
    }),
    [language, setLanguage],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
