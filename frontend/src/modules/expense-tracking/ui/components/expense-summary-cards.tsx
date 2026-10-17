import { useI18n } from '../../../../shared/i18n'
import { GlassSurface } from '../../../../shared/components/glass-surface'
import type { ExpenseSummary } from '../../domain/expense-summary'
import { useMoneyFormat } from '../use-money-format'

interface SummaryCardProps {
  label: string
  value: string
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <GlassSurface className="summary-card" padding="sm">
      <span className="muted">{label}</span>
      <span className="summary-card-value">{value}</span>
    </GlassSurface>
  )
}

export function ExpenseSummaryCards({ summary }: { summary: ExpenseSummary }) {
  const { t } = useI18n()
  const format = useMoneyFormat()
  return (
    <div>
      <p className="muted">{t('expense.stats.summaryScope')}</p>
      {summary.unassignedCount > 0 && <p className="form-error" role="status">{t('expense.unassignedNotice', { count: summary.unassignedCount })}</p>}
      {summary.pendingCount > 0 && <p className="form-error" role="status">{t('expense.pendingNotice', { count: summary.pendingCount })}</p>}
      <div className="summary-grid">
        <SummaryCard label={t('expense.summary.total')} value={format(summary.total)} />
        <SummaryCard label={t('expense.summary.fixed')} value={format(summary.fixedTotal)} />
        <SummaryCard label={t('expense.summary.variable')} value={format(summary.variableTotal)} />
      </div>
    </div>
  )
}
