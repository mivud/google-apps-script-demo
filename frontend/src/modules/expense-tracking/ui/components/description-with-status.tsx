import { useI18n } from '../../../../shared/i18n'
import { Icon, type IconName } from '../../../../shared/components/icon'
import type { Expense, PaymentAlert } from '../../domain/expense'
import { PAYMENT_STATUS_MESSAGE, paymentStatusKey, type PaymentStatusKey } from '../payment-status'

interface DescriptionWithStatusProps {
  expense: Expense
  alert: PaymentAlert
}

// Plain unpaid has no icon; only paid and the alerts are marked.
const ICON: Partial<Record<PaymentStatusKey, IconName>> = { paid: 'check', overdue: 'alert', dueSoon: 'alert' }

// The status is only a coloured icon before the text; the hidden label keeps it available to screen readers.
export function DescriptionWithStatus({ expense, alert }: DescriptionWithStatusProps) {
  const { t } = useI18n()
  const status = paymentStatusKey(expense, alert)
  const icon = ICON[status]
  return (
    <span className="description-status">
      {icon && (
        <span className={status === 'paid' ? 'status-icon status-icon-paid' : 'status-icon status-icon-unpaid'} aria-hidden="true">
          <Icon name={icon} />
        </span>
      )}
      <span className="visually-hidden">{t(PAYMENT_STATUS_MESSAGE[status])}: </span>
      {expense.description}
    </span>
  )
}
