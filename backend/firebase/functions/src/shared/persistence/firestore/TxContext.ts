import type { Firestore, Query, Transaction } from 'firebase-admin/firestore';
import type { RequestContext } from '../../context/RequestContext';

export type Filter = readonly [field: string, value: string | number | boolean | null];

// One Firestore transaction. Reads run at once, writes are queued and applied by flush() after the work
// ends, so "all reads before writes" always holds and a retried transaction starts clean.
export class TxContext {
  private readonly writes: Array<(tx: Transaction) => void> = [];

  constructor(
    private readonly db: Firestore,
    private readonly tx: Transaction,
    readonly request: RequestContext,
  ) {}

  async get<T>(collection: string, id: string): Promise<T | null> {
    const snapshot = await this.tx.get(this.db.collection(collection).doc(id));
    return snapshot.exists ? (snapshot.data() as T) : null;
  }

  async find<T>(collection: string, filters: readonly Filter[] = [], limit?: number): Promise<T[]> {
    let query: Query = this.db.collection(collection);
    for (const [field, value] of filters) query = query.where(field, '==', value);
    if (limit !== undefined) query = query.limit(limit);
    const snapshot = await this.tx.get(query);
    return snapshot.docs.map((doc) => doc.data() as T);
  }

  set(collection: string, id: string, data: object): void {
    this.writes.push((tx) => tx.set(this.db.collection(collection).doc(id), data));
  }

  remove(collection: string, id: string): void {
    this.writes.push((tx) => tx.delete(this.db.collection(collection).doc(id)));
  }

  flush(): void {
    this.writes.forEach((write) => write(this.tx));
  }
}

export function runInTransaction<T>(
  db: Firestore,
  request: RequestContext,
  work: (ctx: TxContext) => Promise<T>,
): Promise<T> {
  return db.runTransaction(async (tx) => {
    const ctx = new TxContext(db, tx, request);
    const result = await work(ctx);
    ctx.flush();
    return result;
  });
}
