import { useState } from 'react'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useDeleteAction } from '../../../../shared/hooks/use-delete-action'
import { translateError, useI18n } from '../../../../shared/i18n'
import { useToast } from '../../../../shared/toast'
import { useReloadAction } from '../../../../shared/hooks/use-reload-action'
import { ALL_VALUE, type DataTableToolbar, type FilterDefinition } from '../../../../shared/table-filters'
import { Badge } from '../../../../shared/components/badge'
import { DataTable, type DataColumn } from '../../../../shared/components/data-table'
import { EmptyState } from '../../../../shared/components/empty-state'
import { ErrorState } from '../../../../shared/components/error-state'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { RowActions } from '../../../../shared/components/row-actions'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import { getPaymentAlert, isPaid, type Expense } from '../../domain/expense'
import { currentStatementMonth } from '../../domain/statement-month'
import { ExpenseFormDialog } from '../components/expense-form-dialog'
import { PaymentMethodBadgeById } from '../components/payment-method-badge'
import { ExpenseStatistics } from '../components/expense-statistics'
import { PaymentStatusCell } from '../components/payment-status-cell'
import { PAYMENT_STATUS_MESSAGE, paymentStatusKey } from '../payment-status'
import { PendingField } from '../components/pending-field'
import { MonthPicker } from '../components/month-picker'
import { useExpenseTrackingServices } from '../services-context'
import { useCanWriteExpenses } from '../use-can-write-expenses'
import { useMoneyFormat } from '../use-money-format'

// Filter value for rows created by nobody known (import or empty); an e-mail never starts with a tilde.
const UNKNOWN_CREATOR = '~unknown'
const IMPORT_CREATOR = 'import'

function creatorKey(expense: Expense): string {
  const creator = expense.createdBy.trim()
  return creator === '' || creator === IMPORT_CREATOR ? UNKNOWN_CREATOR : creator
}

// Filter value for expenses without a payment method; the tilde cannot appear in a real id.
const NO_PAYMENT_METHOD = '~none'

function todayIsoDate(): string {
  const now = new Date()
  return `${currentStatementMonth(now)}-${String(now.getDate()).padStart(2, '0')}`
}

