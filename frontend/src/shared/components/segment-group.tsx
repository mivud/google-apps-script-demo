import { useId } from 'react'
import type { FilterOption } from '../table-filters'

interface RadioSegmentsProps {
  label: string
  options: readonly FilterOption[]
  value: string
  onChange: (value: string) => void
}

// One joined segmented control backed by real radio inputs: native arrow-key and Space behavior.
export function RadioSegments({ label, options, value, onChange }: RadioSegmentsProps) {
  const name = useId()
  return (
    <fieldset className="segment-group">
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className="segment">
          <input type="radio" className="visually-hidden" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

interface CheckSegmentsProps {
  label: string
  items: readonly { key: string; label: string; checked: boolean }[]
  onChange: (key: string, checked: boolean) => void
}

// Independent flags as checkboxes styled like segments, in one block with a visible caption.
export function CheckSegments({ label, items, onChange }: CheckSegmentsProps) {
  return (
    <fieldset className="segment-group">
      <legend className="visually-hidden">{label}</legend>
      <span className="segment-caption" aria-hidden="true">{label}</span>
      {items.map((item) => (
        <label key={item.key} className="segment">
          <input type="checkbox" className="visually-hidden" checked={item.checked} onChange={(e) => onChange(item.key, e.target.checked)} />
          <span>{item.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
