import { useMemo } from 'react'
import { Tabs } from '../../../../shared/components/tabs'
import { useI18n } from '../../../../shared/i18n'
import type { Expense } from '../../domain/expense'
import { summarizeExpenses } from '../../domain/expense-summary'
import type { PaymentMethod } from '../../domain/payment-method'
import { ExpenseSummaryCards } from './expense-summary-cards'
import { SpendingChart } from './spending-chart'

interface ExpenseStatisticsProps {
  // Every expense of the month: the summary ignores search and filters.
  monthExpenses: readonly Expense[]
  // The rows the table shows: the chart follows them.
  visibleExpenses: readonly Expense[]
  methods: readonly PaymentMethod[]
}

// One card, two scopes: whole-month figures and the filtered chart, each captioned inside its tab.
export function ExpenseStatistics({ monthExpenses, visibleExpenses, methods }: ExpenseStatisticsProps) {
  const { t } = useI18n()
  const summary = useMemo(() => summarizeExpenses(monthExpenses), [monthExpenses])
  return (
    <section className="surface surface-pad stats-card" aria-label={t('expense.stats.title')}>
      <h2 className="chart-title">{t('expense.stats.title')}</h2>
      <Tabs
        label={t('expense.stats.title')}
        tabs={[
          { id: 'summary', label: t('expense.stats.summaryTab'), content: <ExpenseSummaryCards summary={summary} /> },
          { id: 'methods', label: t('expense.stats.methodTab'), content: <SpendingChart expenses={visibleExpenses} methods={methods} /> },
        ]}
      />
    </section>
  )
}
