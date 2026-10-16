import type { ReactNode } from 'react'
import { useI18n } from '../../../../shared/i18n'
import { useCategories } from '../categories-context'
import { ErrorState } from '../../../../shared/components/ErrorState'
import { Select } from '../../../../shared/components/Select'

interface CategorySelectProps {
  label: string
  value: string
  onChange: (id: string) => void
  // Label of the empty choice, e.g. "Uncategorized" or "No parent".
  noneLabel: string
  // Ids that cannot be chosen (a category and its descendants when picking a parent).
  excludeIds?: readonly string[]
  disabled?: boolean
  hideLabel?: boolean
  adornment?: ReactNode
}

// A native <select> listing the tree depth-first with full paths ("Parent › Child"): it is keyboard and
// screen-reader accessible out of the box and gives mobile users the OS picker, so no custom widget is needed.
export function CategorySelect({ label, value, onChange, noneLabel, excludeIds = [], disabled = false, hideLabel, adornment }: CategorySelectProps) {
  const { t } = useI18n()
  const { flat, data, loading, error, reload } = useCategories()
  const options = flat.filter((row) => !excludeIds.includes(row.category.id))
  const known = !value || options.some((row) => row.category.id === value)

  return (
    <>
      <Select
        label={label}
        hideLabel={hideLabel}
        adornment={adornment}
        value={value}
        disabled={disabled || (loading && !data)}
        aria-busy={loading}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{noneLabel}</option>
        {/* Keeps the current value selectable while the list is still loading or after the category vanished. */}
        {!known && <option value={value}>{loading ? t('common.loading') : t('category.unknown')}</option>}
        {options.map((row) => (
          <option key={row.category.id} value={row.category.id}>{row.path}</option>
        ))}
      </Select>
      {error && <ErrorState error={error} onRetry={reload} retrying={loading} />}
    </>
  )
}
