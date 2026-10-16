import type { ReactNode } from 'react'

// Thin layout wrappers so pages never carry layout class names.
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filters">{children}</div>
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="button-row">{children}</div>
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="dialog-actions">{children}</div>
}
