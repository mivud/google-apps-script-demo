import { useState, type FormEvent } from 'react'
import { EQUIPMENT_STATUSES, type Equipment, type NewEquipment } from '../../domain/equipment'
import { useServices } from '../services-context'
import { useCategories } from '../categories-context'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { translateError, useI18n } from '../../../../shared/i18n'
import { STATUS_LABEL_KEYS } from '../labels'
import { CategoryFormDialog } from './CategoryFormDialog'
import { CategorySelect } from './CategorySelect'
import { FormError } from '../../../../shared/components/FormError'
import { DialogActions, FieldRow } from '../../../../shared/components/Layout'
import { LoadingButton } from '../../../../shared/components/LoadingButton'
import { Modal } from '../../../../shared/components/Modal'
import { Select } from '../../../../shared/components/Select'
import { Textarea } from '../../../../shared/components/Textarea'
import { TextInput } from '../../../../shared/components/TextInput'

interface EquipmentFormDialogProps {
  initial?: Equipment
  onSubmit: (input: NewEquipment) => Promise<unknown>
  onClose: () => void
}

export function EquipmentFormDialog({ initial, onSubmit, onClose }: EquipmentFormDialogProps) {
  const [form, setForm] = useState<Omit<NewEquipment, 'quantity'>>({
    categoryId: initial?.categoryId ?? '',
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    status: initial?.status ?? 'active',
  })
  // Raw text so an empty field is reported instead of silently becoming 0.
  const [quantityText, setQuantityText] = useState(String(initial?.quantity ?? 1))
  const { t } = useI18n()
  const submit = useAsyncAction(onSubmit)
  const { categories } = useServices()
  const { reload: reloadCategories } = useCategories()
  const [addingCategory, setAddingCategory] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // NaN fails the service's integer check, which reports quantity_invalid.
    const quantity = quantityText.trim() === '' ? Number.NaN : Number(quantityText)
    const result = await submit.run({ ...form, quantity })
    // run() resolves to undefined on failure, in which case the dialog stays open with the error.
    if (result !== undefined) onClose()
  }

  const title = initial ? t('equipment.edit') : t('equipment.add')

  return (
    <Modal title={title} pending={submit.pending} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TextInput label={t('equipmentForm.name')} required value={form.name} disabled={submit.pending} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <CategorySelect
          label={t('equipmentForm.category')}
          value={form.categoryId}
          onChange={(categoryId) => setForm({ ...form, categoryId })}
          noneLabel={t('equipment.uncategorized')}
          disabled={submit.pending}
          adornment={<LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={() => setAddingCategory(true)}>{t('category.addQuick')}</LoadingButton>}
        />
        <Textarea label={t('equipmentForm.description')} rows={3} value={form.description} disabled={submit.pending} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <FieldRow>
          <Select label={t('equipmentForm.status')} value={form.status} disabled={submit.pending} onChange={(e) => setForm({ ...form, status: e.target.value as NewEquipment['status'] })}>
            {EQUIPMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{t(STATUS_LABEL_KEYS[status])}</option>
            ))}
          </Select>
          <TextInput label={t('equipmentForm.quantity')} type="number" min={0} step={1} value={quantityText} disabled={submit.pending} onChange={(e) => setQuantityText(e.target.value)} />
        </FieldRow>

        {submit.error && <FormError message={translateError(submit.error, t)} />}

        <DialogActions>
          <LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={onClose}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" loading={submit.pending}>{t('common.save')}</LoadingButton>
        </DialogActions>
      </form>
      {addingCategory && (
        <CategoryFormDialog
          initialParentId={form.categoryId}
          onSubmit={async (input) => {
            const created = await categories.create(input)
            // Select it right away; the shared list refreshes in the background.
            setForm((current) => ({ ...current, categoryId: created.id }))
            reloadCategories()
            return created
          }}
          onClose={() => setAddingCategory(false)}
        />
      )}
    </Modal>
  )
}
