import type { FixedExpenseTemplate, FixedExpenseTemplateInput, FixedExpenseTemplatePatch } from '../domain/fixed-expense-template'
import { validateTemplateInput, validateTemplatePatch } from '../domain/fixed-expense-template'
import type { FixedExpenseTemplateRepository } from './fixed-expense-template-repository'

export class FixedExpenseTemplateService {
  private readonly repository: FixedExpenseTemplateRepository

  constructor(repository: FixedExpenseTemplateRepository) {
    this.repository = repository
  }

  list(): Promise<FixedExpenseTemplate[]> {
    return this.repository.list()
  }

  async create(input: FixedExpenseTemplateInput): Promise<FixedExpenseTemplate> {
    return this.repository.create(validateTemplateInput(input))
  }

  async update(id: string, patch: FixedExpenseTemplatePatch, expectedLastModified: string): Promise<FixedExpenseTemplate> {
    return this.repository.update(id, validateTemplatePatch(patch), expectedLastModified)
  }

  remove(id: string): Promise<void> {
    return this.repository.remove(id)
  }
}
