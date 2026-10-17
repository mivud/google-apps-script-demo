import { useState, type FormEvent } from 'react'
import { ActionError } from '../../../../shared/components/action-error'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { useI18n } from '../../../../shared/i18n'
import { DialogActions } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { Modal } from '../../../../shared/components/modal'
import { Select } from '../../../../shared/components/select'
import { TextInput } from '../../../../shared/components/text-input'
import type { User, UserUpdateInput } from '../..'

interface UserFormDialogProps {
  // Present when editing; absent when creating (roles are assigned on the detail page).
  initial?: User
  onSubmit: (input: UserUpdateInput) => Promise<unknown>
  onClose: () => void
  onRefresh?: () => void
}

export function UserFormDialog({ initial, onSubmit, onClose, onRefresh }: UserFormDialogProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState(initial?.email ?? '')
  const [active, setActive] = useState(initial?.active ?? true)
  const submit = useAsyncAction(async (input: UserUpdateInput) => {
    await onSubmit(input)
    return true
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (await submit.run({ email: email.trim(), active })) onClose()
  }

  return (
    <Modal title={initial ? t('identity.users.edit') : t('identity.users.add')} pending={submit.pending} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TextInput label={t('identity.users.email')} type="email" required maxLength={254} autoComplete="off" value={email} disabled={submit.pending} onChange={(e) => setEmail(e.target.value)} />
        <Select label={t('identity.users.activeLabel')} value={active ? 'true' : 'false'} disabled={submit.pending} onChange={(e) => setActive(e.target.value === 'true')}>
          <option value="true">{t('identity.active')}</option>
          <option value="false">{t('identity.inactive')}</option>
        </Select>
        <ActionError error={submit.error} onRefresh={onRefresh} />
        <DialogActions>
          <LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={onClose}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" loading={submit.pending}>{t('common.save')}</LoadingButton>
        </DialogActions>
      </form>
    </Modal>
  )
}
