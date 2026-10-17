import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { diffAssignment, hasChanges, type AssignmentChange } from '../assignment-change'
import { useAsyncAction } from '../hooks/use-async-action'
import { ActionError } from './action-error'
import { EmptyState } from './empty-state'
import { ButtonRow } from './layout'
import { LoadingButton } from './loading-button'

export interface AssignmentItem {
  id: string
  label: string
}

interface AssignmentPanelProps {
  // Every item that can be assigned; the checked ones are the current assignment.
  options: AssignmentItem[]
  assignedIds: string[]
  emptyMessage: string
  legend: string
  // Receives only the difference, so the caller can apply additions before removals.
  onSave: (change: AssignmentChange) => Promise<unknown>
  onRefresh?: () => void
}

// Checkbox list of all options with one Save button; shared by roles and claims.
export function AssignmentPanel({ options, assignedIds, emptyMessage, legend, onSave, onRefresh }: AssignmentPanelProps) {
  const { t } = useI18n()
  const assignedKey = assignedIds.join('\n')
  const [checked, setChecked] = useState(() => new Set(assignedIds))
  const [baselineKey, setBaselineKey] = useState(assignedKey)
  const save = useAsyncAction(async (change: AssignmentChange) => {
    await onSave(change)
    return true
  })

  // A reload after saving (or a change elsewhere) becomes the new baseline; adjusted during render, not in an effect.
  if (baselineKey !== assignedKey) {
    setBaselineKey(assignedKey)
    setChecked(new Set(assignedIds))
  }

  const change = diffAssignment(options.map((option) => option.id), assignedIds, checked)
  const dirty = hasChanges(change)

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (dirty) await save.run(change)
  }

  if (options.length === 0) return <EmptyState message={emptyMessage} />

  return (
    <form onSubmit={handleSave}>
      <fieldset className="checkbox-list" disabled={save.pending}>
        <legend className="visually-hidden">{legend}</legend>
        {options.map((option) => (
          <label key={option.id} className="checkbox-item">
            <input type="checkbox" checked={checked.has(option.id)} onChange={() => toggle(option.id)} />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      <ButtonRow>
        <LoadingButton type="submit" loading={save.pending} disabled={!dirty}>{t('common.save')}</LoadingButton>
      </ButtonRow>
      <ActionError error={save.error} onRefresh={onRefresh} />
    </form>
  )
}
