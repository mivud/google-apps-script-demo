import { Link } from 'react-router'
import { Icon } from './icon'
import type { NavItemData } from './nav-types'

export function NavItem({ label, to, icon, current }: NavItemData) {
  return (
    <Link className="nav-item" to={to} aria-current={current ? 'page' : undefined}>
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  )
}
