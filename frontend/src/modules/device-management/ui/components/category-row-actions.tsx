import type { Category } from '../../domain/category'
import { Icon, type IconName } from '../../../../shared/components/icon'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { useI18n } from '../../../../shared/i18n'

interface CategoryRowActionsProps {
  category: Category
  canAddChild: boolean
  pending: boolean
  onAddChild: () => void
  onEdit: () => void
  onAskDelete: () => void
}

// Icon-only on desktop (label stays for screen readers); labelled on mobile.
function ActionLabel({ icon, text }: { icon: IconName; text: string }) {
  return (
    <>
      <Icon name={icon} />
      <span className="tree-action-label">{text}</span>
    </>
  )
}

export function CategoryRowActions(props: CategoryRowActionsProps) {
  const { category, pending } = props
  const { t } = useI18n()
  const addName = t('category.addChildTo', { name: category.name })
  const editName = t('category.editNamed', { name: category.name })
  const deleteName = t('category.deleteNamed', { name: category.name })

  return (
    <>
      {props.canAddChild && (
        <LoadingButton size="sm" variant="outline" title={addName} aria-label={addName} disabled={pending} onClick={props.onAddChild}>
          <ActionLabel icon="plus" text={t('category.addChild')} />
        </LoadingButton>
      )}
      <LoadingButton size="sm" variant="outline" title={editName} aria-label={editName} disabled={pending} onClick={props.onEdit}>
        <ActionLabel icon="edit" text={t('common.edit')} />
      </LoadingButton>
      <LoadingButton size="sm" variant="destructive" title={deleteName} aria-label={deleteName} disabled={pending} onClick={props.onAskDelete}>
        <ActionLabel icon="trash" text={t('common.delete')} />
      </LoadingButton>
    </>
  )
}
