import { rowToAudit, type AuditRow } from '../../../../shared/audit'
import { NetworkError } from '../../../../shared/errors'
import { toNullableInteger } from './expense-rows'
import { isPaymentMethodColor } from '../../domain/payment-method'
import type { PaymentMethod, PaymentMethodInput } from '../../domain/payment-method'

export interface PaymentMethodRow extends AuditRow {
  id: string
  name: string
  active: boolean
  statement_closing_day?: number | string | null
  color?: string | null
}

export function rowToPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  if (!row || typeof row.id !== 'string' || typeof row.name !== 'string') throw new NetworkError()
  return { id: row.id, name: row.name, active: row.active === true, statementClosingDay: toNullableInteger(row.statement_closing_day), color: typeof row.color === 'string' && isPaymentMethodColor(row.color) ? row.color : null, ...rowToAudit(row) }
}

export function rowsToPaymentMethods(data: { items?: unknown } | null | undefined): PaymentMethod[] {
  if (!data || !Array.isArray(data.items)) throw new NetworkError()
  return (data.items as PaymentMethodRow[]).map(rowToPaymentMethod)
}

export function paymentMethodPatchToRow(patch: Partial<PaymentMethodInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.active !== undefined) row.active = patch.active
  if (patch.statementClosingDay !== undefined) row.statement_closing_day = patch.statementClosingDay
  if (patch.color !== undefined) row.color = patch.color
  return row
}
