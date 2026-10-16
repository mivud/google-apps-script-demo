import type { ReactNode } from 'react'

export interface DescriptionItem {
  label: string
  value: ReactNode
}

export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    <dl className="description-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
