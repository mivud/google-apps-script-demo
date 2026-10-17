import { createContext, useContext } from 'react'
import type { MessageKey } from './en'
import type { Language } from './language-storage'

export type TranslateFn = (key: MessageKey, params?: Record<string, string | number>) => string

export interface I18nValue {
  t: TranslateFn
  language: Language
  setLanguage: (language: Language) => void
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
