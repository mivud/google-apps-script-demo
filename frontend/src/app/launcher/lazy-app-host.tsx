import { Suspense, lazy, useMemo, useState } from 'react'
import { Spinner } from '../../shared/components/spinner'
import type { AppDeps } from '../app-deps'
import type { AppDefinition } from './app-definition'
import { LoadErrorBoundary } from './load-error-boundary'

interface LazyAppHostProps {
  app: AppDefinition
  deps: AppDeps
}

export function LazyAppHost({ app, deps }: LazyAppHostProps) {
  // React.lazy caches a rejected import forever, so a retry needs a fresh lazy component.
  const [attempt, setAttempt] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const Component = useMemo(() => lazy(app.load), [app, attempt])

  return (
    <LoadErrorBoundary key={attempt} onRetry={() => setAttempt((value) => value + 1)}>
      <Suspense fallback={<div className="app-loading"><Spinner /></div>}>
        <Component deps={deps} />
      </Suspense>
    </LoadErrorBoundary>
  )
}
