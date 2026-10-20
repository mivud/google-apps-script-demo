import { useI18n } from '../../../../shared/i18n'
import { Badge, type BadgeTone } from '../../../../shared/components/badge'
import { Icon, type IconName } from '../../../../shared/components/icon'
import type { Expense, PaymentAlert } from '../../domain/expense'
import { PAYMENT_STATUS_MESSAGE, paymentStatusKey, type PaymentStatusKey } from '../payment-status'

interface PaymentStatusCellProps {
  expense: Expense
  alert: PaymentAlert
}

const TONE: Record<PaymentStatusKey, BadgeTone> = { paid: 'success', unpaid: 'neutral', overdue: 'danger', dueSoon: 'danger' }
// Icons keep the alert readable without colour.
const ICON: Partial<Record<PaymentStatusKey, IconName>> = { paid: 'check', overdue: 'alert', dueSoon: 'alert' }

// Read-only: the paid flag is changed from the edit dialog.
export function PaymentStatusCell({ expense, alert }: PaymentStatusCellProps) {
  const { t } = useI18n()
  if (!expense.isFixed) return <>—</>
  const status = paymentStatusKey(expense, alert)
  const icon = ICON[status]
  return (
    <span className="payment-status">
      <Badge tone={TONE[status]}>{icon && <Icon name={icon} />}{t(PAYMENT_STATUS_MESSAGE[status])}</Badge>
    </span>
  )
}
