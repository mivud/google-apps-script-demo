import { useCallback, useState } from 'react'

export interface AsyncAction<A extends unknown[], R> {
  run: (...args: A) => Promise<R | undefined>
  pending: boolean
  error: Error | undefined
  clearError: () => void
}

// Standard way to run a write action: exposes `pending` for LoadingButton and keeps the error for display.
export function useAsyncAction<A extends unknown[], R>(action: (...args: A) => Promise<R>): AsyncAction<A, R> {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)

  const run = useCallback(
    async (...args: A) => {
      setPending(true)
      setError(undefined)
      try {
        return await action(...args)
      } catch (reason) {
        setError(reason instanceof Error ? reason : new Error(String(reason)))
        return undefined
      } finally {
        setPending(false)
      }
    },
    [action],
  )

  const clearError = useCallback(() => setError(undefined), [])
  return { run, pending, error, clearError }
}
