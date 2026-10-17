import { useEffect, useId, useRef } from 'react'
import { useI18n } from '../../../../shared/i18n'
import { Icon } from '../../../../shared/components/icon'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { currentStatementMonth, shiftStatementMonth, splitStatementMonth } from '../../domain/statement-month'

const LOCALES = { en: 'en-US', vi: 'vi-VN' } as const
const PREVIOUS = -1
const NEXT = 1

interface MonthPickerProps {
  // Statement month, 'YYYY-MM'.
  month: string
  // Locked while the month data loads so rapid clicks cannot queue stale requests.
  disabled: boolean
  onChange: (month: string) => void
}

export function MonthPicker({ month, disabled, onChange }: MonthPickerProps) {
  const { t, language } = useI18n()
  const captionId = useId()
  const lastPressed = useRef<HTMLButtonElement | null>(null)
  const thisMonth = currentStatementMonth()
  const { year, month: monthNumber } = splitStatementMonth(month)
  const monthName = new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString(LOCALES[language] ?? LOCALES.en, { month: 'long', timeZone: 'UTC' })

  // A disabled button drops focus, so give it back to the pressed control once loading ends.
  useEffect(() => {
    if (!disabled) lastPressed.current?.focus()
  }, [disabled])

  function go(target: string, button: HTMLButtonElement) {
    lastPressed.current = button
    onChange(target)
  }

  return (
    <div className="month-picker" role="group" aria-labelledby={captionId}>
      <span id={captionId} className="month-picker-caption muted">{t('expense.month.label')}</span>
      <div className="month-picker-row">
        <LoadingButton type="button" size="icon" variant="outline" disabled={disabled} aria-label={t('expense.month.prev')} onClick={(e) => go(shiftStatementMonth(month, PREVIOUS), e.currentTarget)}><Icon name="back" /></LoadingButton>
        <span className="month-picker-label" aria-live="polite">{t('expense.month.display', { month: language === 'vi' ? String(monthNumber) : monthName, year })}</span>
        <LoadingButton type="button" size="icon" variant="outline" disabled={disabled} aria-label={t('expense.month.next')} onClick={(e) => go(shiftStatementMonth(month, NEXT), e.currentTarget)}><Icon name="chevron" /></LoadingButton>
        <LoadingButton type="button" variant="outline" disabled={disabled || month === thisMonth} onClick={(e) => go(thisMonth, e.currentTarget)}>{t('expense.month.thisMonth')}</LoadingButton>
      </div>
    </div>
  )
}
