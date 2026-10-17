import { ALL_VALUE, TOGGLE_ON, type ChoiceFilter, type FilterDefinition, type ToggleFilter } from '../table-filters'
import { CheckSegments, RadioSegments } from './segment-group'
import { RichSelect } from './rich-select'
import { Select } from './select'

interface FilterControlsProps<T> {
  definitions: readonly FilterDefinition<T>[]
  values: Record<string, string>
  toggleGroupLabel: string
  onChange: (key: string, value: string) => void
}

function SelectControl<T>({ definition, value, onChange }: { definition: ChoiceFilter<T>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="filter-control filter-select">
      {definition.renderOption ? (
        <RichSelect label={definition.label} hideLabel value={value} options={definition.options} onChange={onChange} renderOption={definition.renderOption} />
      ) : (
        <Select label={definition.label} hideLabel value={value} onChange={(e) => onChange(e.target.value)}>
          {definition.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      )}
    </div>
  )
}

export function hasChoiceFilters<T>(definitions: readonly FilterDefinition<T>[]): boolean {
  return definitions.some((definition) => definition.kind !== 'select')
}

// Row A: the select filters, in config order, next to the search field.
export function SelectFilters<T>({ definitions, values, onChange }: Omit<FilterControlsProps<T>, 'toggleGroupLabel'>) {
  return (
    <>
      {definitions.map((definition) => definition.kind !== 'select' ? null : (
        <SelectControl key={definition.key} definition={definition} value={values[definition.key] ?? ALL_VALUE} onChange={(value) => onChange(definition.key, value)} />
      ))}
    </>
  )
}

// Row B: radio groups in config order, then all toggles together in one checkbox group.
export function ChoiceFilters<T>({ definitions, values, toggleGroupLabel, onChange }: FilterControlsProps<T>) {
  const toggles = definitions.filter((definition): definition is ToggleFilter<T> => definition.kind === 'toggle')
  return (
    <>
      {definitions.map((definition) => definition.kind !== 'radio' ? null : (
        <div key={definition.key} className="filter-control filter-group">
          <RadioSegments label={definition.label} options={definition.options} value={values[definition.key] ?? ALL_VALUE} onChange={(value) => onChange(definition.key, value)} />
        </div>
      ))}
      {toggles.length > 0 && (
        <div className="filter-control filter-group">
          <CheckSegments label={toggleGroupLabel} items={toggles.map((toggle) => ({ key: toggle.key, label: toggle.label, checked: values[toggle.key] === TOGGLE_ON }))} onChange={(key, checked) => onChange(key, checked ? TOGGLE_ON : ALL_VALUE)} />
        </div>
      )}
    </>
  )
}
