import { useState, type FormEvent } from 'react'
import type { Category, NewCategory } from '../../domain/category'
import { translateError, useI18n } from '../../../../shared/i18n'
import { selectableRootParents } from '../../domain/category-tree'
import { useCategories } from '../categories-context'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { CategorySelect } from './category-select'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { FormError } from '../../../../shared/components/form-error'
import { DialogActions } from '../../../../shared/components/layout'
import { Modal } from '../../../../shared/components/modal'
import { TextInput } from '../../../../shared/components/text-input'

interface CategoryFormDialogProps {
  // Present when editing (rename / move); absent when creating.
  initial?: Category
  // Preselected parent for "add child" and the equipment quick-create.
  initialParentId?: string
  onSubmit: (input: NewCategory) => Promise<unknown>
  onClose: () => void
}

export function CategoryFormDialog({ initial, initialParentId = '', onSubmit, onClose }: CategoryFormDialogProps) {
  const { t } = useI18n()
  const { data } = useCategories()
  const [name, setName] = useState(initial?.name ?? '')
  const [parentId, setParentId] = useState(initial?.parentId ?? initialParentId)
  const submit = useAsyncAction(onSubmit)

  // Only root categories may be parents (two-level limit); this also rules out itself and its own subtree.
  const allowedIds = new Set(selectableRootParents(data ?? [], initial?.id).map((category) => category.id))
  const excludeIds = (data ?? []).filter((category) => !allowedIds.has(category.id)).map((category) => category.id)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = await submit.run({ name, parentId })
    if (result !== undefined) onClose()
  }

  return (
    <Modal title={initial ? t('category.edit') : t('category.add')} pending={submit.pending} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TextInput label={t('category.name')} required value={name} disabled={submit.pending} onChange={(e) => setName(e.target.value)} />
        <CategorySelect label={t('category.parent')} value={parentId} onChange={setParentId} noneLabel={t('category.noParent')} excludeIds={excludeIds} disabled={submit.pending} />

        {submit.error && <FormError message={translateError(submit.error, t)} />}

        <DialogActions>
          <LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={onClose}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" loading={submit.pending}>{t('common.save')}</LoadingButton>
        </DialogActions>
      </form>
    </Modal>
  )
}
