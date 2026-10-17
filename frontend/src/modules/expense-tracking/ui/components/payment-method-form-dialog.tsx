import { useState, type FormEvent } from 'react'
import { ValidationError } from '../../../../shared/errors'
import { translateError, useI18n } from '../../../../shared/i18n'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { ActionError } from '../../../../shared/components/action-error'
import { DialogActions } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { Modal } from '../../../../shared/components/modal'
import { TextInput } from '../../../../shared/components/text-input'
import { MAX_CLOSING_DAY, MIN_CLOSING_DAY, PAYMENT_METHOD_ID_MAX_LENGTH, type NewPaymentMethod, type PaymentMethod } from '../../domain/payment-method'
import { ColorSwatches } from './color-swatches'
import { PaymentMethodBadge } from './payment-method-badge'
import { fieldOf } from '../payment-method-field-errors'

interface PaymentMethodFormDialogProps {
  // Present when editing: the id is then read-only.
  initial?: PaymentMethod
  // Ids already loaded on the page, for a fast duplicate message before the server answers.
  existingIds?: string[]
  onSubmit: (input: NewPaymentMethod) => Promise<unknown>
  onClose: () => void
  onRefresh?: () => void
}

export function PaymentMethodFormDialog({ initial, existingIds = [], onSubmit, onClose, onRefresh }: PaymentMethodFormDialogProps) {
  const { t } = useI18n()
  const [id, setId] = useState(initial?.id ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [active, setActive] = useState(initial?.active ?? true)
  const [colorText, setColorText] = useState(initial?.color ?? '')
  const [closingDay, setClosingDay] = useState(initial?.statementClosingDay == null ? '' : String(initial.statementClosingDay))
  const [localError, setLocalError] = useState<ValidationError | undefined>(undefined)
  const submit = useAsyncAction(async (input: NewPaymentMethod) => {
    await onSubmit(input)
    return true
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedId = id.trim()
    if (!initial && existingIds.includes(trimmedId)) {
      setLocalError(new ValidationError(undefined, 'payment_method_id_taken'))
      return
    }
    setLocalError(undefined)
    if (await submit.run({ id: trimmedId, name, active, statementClosingDay: closingDay.trim() === '' ? null : Number(closingDay), color: colorText.trim() === '' ? null : colorText })) onClose()
  }

  const error = localError ?? submit.error
  const field = fieldOf(error)
  const fieldMessage = (target: 'id' | 'name' | 'closingDay' | 'color') => (field === target && error ? translateError(error, t) : undefined)

  return (
    <Modal title={initial ? t('expense.methods.edit') : t('expense.methods.add')} pending={submit.pending} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TextInput label={t('expense.methods.id')} required maxLength={PAYMENT_METHOD_ID_MAX_LENGTH} autoComplete="off" autoCapitalize="none" spellCheck={false} value={id} readOnly={!!initial} disabled={submit.pending} error={fieldMessage('id')} onChange={(e) => setId(e.target.value)} />
        {!initial && <p className="muted">{t('expense.methods.idHint')}</p>}
        <TextInput label={t('expense.methods.name')} required maxLength={100} autoComplete="off" value={name} disabled={submit.pending} error={fieldMessage('name')} onChange={(e) => setName(e.target.value)} />
        <TextInput label={t('expense.methods.closingDay')} type="number" inputMode="numeric" min={MIN_CLOSING_DAY} max={MAX_CLOSING_DAY} step={1} value={closingDay} disabled={submit.pending} error={fieldMessage('closingDay')} onChange={(e) => setClosingDay(e.target.value)} />
        <p className="muted">{t('expense.methods.closingDayHint')}</p>
        <ColorSwatches value={colorText} disabled={submit.pending} onChange={setColorText} />
        <TextInput
          label={t('expense.methods.color')}
          placeholder="#RRGGBB"
          maxLength={7}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={colorText}
          disabled={submit.pending}
          error={fieldMessage('color')}
          onChange={(e) => setColorText(e.target.value)}
        />
        <p className="pm-preview"><PaymentMethodBadge name={name.trim() === '' ? t('expense.methods.name') : name.trim()} color={colorText.trim().toLowerCase()} /></p>
        <label className="checkbox-item">
          <input type="checkbox" checked={active} disabled={submit.pending} onChange={(e) => setActive(e.target.checked)} />
          {t('expense.active')}
        </label>
        {field === undefined && <ActionError error={error} onRefresh={onRefresh} />}
        <DialogActions>
          <LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={onClose}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" loading={submit.pending}>{t('common.save')}</LoadingButton>
        </DialogActions>
      </form>
    </Modal>
  )
}
