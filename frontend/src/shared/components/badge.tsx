import type { ReactNode } from 'react'

export type BadgeTone = 'success' | 'warning' | 'neutral' | 'danger'

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
