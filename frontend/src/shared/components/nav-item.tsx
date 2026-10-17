import { Icon } from './icon'
import type { NavItemData } from './nav-types'

export function NavItem({ label, href, icon, current }: NavItemData) {
  return (
    <a className="nav-item" href={href} aria-current={current ? 'page' : undefined}>
      <Icon name={icon} />
      <span>{label}</span>
    </a>
  )
}
