import type { RequestContext } from '../../../shared/context/RequestContext';
import { rule } from '../../../shared/errors/DomainError';
import { nameBasedUuid } from '../../../shared/id/DeterministicId';
import type { Expense, StoredExpense } from '../domain/Expense';
import { isDue } from '../domain/FixedExpenseTemplate';
import { dueDate, parseStatementMonth } from '../domain/StatementMonth';
import type { ExpenseStore } from './ExpenseStore';

// A Firestore transaction holds at most 500 writes (one expense and one counter bump per template).
const MAX_TEMPLATES_PER_RUN = 240;

export interface GenerateFixedResult {
  items: StoredExpense[];
  skipped: number;
}

// Creates the missing fixed expenses of a month and bumps months_added in the same transaction.
// The expense id is derived from (template, month), so a repeated or concurrent run can never duplicate.
export class GenerateFixedExpenses {
  constructor(private readonly store: ExpenseStore) {}

  execute(request: RequestContext, monthInput: unknown): Promise<GenerateFixedResult> {
    const month = parseStatementMonth(monthInput);
    return this.store.run(request, async (tx) => {
      const active = await tx.templates.listActive();
      const due = active.filter(isDue);
      if (due.length > MAX_TEMPLATES_PER_RUN) throw rule('limit_exceeded');

      const items: StoredExpense[] = [];
      for (const template of due) {
        const id = nameBasedUuid(`${template.id}:${month}`);
        if (await tx.expenses.get(id)) continue;
        const expense: Expense = {
          id,
          description: template.description,
          amount: template.amount,
          payment_method_id: template.payment_method_id,
          spent_on: dueDate(month, template.payment_day),
          statement_month: month,
          is_fixed: true,
          template_id: template.id,
          paid_at: null,
        };
        items.push(await tx.expenses.save(expense));
        await tx.templates.save({ ...template, months_added: template.months_added + 1 });
      }
      return { items, skipped: active.length - items.length };
    });
  }
}
