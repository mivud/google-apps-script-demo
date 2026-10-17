import { useEffect, useState, type ReactNode } from 'react'
import { ConfirmDeleteDialog } from '../components/confirm-delete-dialog'
import { translateError, useI18n } from '../i18n'
import { useToast } from '../toast'
import { useAsyncAction } from './use-async-action'

interface DeleteActionOptions<T> {
  getName: (target: T) => string
  remove: (target: T) => Promise<unknown>
  // Runs after a successful delete, e.g. navigate away or reload the list.
  onDeleted?: (target: T) => void
}

export interface DeleteAction<T> {
  ask: (target: T) => void
  pending: boolean
  // Render once next to the trigger; empty while closed.
  dialog: ReactNode
}

// Shared delete flow: confirm dialog -> API call -> close -> success or error toast.
export function useDeleteAction<T>({ getName, remove, onDeleted }: DeleteActionOptions<T>): DeleteAction<T> {
  const { t } = useI18n()
  const toast = useToast()
  const [target, setTarget] = useState<T | undefined>(undefined)
  const action = useAsyncAction(async (item: T) => {
    await remove(item)
    return item
  })
  const { error, clearError } = action

  useEffect(() => {
    if (!error) return
    setTarget(undefined)
    toast.show(translateError(error, t), 'error')
    clearError()
  }, [error, clearError, toast, t])

  async function confirm() {
    if (target === undefined) return
    const deleted = await action.run(target)
    if (deleted === undefined) return
    setTarget(undefined)
    toast.show(t('common.deleted', { name: getName(deleted) }), 'success')
    onDeleted?.(deleted)
  }

  const dialog = target === undefined ? null : (
    <ConfirmDeleteDialog itemName={getName(target)} pending={action.pending} onConfirm={confirm} onCancel={() => setTarget(undefined)} />
  )
  return { ask: setTarget, pending: action.pending, dialog }
}
