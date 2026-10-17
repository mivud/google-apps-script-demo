import type { FixedExpenseTemplate, FixedExpenseTemplateInput, FixedExpenseTemplatePatch } from '../domain/fixed-expense-template'

export interface FixedExpenseTemplateRepository {
  list(): Promise<FixedExpenseTemplate[]>
  // monthsAdded starts at 0 and is never sent by the client.
  create(input: FixedExpenseTemplateInput): Promise<FixedExpenseTemplate>
  // A stale expectedLastModified fails with 'conflict'; totalMonths below monthsAdded with 'total_months_below_added'.
  update(id: string, patch: FixedExpenseTemplatePatch, expectedLastModified: string): Promise<FixedExpenseTemplate>
  remove(id: string): Promise<void>
}