export function ExpensesPage() {
  const { expenses, paymentMethods, templates } = useExpenseTrackingServices()
  const { t } = useI18n()
  const toast = useToast()
  const canWrite = useCanWriteExpenses()
  const format = useMoneyFormat()
  const [month, setMonth] = useState(currentStatementMonth)
  const [focusField, setFocusField] = useState<'amount' | 'paymentMethod' | undefined>(undefined)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Expense | undefined>(undefined)
  // The month travels with the data so a month switch shows the skeleton instead of the previous month.
  const list = useAsyncData(async () => ({ month, items: await expenses.listByStatementMonth(month) }), [expenses, month])
  const rows = list.data?.month === month ? list.data.items : undefined
  const monthLoading = list.loading && !rows
  const methods = useAsyncData(() => paymentMethods.list(), [paymentMethods])
  const templateList = useAsyncData(() => templates.list(), [templates])
  const reloadAction = useReloadAction(list, { onReload: () => { list.reload(); methods.reload(); templateList.reload() }, loading: list.loading || methods.loading || templateList.loading })
  // Read once per render so every row of one paint is judged against the same day.
  const today = todayIsoDate()
  const alertOf = (e: Expense) => getPaymentAlert(e, (templateList.data ?? []).find((x) => x.id === e.templateId) ?? null, today)
  const remove = useDeleteAction({
    getName: (expense: Expense) => expense.description,
    remove: (expense) => expenses.remove(expense.id),
    onDeleted: () => list.reload(),
  })
  const generate = useAsyncAction(() => expenses.generateFixed(month))


  async function handleGenerate() {
    const result = await generate.run()
    if (!result) return
    toast.show(t('expense.generated', { created: result.created.length, skipped: result.skipped }), 'success')
    list.reload()
  }

  // A failed run keeps its error in the hook state and is shown inline until the next attempt.
  const generateFailed = generate.error ? translateError(generate.error, t) : undefined

  function openEditor(expense: Expense, field: 'amount' | 'paymentMethod' | undefined) {
    setFocusField(field)
    setEditing(expense)
  }

  const columns: DataColumn<Expense>[] = [
    { key: 'description', header: t('expense.description'), primary: true, cell: (e) => e.description, exportValue: (e) => e.description },
    { key: 'amount', header: t('expense.amount'), cell: (e) => (e.amount === null ? <PendingField label={t('expense.amountNeeded')} canWrite={canWrite} onFill={() => openEditor(e, 'amount')} /> : format(e.amount)), exportValue: (e) => e.amount },
    { key: 'method', header: t('expense.paymentMethod'), cell: (e) => (e.paymentMethodId === null ? <PendingField label={t('expense.methodNeeded')} canWrite={canWrite} onFill={() => openEditor(e, 'paymentMethod')} /> : <PaymentMethodBadgeById id={e.paymentMethodId} methods={methods.data ?? []} />), exportValue: (e) => (methods.data ?? []).find((m) => m.id === e.paymentMethodId)?.name ?? '' },
    { key: 'spentOn', header: t('expense.spentOn'), cell: (e) => e.spentOn, exportValue: (e) => e.spentOn },
    { key: 'type', header: t('expense.type'), cell: (e) => <Badge tone={e.isFixed ? 'warning' : 'neutral'}>{e.isFixed ? t('expense.fixedBadge') : t('expense.variableBadge')}</Badge>, exportValue: (e) => (e.isFixed ? t('expense.fixedBadge') : t('expense.variableBadge')) },
    { key: 'createdBy', header: t('expense.createdBy'), cell: (e) => creatorLabel(creatorKey(e)), exportValue: (e) => creatorLabel(creatorKey(e)) },
    { key: 'payment', header: t('expense.payment.title'), cell: (e) => <PaymentStatusCell expense={e} alert={alertOf(e)} />, exportValue: (e) => (e.isFixed ? t(PAYMENT_STATUS_MESSAGE[paymentStatusKey(e, alertOf(e))]) : '') },
    ...(canWrite ? [{ key: 'actions', header: t('common.actions'), align: 'end' as const, cell: (e: Expense) => <RowActions itemName={e.description} disabled={remove.pending} onEdit={() => openEditor(e, undefined)} onDelete={() => remove.ask(e)} /> }] : []),
  ]

  const creators = [...new Set((rows ?? []).map(creatorKey))].sort((a, b) => a.localeCompare(b))
  const creatorLabel = (key: string) => (key === UNKNOWN_CREATOR ? t('expense.createdByUnknown') : key)
  const filters: FilterDefinition<Expense>[] = [
    { key: 'method', label: t('expense.paymentMethod'), kind: 'select', renderOption: (option) => (option.value === ALL_VALUE || option.value === NO_PAYMENT_METHOD ? <span>{option.label}</span> : <PaymentMethodBadgeById id={option.value} methods={methods.data ?? []} />), options: [{ value: ALL_VALUE, label: t('expense.filter.allMethods') }, { value: NO_PAYMENT_METHOD, label: t('expense.noPaymentMethod') }, ...(methods.data ?? []).map((method) => ({ value: method.id, label: method.name }))], predicate: (e, v) => (v === NO_PAYMENT_METHOD ? e.paymentMethodId === null : e.paymentMethodId === v) },
    { key: 'createdBy', label: t('expense.createdBy'), kind: 'select', options: [{ value: ALL_VALUE, label: t('expense.filter.anyone') }, ...creators.map((key) => ({ value: key, label: creatorLabel(key) }))], predicate: (e, v) => creatorKey(e) === v },
    { key: 'type', label: t('expense.type'), kind: 'radio', options: [{ value: ALL_VALUE, label: t('expense.filter.allTypes') }, { value: 'fixed', label: t('expense.fixedBadge') }, { value: 'variable', label: t('expense.variableBadge') }], predicate: (e, v) => e.isFixed === (v === 'fixed') },
    { key: 'needsAmount', label: t('expense.filter.needsAmount'), kind: 'toggle', predicate: (e) => e.amount === null },
    { key: 'needsMethod', label: t('expense.filter.needsMethod'), kind: 'toggle', predicate: (e) => e.paymentMethodId === null },
    { key: 'needsPayment', label: t('expense.filter.needsPayment'), kind: 'toggle', predicate: (e) => alertOf(e) !== 'none' },
  ]
  const toolbar: DataTableToolbar<Expense> = { searchLabel: t('expense.search'), searchFields: (e) => [e.description], filters, itemsName: t('expense.items'), toggleGroupLabel: t('expense.filter.attention'), urlSync: true, exportFileName: 'expenses', renderAbove: (visible) => <ExpenseStatistics monthExpenses={rows ?? []} visibleExpenses={visible} methods={methods.data ?? []} />, actions: [reloadAction] }

  const dialogProps = { methods: methods.data ?? [], defaultMonth: month, today: todayIsoDate() }

  return (
    <section>
      <PageHeader
        title={t('expense.month.title')}
        actions={canWrite ? (
          <>
            <LoadingButton variant="outline" loading={generate.pending} disabled={!methods.data} onClick={handleGenerate}>{t('expense.generate')}</LoadingButton>
            <LoadingButton disabled={!methods.data} onClick={() => setCreating(true)}>{t('expense.add')}</LoadingButton>
          </>
        ) : undefined}
      />
      <MonthPicker month={month} disabled={monthLoading} onChange={setMonth} />
      {generateFailed && <p className="form-error" role="alert">{generateFailed}</p>}
      <RefreshIndicator active={list.loading && !!list.data} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !rows ? (
        <ListSkeleton count={4} />
      ) : (
        <>
          {rows.length === 0 ? (
            <EmptyState icon="list" message={t('expense.month.empty')} />
          ) : (
            <DataTable caption={t('expense.month.title')} columns={columns} rows={rows} toolbar={toolbar} getRowKey={(e) => e.id} refreshing={list.loading} />
          )}
        </>
      )}
      {remove.dialog}

      {editing && (
        <ExpenseFormDialog
          {...dialogProps}
          initial={editing}
          focusField={focusField}
          onSubmit={async (input, paid) => {
            try {
              const updated = await expenses.update(editing.id, input, editing.lastModified)
              // Only a changed flag costs a second call; the update has already saved the other fields.
              if (editing.isFixed && paid !== isPaid(editing)) return await expenses.setPaid(editing.id, paid)
              return updated
            } finally {
              list.reload()
            }
          }}
          onRefresh={() => { list.reload(); setEditing(undefined) }}
          onClose={() => setEditing(undefined)}
        />
      )}
      {creating && (
        <ExpenseFormDialog
          {...dialogProps}
          onSubmit={async (input) => {
            const created = await expenses.create(input)
            // An expense billed to another month is not in this list; follow it so the user sees the result.
            if (input.statementMonth === month) list.reload()
            else setMonth(input.statementMonth ?? month)
            return created
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  )
}
