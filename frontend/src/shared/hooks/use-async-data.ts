import { useCallback, useEffect, useState, type DependencyList } from 'react'

export interface AsyncData<T> {
  data: T | undefined
  // True during the first load and every refetch; pages show a skeleton only while there is no data yet.
  loading: boolean
  error: Error | undefined
  reload: () => void
}

// Standard way to load data in the UI so every fetch has a loading and an error state.
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: DependencyList): AsyncData<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // The previous error stays visible until the retry succeeds so the Retry button can show progress.
    fetcher()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(undefined)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason : new Error(String(reason)))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    // Ignore responses from superseded requests so a slow old call cannot overwrite a newer one.
    return () => {
      cancelled = true
    }
    // Deps are caller-provided, so exhaustive-deps cannot verify them statically.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick])

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), [])
  return { data, loading, error, reload }
}
