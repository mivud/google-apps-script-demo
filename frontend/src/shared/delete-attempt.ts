export type DeleteAttempt<T> = { ok: true; item: T } | { ok: false; failure: Error }

// Turns a failed delete into a value so the caller can toast it without watching an error state.
export async function attemptDelete<T>(remove: (item: T) => Promise<unknown>, item: T): Promise<DeleteAttempt<T>> {
  try {
    await remove(item)
    return { ok: true, item }
  } catch (reason) {
    return { ok: false, failure: reason instanceof Error ? reason : new Error(String(reason)) }
  }
}
