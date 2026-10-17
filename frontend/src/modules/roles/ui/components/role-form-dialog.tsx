import { useState, type FormEvent } from 'react'
import { useI18n } from '../../../../shared/i18n'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { ActionError } from '../../../../shared/components/action-error'
import { DialogActions } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { Modal } from '../../../../shared/components/modal'
import { Textarea } from '../../../../shared/components/textarea'
import { TextInput } from '../../../../shared/components/text-input'
import type { Role, RoleInput } from '../..'
import { isBuiltInRole } from '../role-rules'

interface RoleFormDialogProps {
  // Present when editing; absent when creating.
  initial?: Role
  onSubmit: (input: RoleInput) => Promise<unknown>
  onClose: () => void
  // Offered on a concurrency conflict; the page reloads and closes the dialog.
  onRefresh?: () => void
}

export function RoleFormDialog({ initial, onSubmit, onClose, onRefresh }: RoleFormDialogProps) {
  const { t } = useI18n()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const submit = useAsyncAction(async (input: RoleInput) => {
    await onSubmit(input)
    return true
  })
  const nameLocked = !!initial && isBuiltInRole(initial.name)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (await submit.run({ name: name.trim(), description: description.trim() })) onClose()
  }

  return (
    <Modal title={initial ? t('identity.roles.edit') : t('identity.roles.add')} pending={submit.pending} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TextInput label={t('identity.roles.name')} required maxLength={32} autoComplete="off" value={name} disabled={submit.pending || nameLocked} onChange={(e) => setName(e.target.value)} />
        <p className="muted">{t('identity.roles.nameHint')}</p>
        <Textarea label={t('identity.roles.description')} maxLength={200} rows={3} value={description} disabled={submit.pending} onChange={(e) => setDescription(e.target.value)} />
        <ActionError error={submit.error} onRefresh={onRefresh} />
        <DialogActions>
          <LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={onClose}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" loading={submit.pending}>{t('common.save')}</LoadingButton>
        </DialogActions>
      </form>
    </Modal>
  )
}
