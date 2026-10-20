import type { IdentityAudit } from '../../../shared/audit/AuditStyle';
import { validation } from '../../../shared/errors/DomainError';
import { parseDateOnly } from '../../../shared/validation/Values';
import { parseAmount, parseDescription, parseOptionalId } from './FixedExpenseTemplate';
import { parseStatementMonth } from './StatementMonth';

export interface Expense {
  id: string;
  description: string;
  amount: number | null;
  payment_method_id: string | null;
  spent_on: string;
  statement_month: string;
  is_fixed: boolean;
  template_id: string | null;
  paid_at: string | null;
}
export type StoredExpense = Expense & IdentityAudit;

type Input = Record<string, unknown>;
const has = (input: Input, key: string): boolean => Object.prototype.hasOwnProperty.call(input, key);

function parseFlag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw validation('invalid_request');
  return value;
}

// Fields a client may send. paid_at and template_id are server-owned and never read here.
export interface ExpenseDraft {
  description: string;
  amount: number | null;
  paymentMethodId: string | null;
  spentOn: string;
  statementMonth: string | null;
  isFixed: boolean;
}

// Only template-generated rows may be pending (null amount); a set amount can never be cleared again.
function buildAmount(existing: Expense | null, input: Input): number | null {
  if (!existing) return parseAmount(input.amount, false);
  if (!has(input, 'amount')) return existing.amount;
  return parseAmount(input.amount, existing.template_id !== null && existing.amount === null);
}

export function buildExpenseDraft(existing: Expense | null, input: Input): ExpenseDraft {
  return {
    description: has(input, 'description') || !existing ? parseDescription(input.description) : existing.description,
    amount: buildAmount(existing, input),
    paymentMethodId: has(input, 'payment_method_id') ? parseOptionalId(input.payment_method_id) : existing?.payment_method_id ?? null,
    spentOn: has(input, 'spent_on') || !existing ? parseDateOnly(input.spent_on, 'spent_on_invalid') : existing.spent_on,
    statementMonth: has(input, 'statement_month') ? parseStatementMonth(input.statement_month) : existing?.statement_month ?? null,
    isFixed: has(input, 'is_fixed') ? parseFlag(input.is_fixed) : existing?.is_fixed ?? false,
  };
}

// Rules the Postgres guard triggers enforce: a payment method is required (and never cleared) unless the row
// comes from a template; only fixed expenses can be paid.
export function assertExpenseInvariants(next: Expense, existing: Expense | null): void {
  const fromTemplate = next.template_id !== null;
  const clearedMethod = existing?.payment_method_id != null && next.payment_method_id === null;
  if (next.payment_method_id === null && (!fromTemplate || clearedMethod)) {
    throw validation('expense_payment_method_required');
  }
  if (next.paid_at !== null && !next.is_fixed) throw validation('expense_not_fixed');
}
