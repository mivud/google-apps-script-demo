import { useI18n } from '../i18n'
import { Icon } from './icon'
import { SearchInput } from './search-input'

interface ClearableSearchProps {
  label: string
  value: string
  onChange: (value: string) => void
}

// Search box with a clear button; Escape also clears, like native search inputs.
export function ClearableSearch({ label, value, onChange }: ClearableSearchProps) {
  const { t } = useI18n()
  return (
    <div className="search-clearable">
      <SearchInput label={label} placeholder={label} value={value} autoComplete="off" onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onChange('') }} />
      {value !== '' && (
        <button type="button" className="search-clear" aria-label={t('table.clearSearch')} onClick={() => onChange('')}><Icon name="close" /></button>
      )}
    </div>
  )
}
