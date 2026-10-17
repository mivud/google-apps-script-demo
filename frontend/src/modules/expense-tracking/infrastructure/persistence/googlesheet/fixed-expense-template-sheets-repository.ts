import type { SheetsCaller } from '../../../../../shared/api/sheets-caller'
import type { FixedExpenseTemplateRepository } from '../../../application/fixed-expense-template-repository'
import type { FixedExpenseTemplate, FixedExpenseTemplateInput, FixedExpenseTemplatePatch } from '../../../domain/fixed-expense-template'
import { rowsToTemplates, rowToTemplate, templatePatchToRow, type FixedExpenseTemplateRow } from '../fixed-expense-template-rows'
import { FIXED_TEMPLATE_ACTIONS } from './api-actions'

export class FixedExpenseTemplateSheetsRepository implements FixedExpenseTemplateRepository {
  private readonly caller: SheetsCaller

  constructor(caller: SheetsCaller) {
    this.caller = caller
  }

  async list(): Promise<FixedExpenseTemplate[]> {
    return rowsToTemplates(await this.caller.call<{ items: unknown }>(FIXED_TEMPLATE_ACTIONS.list, {}))
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
