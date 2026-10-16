// Lets the first request per key run alone, so a backend that caches per key (here: the access check of one ID token)
// answers the following requests from its cache instead of repeating the slow work in parallel.
// A failed first request only ends the wait: the others then run normally, and the next call becomes the new first.
export class WarmupGate {
  private warmKey: string | null = null
  private pendingKey: string | null = null
  private pending: Promise<void> | null = null

  async run<T>(key: string | null, task: () => Promise<T>): Promise<T> {
    if (key === null || key === this.warmKey) return task()
    if (this.pending && this.pendingKey === key) {
      await this.pending
      return task()
    }
    const first = task()
    this.pendingKey = key
    this.pending = first.then(
      () => { this.warmKey = key },
      () => { this.pending = null },
    )
    return first
  }
}
