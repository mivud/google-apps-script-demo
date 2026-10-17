import { useEffect, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
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
  onSave: (change: { added: string[]; removed: string[] }) => Promise<unknown>
  onRefresh?: () => void
}

// Checkbox list of all options with one Save button; shared by roles and claims.
export function AssignmentPanel({ options, assignedIds, emptyMessage, legend, onSave, onRefresh }: AssignmentPanelProps) {
  const { t } = useI18n()
  const assignedKey = assignedIds.join('\n')
  const [checked, setChecked] = useState(() => new Set(assignedIds))
  const save = useAsyncAction(async (change: { added: string[]; removed: string[] }) => {
    await onSave(change)
    return true
  })

  // A reload after saving (or a change elsewhere) becomes the new baseline.
  useEffect(() => { setChecked(new Set(assignedKey ? assignedKey.split('\n') : [])) }, [assignedKey])

  const assigned = new Set(assignedIds)
  const added = options.filter((option) => checked.has(option.id) && !assigned.has(option.id)).map((option) => option.id)
  const removed = options.filter((option) => !checked.has(option.id) && assigned.has(option.id)).map((option) => option.id)
  const dirty = added.length + removed.length > 0

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (dirty) await save.run({ added, removed })
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
