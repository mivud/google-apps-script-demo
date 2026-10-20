import { useState, type FormEvent } from 'react'
import { useI18n } from '../../../../shared/i18n'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { ActionError } from '../../../../shared/components/action-error'
import { DialogActions, FieldRow } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { Modal } from '../../../../shared/components/modal'
import { AmountInput } from '../../../../shared/components/amount-input'
import { TextInput } from '../../../../shared/components/text-input'
import { assertTotalMonthsCoverAdded, validatePaymentDay, type FixedExpenseTemplate, type FixedExpenseTemplateInput } from '../../domain/fixed-expense-template'
import type { PaymentMethod } from '../../domain/payment-method'
import { PaymentMethodSelect } from './payment-method-select'

interface TemplateFormDialogProps {
  initial?: FixedExpenseTemplate
  methods: PaymentMethod[]
  onSubmit: (input: FixedExpenseTemplateInput) => Promise<unknown>
  onClose: () => void
  onRefresh?: () => void
}

export function TemplateFormDialog({ initial, methods, onSubmit, onClose, onRefresh }: TemplateFormDialogProps) {
  const { t } = useI18n()
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState<number | null>(initial?.amount ?? null)
  const [paymentMethodId, setPaymentMethodId] = useState(initial?.paymentMethodId ?? '')
  const [totalMonths, setTotalMonths] = useState(initial?.totalMonths ? String(initial.totalMonths) : '')
  const [paymentDay, setPaymentDay] = useState(initial?.paymentDay ? String(initial.paymentDay) : '')
  const [active, setActive] = useState(initial?.active ?? true)
  const submit = useAsyncAction(async (input: FixedExpenseTemplateInput) => {
    // Fail fast with the same code the backend raises; monthsAdded is server-owned and only read here.
    // Empty means no fixed day; Number('') would be 0, so the empty case is handled before parsing.
    validatePaymentDay(input.paymentDay)
    if (initial) assertTotalMonthsCoverAdded(input.totalMonths, initial.monthsAdded)
    await onSubmit(input)
    return true
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input = { description, amount: amount || null, paymentMethodId: paymentMethodId || null, active, totalMonths: Number(totalMonths) || null, paymentDay: paymentDay.trim() === '' ? null : Number(paymentDay) }
    if (await submit.run(input)) onClose()
  }

  return (
    <Modal title={initial ? t('expense.templates.edit') : t('expense.templates.add')} pending={submit.pending} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TextInput label={t('expense.description')} required maxLength={200} autoComplete="off" value={description} disabled={submit.pending} onChange={(e) => setDescription(e.target.value)} />
        <FieldRow>
          <AmountInput label={t('expense.amount')} value={amount} disabled={submit.pending} onChange={setAmount} />
          <PaymentMethodSelect methods={methods} value={paymentMethodId} disabled={submit.pending} onChange={setPaymentMethodId} emptyLabel={t('expense.templates.noFixedMethod')} />
        </FieldRow>
        <p className="muted">{t('expense.templates.amountHint')}</p>
        <p className="muted">{t('expense.templates.methodHint')}</p>
        <TextInput label={t('expense.templates.totalMonths')} type="number" inputMode="numeric" min={0} step={1} value={totalMonths} disabled={submit.pending} onChange={(e) => setTotalMonths(e.target.value)} />
        <p className="muted">{t('expense.templates.totalMonthsHint')}</p>
        <TextInput label={t('expense.paymentDay')} type="number" inputMode="numeric" min={1} max={31} step={1} value={paymentDay} disabled={submit.pending} onChange={(e) => setPaymentDay(e.target.value)} />
        <p className="muted">{t('expense.templates.paymentDayHint')}</p>
        <label className="checkbox-item">
          <input type="checkbox" checked={active} disabled={submit.pending} onChange={(e) => setActive(e.target.checked)} />
          {t('expense.active')}
        </label>
        <ActionError error={submit.error} onRefresh={onRefresh} />
        <DialogActions>
          <LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={onClose}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" loading={submit.pending}>{t('common.save')}</LoadingButton>
        </DialogActions>
      </form>
    </Modal>
  )
}
