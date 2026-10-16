import { useI18n } from '../i18n'
import { useRovingRadiogroup } from '../hooks/use-roving-radiogroup'
import { COLOR_SCHEME_MODES, useColorScheme, type ColorSchemeMode } from '../theme'
import { Icon, type IconName } from './icon'

const MODE_ICON: Record<ColorSchemeMode, IconName> = { light: 'sun', dark: 'moon', system: 'laptop' }

// Icon-only segmented radiogroup; each option carries its label for assistive tech and as a tooltip.
export function ColorSchemePicker() {
  const { t } = useI18n()
  const { mode, setMode } = useColorScheme()
  const { groupRef, onKeyDown } = useRovingRadiogroup(COLOR_SCHEME_MODES.length, (index) => setMode(COLOR_SCHEME_MODES[index]))

  return (
    <div className="segmented" role="radiogroup" aria-label={t('colorScheme.label')} ref={groupRef}>
      {COLOR_SCHEME_MODES.map((option, index) => (
        <button
          key={option}
          type="button"
          role="radio"
          className="segmented-option"
          aria-checked={mode === option}
          aria-label={t(`colorScheme.${option}`)}
          title={t(`colorScheme.${option}`)}
          tabIndex={mode === option ? 0 : -1}
          onClick={() => setMode(option)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          <Icon name={MODE_ICON[option]} />
        </button>
      ))}
    </div>
  )
}
