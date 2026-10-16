import type { MouseEventHandler, ReactNode, Ref } from 'react'
import { useI18n } from '../i18n'
import { NavItem } from './nav-item'
import type { NavItemData } from './nav-types'
import { SettingsMenu } from './settings-menu'
import { TabBar } from './tab-bar'

interface AppShellProps {
  title: string
  navItems: NavItemData[]
  mainRef: Ref<HTMLElement>
  onSkipToContent: MouseEventHandler<HTMLAnchorElement>
  children: ReactNode
}

export function AppShell({ title, navItems, mainRef, onSkipToContent, children }: AppShellProps) {
  const { t } = useI18n()
  return (
    <>
      <a className="skip-link" href="#main" onClick={onSkipToContent}>{t('app.skipToContent')}</a>
      <header className="app-header">
        <div className="app-header-inner">
          <p className="app-title">{title}</p>
          <nav className="app-nav" aria-label={t('nav.main')}>
            {navItems.map((item) => <NavItem key={item.href} {...item} />)}
          </nav>
          <SettingsMenu />
        </div>
      </header>
      <main className="container app-main" id="main" tabIndex={-1} ref={mainRef}>{children}</main>
      <TabBar items={navItems} label={t('nav.main')} />
    </>
  )
}
