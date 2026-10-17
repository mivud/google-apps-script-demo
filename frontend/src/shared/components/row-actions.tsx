import { useI18n } from '../i18n'
import { Icon } from './icon'
import { LoadingButton } from './loading-button'

interface RowActionsProps {
  itemName: string
  onEdit: () => void
  // Omitted for protected items, e.g. built-in roles.
  onDelete?: () => void
  disabled?: boolean
}

// Edit | Delete icon buttons (accessible name in aria-label) for the actions column of a table row; no menu to open first.
export function RowActions({ itemName, onEdit, onDelete, disabled = false }: RowActionsProps) {
  const { t } = useI18n()
  return (
    <div className="row-actions">
      <LoadingButton size="icon" variant="outline" disabled={disabled} aria-label={`${t('common.edit')}: ${itemName}`} onClick={onEdit}><Icon name="edit" /></LoadingButton>
      {onDelete && <LoadingButton size="icon" variant="destructive" disabled={disabled} aria-label={`${t('common.delete')}: ${itemName}`} onClick={onDelete}><Icon name="trash" /></LoadingButton>}
    </div>
  )
}
