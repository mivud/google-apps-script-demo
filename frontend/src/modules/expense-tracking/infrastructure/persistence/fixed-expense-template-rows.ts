import { rowToAudit, type AuditRow } from '../../../../shared/audit'
import { NetworkError } from '../../../../shared/errors'
import type { FixedExpenseTemplate, FixedExpenseTemplatePatch } from '../../domain/fixed-expense-template'
import { toNonNegativeInteger, toNullableInteger } from './expense-rows'

export interface FixedExpenseTemplateRow extends AuditRow {
  id: string
  description: string
  amount: number | string | null
  payment_method_id: string | null
  active: boolean
  total_months: number | string | null
  months_added: number | string
}

export function rowToTemplate(row: FixedExpenseTemplateRow): FixedExpenseTemplate {
  const valid = row && typeof row.id === 'string' && typeof row.description === 'string'
  if (!valid) throw new NetworkError()
  return {
    id: row.id,
    description: row.description,
    amount: toNullableInteger(row.amount) || null,
    paymentMethodId: row.payment_method_id || null,
    active: row.active === true,
    totalMonths: toNullableInteger(row.total_months) || null,
    monthsAdded: toNonNegativeInteger(row.months_added),
    ...rowToAudit(row),
  }
}

export function rowsToTemplates(data: { items?: unknown } | null | undefined): FixedExpenseTemplate[] {
  if (!data || !Array.isArray(data.items)) throw new NetworkError()
  return (data.items as FixedExpenseTemplateRow[]).map(rowToTemplate)
}

// months_added is server-owned and never part of the payload.
export function templatePatchToRow(patch: FixedExpenseTemplatePatch): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.description !== undefined) row.description = patch.description
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.paymentMethodId !== undefined) row.payment_method_id = patch.paymentMethodId
  if (patch.active !== undefined) row.active = patch.active
  if (patch.totalMonths !== undefined) row.total_months = patch.totalMonths
  return row
}
