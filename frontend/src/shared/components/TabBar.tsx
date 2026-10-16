import { NavItem } from './NavItem'
import type { NavItemData } from './nav-types'

// Mobile navigation; hidden from 768px up where the header nav takes over.
export function TabBar({ items, label }: { items: NavItemData[]; label: string }) {
  return (
    <nav className="tab-bar" aria-label={label}>
      {items.map((item) => <NavItem key={item.href} {...item} />)}
    </nav>
  )
}
