import { useMemo } from 'react'
import { DonutChart, type DonutItem } from '../../../../shared/components/donut-chart'
import { useI18n } from '../../../../shared/i18n'
import type { Expense } from '../../domain/expense'
import { summarizeExpenses } from '../../domain/expense-summary'
import type { PaymentMethod } from '../../domain/payment-method'
import { useMoneyFormat } from '../use-money-format'

// Only four hues validate as a set when any two slices may touch (see design-system.md); the rest fold into "Other".
const COLOR_SLOTS = 4
const OTHER_KEY = 'other'
const NO_METHOD_KEY = 'none'

// Follows the rows the table shows (search and every filter), unlike the month totals above it.
export function SpendingChart({ expenses, methods }: { expenses: readonly Expense[]; methods: readonly PaymentMethod[] }) {
  const { t } = useI18n()
  const format = useMoneyFormat()
  const summary = useMemo(() => summarizeExpenses(expenses), [expenses])
  const items = useMemo(() => {
    // A method keeps its slot by position in the payment methods list, whatever is visible or large.
    const slotOf = new Map(methods.slice(0, COLOR_SLOTS).map((method, index) => [method.id, index + 1]))
    const nameOf = (id: string) => methods.find((method) => method.id === id)?.name ?? id
    const slotted: DonutItem[] = []
    const other: DonutItem = { key: OTHER_KEY, label: t('expense.chart.other'), value: 0, count: 0, members: [] }
    let none: DonutItem | undefined
    for (const bucket of summary.byPaymentMethod) {
      if (bucket.paymentMethodId === null) {
        none = { key: NO_METHOD_KEY, label: t('expense.noPaymentMethod'), value: bucket.total, count: bucket.count }
        continue
      }
      const slot = slotOf.get(bucket.paymentMethodId)
      if (slot === undefined) {
        other.value += bucket.total
        other.count += bucket.count
        other.members = [...(other.members ?? []), nameOf(bucket.paymentMethodId)]
        continue
      }
      slotted.push({ key: bucket.paymentMethodId, label: nameOf(bucket.paymentMethodId), value: bucket.total, count: bucket.count, colorIndex: slot })
    }
    slotted.sort((a, b) => (a.colorIndex ?? 0) - (b.colorIndex ?? 0))
    return [...slotted, ...(other.value > 0 ? [other] : []), ...(none ? [none] : [])]
  }, [summary, methods, t])
  return (
    <DonutChart
      title={t('expense.chart.title')}
      caption={t('expense.chart.caption')}
      items={items}
      formatValue={format}
      totalLabel={t('chart.total')}
      labelHeader={t('expense.paymentMethod')}
      valueHeader={t('expense.amount')}
      countHeader={t('expense.chart.count')}
      emptyMessage={t('expense.chart.empty')}
      note={summary.pendingCount > 0 ? t('expense.pendingNotice', { count: summary.pendingCount }) : undefined}
    />
  )
}
