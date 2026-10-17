import { useI18n } from '../i18n'
import { DialogActions } from './layout'
import { LoadingButton } from './loading-button'
import { Modal } from './modal'

interface ConfirmDeleteDialogProps {
  itemName: string
  pending: boolean
  onConfirm: () => void
  onCancel: () => void
}

// While the call is pending both buttons are locked and Esc is ignored (Modal), so the outcome is never ambiguous.
export function ConfirmDeleteDialog({ itemName, pending, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  const { t } = useI18n()
  return (
    <Modal title={t('common.deleteTitle', { name: itemName })} pending={pending} onClose={onCancel}>
      <div className="dialog-body">
        <p>{t('common.deleteMessage', { name: itemName })}</p>
        <DialogActions>
          {/* Focus the safe choice first so a stray Enter does not delete. */}
          <LoadingButton variant="outline" autoFocus disabled={pending} onClick={onCancel}>{t('common.no')}</LoadingButton>
          <LoadingButton variant="destructive" loading={pending} onClick={onConfirm}>{t('common.yes')}</LoadingButton>
        </DialogActions>
      </div>
    </Modal>
  )
}
