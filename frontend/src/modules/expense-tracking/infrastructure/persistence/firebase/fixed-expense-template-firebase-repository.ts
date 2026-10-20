import type { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import { ascending, sortRows } from '../../../../../shared/api/firebase-row-order'
import type { FixedExpenseTemplateRepository } from '../../../application/fixed-expense-template-repository'
import type { FixedExpenseTemplate, FixedExpenseTemplateInput, FixedExpenseTemplatePatch } from '../../../domain/fixed-expense-template'
import { rowToTemplate, templatePatchToRow, type FixedExpenseTemplateRow } from '../fixed-expense-template-rows'
import { EXPENSE_COLLECTIONS, FIXED_TEMPLATE_ACTIONS } from './firebase-api-actions'

export class FixedExpenseTemplateFirebaseRepository implements FixedExpenseTemplateRepository {
  private readonly caller: FirebaseCaller

  constructor(caller: FirebaseCaller) {
    this.caller = caller
  }

  async list(): Promise<FixedExpenseTemplate[]> {
    const rows = await this.caller.rows(EXPENSE_COLLECTIONS.templates)
    return sortRows(rows, ascending('description'), ascending('id')).map((row) => rowToTemplate(row as unknown as FixedExpenseTemplateRow))
  }

  async create(input: FixedExpenseTemplateInput): Promise<FixedExpenseTemplate> {
    return rowToTemplate(await this.caller.call<FixedExpenseTemplateRow>(FIXED_TEMPLATE_ACTIONS.create, templatePatchToRow(input)))
  }

  async update(id: string, patch: FixedExpenseTemplatePatch, expectedLastModified: string): Promise<FixedExpenseTemplate> {
    const payload = { id, ...templatePatchToRow(patch), expected_last_modified: expectedLastModified }
    return rowToTemplate(await this.caller.call<FixedExpenseTemplateRow>(FIXED_TEMPLATE_ACTIONS.update, payload))
  }

  async remove(id: string): Promise<void> {
    await this.caller.call<unknown>(FIXED_TEMPLATE_ACTIONS.remove, { id })
  }
}
