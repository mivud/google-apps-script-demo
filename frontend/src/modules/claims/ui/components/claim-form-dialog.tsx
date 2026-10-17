import { useState, type FormEvent } from 'react'
import { useI18n } from '../../../../shared/i18n'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { ActionError } from '../../../../shared/components/action-error'
import { DialogActions } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { Modal } from '../../../../shared/components/modal'
import { TextInput } from '../../../../shared/components/text-input'
import type { Claim } from '../..'

interface ClaimFormDialogProps {
  onSubmit: (claim: Claim) => Promise<unknown>
  onClose: () => void
}

export function ClaimFormDialog({ onSubmit, onClose }: ClaimFormDialogProps) {
  const { t } = useI18n()
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const submit = useAsyncAction(async (claim: Claim) => {
    await onSubmit(claim)
    return true
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (await submit.run({ key: key.trim(), value: value.trim() })) onClose()
  }

  return (
    <Modal title={t('identity.claims.add')} pending={submit.pending} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TextInput label={t('identity.claims.key')} required maxLength={64} autoComplete="off" value={key} disabled={submit.pending} onChange={(e) => setKey(e.target.value)} />
        <TextInput label={t('identity.claims.value')} required maxLength={200} autoComplete="off" value={value} disabled={submit.pending} onChange={(e) => setValue(e.target.value)} />
        <ActionError error={submit.error} />
        <DialogActions>
          <LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={onClose}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" loading={submit.pending}>{t('common.save')}</LoadingButton>
        </DialogActions>
      </form>
    </Modal>
  )
}
