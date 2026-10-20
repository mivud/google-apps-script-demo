import { stampAudit, type AuditStyle } from '../../audit/AuditStyle';
import type { Filter, TxContext } from './TxContext';

// Generic repository for one collection. save() plays the role of the Supabase audit trigger: it stamps
// the audit fields from the request context and keeps the original creation fields on update.
export class AuditedCollection<T extends object, A extends object> {
  constructor(
    private readonly ctx: TxContext,
    private readonly name: string,
    private readonly style: AuditStyle,
    private readonly idOf: (row: T) => string,
  ) {}

  get(id: string): Promise<(T & A) | null> {
    return this.ctx.get<T & A>(this.name, id);
  }

  find(filters: readonly Filter[] = [], limit?: number): Promise<Array<T & A>> {
    return this.ctx.find<T & A>(this.name, filters, limit);
  }

  async save(row: T): Promise<T & A> {
    const id = this.idOf(row);
    const previous = await this.ctx.get<Record<string, unknown>>(this.name, id);
    const stored = { ...row, ...stampAudit(this.style, previous, this.ctx.request) } as T & A;
    this.ctx.set(this.name, id, stored);
    return stored;
  }

  remove(id: string): void {
    this.ctx.remove(this.name, id);
  }
}
