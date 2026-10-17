import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { useAsyncAction } from '../hooks/use-async-action'
import { EmptyState } from './empty-state'
import { LoadingButton } from './loading-button'
import { Select } from './select'
import { SurfaceList, SurfaceListItem } from './surface-list'
import { ActionError } from './action-error'

export interface AssignmentItem {
  id: string
  label: string
}

interface AssignmentPanelProps {
  items: AssignmentItem[]
  // Items that can still be added.
  options: AssignmentItem[]
  emptyMessage: string
  selectLabel: string
  onAdd: (id: string) => Promise<unknown>
  onRemove: (id: string) => Promise<unknown>
  onRefresh?: () => void
}

// Lists assigned items with remove buttons and a picker to add more; shared by roles and claims.
export function AssignmentPanel({ items, options, emptyMessage, selectLabel, onAdd, onRemove, onRefresh }: AssignmentPanelProps) {
  const { t } = useI18n()
  const [selected, setSelected] = useState('')
  const change = useAsyncAction(async (work: () => Promise<unknown>) => {
    await work()
    return true
  })

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    const done = await change.run(() => onAdd(selected))
    if (done) setSelected('')
  }

  return (
    <>
      {items.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <SurfaceList>
          {items.map((item) => (
            <SurfaceListItem
              key={item.id}
              actions={
                <LoadingButton variant="outline" size="sm" disabled={change.pending} aria-label={t('identity.assign.removeNamed', { name: item.label })} onClick={() => change.run(() => onRemove(item.id))}>
                  {t('common.delete')}
                </LoadingButton>
              }
            >
              <strong>{item.label}</strong>
            </SurfaceListItem>
          ))}
        </SurfaceList>
      )}

      {options.length === 0 ? (
        <p className="muted">{t('identity.assign.noneAvailable')}</p>
      ) : (
        <form onSubmit={handleAdd}>
          <div className="assign-row">
            <Select label={selectLabel} value={selected} disabled={change.pending} onChange={(e) => setSelected(e.target.value)}>
              <option value="">{t('identity.choose')}</option>
              {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </Select>
            <LoadingButton type="submit" loading={change.pending} disabled={!selected}>{t('identity.assign.add')}</LoadingButton>
          </div>
        </form>
      )}
      <ActionError error={change.error} onRefresh={onRefresh} />
    </>
  )
}
