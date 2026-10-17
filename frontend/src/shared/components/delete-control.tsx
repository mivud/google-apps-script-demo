import { useState } from 'react'
import { useI18n } from '../i18n'
import { LoadingButton } from './loading-button'

interface DeleteControlProps {
  pending: boolean
  onConfirm: () => void
  // Accessible name for the first button, e.g. "Delete admin".
  label?: string
}

// Two-step delete so one stray tap cannot remove a record.
export function DeleteControl({ pending, onConfirm, label }: DeleteControlProps) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return <LoadingButton variant="destructive" aria-label={label} disabled={pending} onClick={() => setConfirming(true)}>{t('common.delete')}</LoadingButton>
  }
  return (
    <>
      <LoadingButton variant="destructive" loading={pending} onClick={onConfirm}>{t('common.confirmDelete')}</LoadingButton>
      <LoadingButton variant="outline" disabled={pending} onClick={() => setConfirming(false)}>{t('common.cancel')}</LoadingButton>
    </>
  )
}
