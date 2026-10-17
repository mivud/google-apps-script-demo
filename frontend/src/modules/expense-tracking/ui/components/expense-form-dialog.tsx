import { useState, type FormEvent } from 'react'
import { useI18n } from '../../../../shared/i18n'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { ActionError } from '../../../../shared/components/action-error'
import { DialogActions, FieldRow } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { Modal } from '../../../../shared/components/modal'
import { AmountInput } from '../../../../shared/components/amount-input'
import { TextInput } from '../../../../shared/components/text-input'
import type { Expense, ExpenseInput } from '../../domain/expense'
import type { PaymentMethod } from '../../domain/payment-method'
import { resolveStatementMonth } from '../../domain/statement-month'
import { PaymentMethodSelect } from './payment-method-select'

interface ExpenseFormDialogProps {
  // Present when editing; absent when creating.
  initial?: Expense
  methods: PaymentMethod[]
  // Pre-fills the statement month of a new expense with the month being viewed.
  defaultMonth: string
  today: string
  // Field to focus on open, for pending rows that only miss one value.
  focusField?: 'amount' | 'paymentMethod'
  onSubmit: (input: ExpenseInput) => Promise<unknown>
  onClose: () => void
  // Offered on a concurrency conflict; the page reloads and closes the dialog.
  onRefresh?: () => void
}

export function ExpenseFormDialog({ initial, methods, defaultMonth, today, focusField, onSubmit, onClose, onRefresh }: ExpenseFormDialogProps) {
  const { t } = useI18n()
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState<number | null>(initial?.amount ?? null)
  const [paymentMethodId, setPaymentMethodId] = useState(initial?.paymentMethodId ?? '')
  const [spentOn, setSpentOn] = useState(initial?.spentOn ?? today)
  const [statementMonth, setStatementMonth] = useState(initial?.statementMonth ?? defaultMonth)
  // Once the user types a month, date and method changes stop recomputing it.
  const [overridden, setOverridden] = useState(false)
  const submit = useAsyncAction(async (input: ExpenseInput) => {
    await onSubmit(input)
    return true
  })

  function refreshAutoMonth(nextSpentOn: string, nextMethodId: string) {
    if (overridden || !nextSpentOn) return
    const closingDay = methods.find((method) => method.id === nextMethodId)?.statementClosingDay ?? null
    setStatementMonth(resolveStatementMonth(nextSpentOn, closingDay))
  }

  function changeSpentOn(value: string) {
    setSpentOn(value)
    refreshAutoMonth(value, paymentMethodId)
  }

  function changePaymentMethod(id: string) {
    setPaymentMethodId(id)
    refreshAutoMonth(spentOn, id)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input = { description, amount: amount ?? Number.NaN, paymentMethodId, spentOn, statementMonth }
    if (await submit.run(input)) onClose()
  }

  return (
    <Modal title={initial ? t('expense.edit') : t('expense.add')} pending={submit.pending} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <TextInput label={t('expense.description')} required maxLength={200} autoComplete="off" value={description} disabled={submit.pending} onChange={(e) => setDescription(e.target.value)} />
        <FieldRow>
          <PaymentMethodSelect methods={methods} value={paymentMethodId} disabled={submit.pending} onChange={changePaymentMethod} autoFocus={focusField === 'paymentMethod'} />
          <AmountInput label={t('expense.amount')} autoFocus={focusField === 'amount'} required value={amount} disabled={submit.pending} onChange={setAmount} />
        </FieldRow>
        <FieldRow>
          <TextInput label={t('expense.spentOn')} type="date" required value={spentOn} disabled={submit.pending} onChange={(e) => changeSpentOn(e.target.value)} />
          <TextInput label={t('expense.statementMonth')} type="month" required value={statementMonth} disabled={submit.pending} onChange={(e) => { setOverridden(true); setStatementMonth(e.target.value) }} />
        </FieldRow>
        {!overridden && <p className="muted" aria-live="polite">{t('expense.statementMonthAuto', { month: statementMonth })}</p>}
        <ActionError error={submit.error} onRefresh={onRefresh} />
        <DialogActions>
          <LoadingButton type="button" variant="outline" disabled={submit.pending} onClick={onClose}>{t('common.cancel')}</LoadingButton>
          <LoadingButton type="submit" loading={submit.pending}>{t('common.save')}</LoadingButton>
        </DialogActions>
      </form>
    </Modal>
  )
}
