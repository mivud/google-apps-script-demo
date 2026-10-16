import { useI18n } from '../i18n'
import { useRovingRadiogroup } from '../hooks/use-roving-radiogroup'
import { THEMES, useTheme } from '../theme'
import { Icon } from './Icon'

export function ThemePicker() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const { groupRef, onKeyDown } = useRovingRadiogroup(THEMES.length, (index) => setTheme(THEMES[index]))

  return (
    <div className="theme-picker" role="radiogroup" aria-label={t('theme.label')} ref={groupRef}>
      {THEMES.map((name, index) => (
        <button
          key={name}
          type="button"
          role="radio"
          className="theme-option"
          data-theme={name}
          aria-checked={theme === name}
          aria-label={t(`theme.${name}`)}
          title={t(`theme.${name}`)}
          tabIndex={theme === name ? 0 : -1}
          onClick={() => setTheme(name)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          <span className="swatch">{theme === name && <Icon name="check" />}</span>
        </button>
      ))}
    </div>
  )
}
