import { useId } from 'react'
import type { CSSProperties } from 'react'
import { useI18n } from '../../../../shared/i18n'
import { PAYMENT_METHOD_COLOR_PRESETS } from '../../domain/payment-method'

interface ColorSwatchesProps {
  // '' means no color; otherwise a #rrggbb text.
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

// Radio group of preset swatches plus "None": real radios (native arrow keys), 44px targets, checked swatch ringed.
export function ColorSwatches({ value, disabled, onChange }: ColorSwatchesProps) {
  const { t } = useI18n()
  const name = useId()
  const current = value.trim().toLowerCase()
  const isCustom = /^#[0-9a-f]{6}$/.test(current) && !(PAYMENT_METHOD_COLOR_PRESETS as readonly string[]).includes(current)
  return (
    <fieldset className="swatch-group" disabled={disabled}>
      <legend className="visually-hidden">{t('expense.methods.color')}</legend>
      <label className="swatch">
        <input type="radio" className="visually-hidden" name={name} checked={current === ''} onChange={() => onChange('')} />
        <span className="swatch-chip swatch-none" title={t('expense.methods.colorNone')}>
          <span className="visually-hidden">{t('expense.methods.colorNone')}</span>
        </span>
      </label>
      {PAYMENT_METHOD_COLOR_PRESETS.map((preset) => (
        <label key={preset} className="swatch">
          <input type="radio" className="visually-hidden" name={name} checked={current === preset} onChange={() => onChange(preset)} />
          <span className="swatch-chip" style={{ '--pm-color': preset } as CSSProperties}>
            <span className="visually-hidden">{preset}</span>
          </span>
        </label>
      ))}
      <label className="swatch swatch-custom" title={t('expense.methods.colorCustom')}>
        <input type="color" className="swatch-picker" value={isCustom ? current : '#000000'} aria-label={t('expense.methods.colorCustom')} onChange={(e) => onChange(e.target.value)} />
        <span className={isCustom ? 'swatch-chip swatch-selected' : 'swatch-chip swatch-rainbow'} style={isCustom ? ({ '--pm-color': current } as CSSProperties) : undefined} />
      </label>
    </fieldset>
  )
}
