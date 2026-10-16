import { LANGUAGES, useI18n, type Language } from '../i18n'

export function LanguageSwitcher() {
  const { t, language, setLanguage } = useI18n()
  return (
    <select
      className="language-switcher"
      aria-label={t('language.label')}
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
    >
      {LANGUAGES.map((value) => (
        <option key={value} value={value}>{t(`language.${value}`)}</option>
      ))}
    </select>
  )
}
