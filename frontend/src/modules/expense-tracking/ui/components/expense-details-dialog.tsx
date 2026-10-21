import { useI18n } from '../../../../shared/i18n'
import { AuditDetails } from '../../../../shared/components/audit-details'
import { Badge } from '../../../../shared/components/badge'
import { DescriptionList } from '../../../../shared/components/description-list'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { Modal } from '../../../../shared/components/modal'
import { DialogActions } from '../../../../shared/components/layout'
import type { Expense, PaymentAlert } from '../../domain/expense'
import type { PaymentMethod } from '../../domain/payment-method'
import { PAYMENT_STATUS_MESSAGE, paymentStatusKey } from '../payment-status'
import { PaymentMethodBadgeById } from './payment-method-badge'

interface ExpenseDetailsDialogProps {
  expense: Expense
  methods: PaymentMethod[]
  alert: PaymentAlert
  formatAmount: (amount: number) => string
  // Omitted when the user cannot write, which hides the edit button.
  onEdit?: () => void
  onClose: () => void
}

// Read-only view of every field of one expense, including the ones the table does not show.
export function ExpenseDetailsDialog({ expense, methods, alert, formatAmount, onEdit, onClose }: ExpenseDetailsDialogProps) {
  const { t } = useI18n()
  const dash = '-'
  const items = [
    { label: t('expense.description'), value: expense.description },
    { label: t('expense.type'), value: <Badge tone={expense.isFixed ? 'warning' : 'neutral'}>{expense.isFixed ? t('expense.fixedBadge') : t('expense.variableBadge')}</Badge> },
    { label: t('expense.amount'), value: expense.amount === null ? t('expense.amountNeeded') : formatAmount(expense.amount) },
    { label: t('expense.paymentMethod'), value: expense.paymentMethodId === null ? t('expense.methodNeeded') : <PaymentMethodBadgeById id={expense.paymentMethodId} methods={methods} /> },
    { label: t('expense.spentOn'), value: expense.spentOn || dash },
    { label: t('expense.statementMonth'), value: expense.statementMonth || dash },
    ...(expense.isFixed ? [{ label: t('expense.payment.title'), value: t(PAYMENT_STATUS_MESSAGE[paymentStatusKey(expense, alert)]) }] : []),
  ]
  return (
    <Modal title={t('expense.details')} onClose={onClose}>
      <div className="dialog-body">
        <DescriptionList items={items} />
        <AuditDetails audit={expense} />
        <DialogActions>
          {onEdit && <LoadingButton type="button" variant="outline" onClick={onEdit}>{t('common.edit')}</LoadingButton>}
          <LoadingButton type="button" onClick={onClose}>{t('common.close')}</LoadingButton>
        </DialogActions>
      </div>
    </Modal>
  )
}
