import { AppShell } from '../../shared/components/app-shell'
import { EmptyState } from '../../shared/components/empty-state'
import type { NavItemData } from '../../shared/components/nav-types'
import { PageHeader } from '../../shared/components/page-header'
import { useI18n } from '../../shared/i18n'
import { CurrentUserBadge, UserMenu, useSession } from '../../modules/access-control'
import { useMainFocus } from '../use-main-focus'
import { isAppAvailable, type AppDefinition } from './app-definition'
import { LAUNCHER_PATH } from './app-route'
import { LauncherCard } from './launcher-card'

interface LauncherPageProps {
  apps: readonly AppDefinition[]
  path: string
}

export function LauncherPage({ apps, path }: LauncherPageProps) {
  const { t } = useI18n()
  const session = useSession()
  const { mainRef, skipToContent } = useMainFocus(path)
  const visibleApps = session ? apps.filter((app) => isAppAvailable(app, session)) : []
  const navItems: NavItemData[] = [{ label: t('launcher.allApps'), to: LAUNCHER_PATH, icon: 'apps', current: true }]

  return (
    <AppShell title={t('launcher.brand')} navItems={navItems} mainRef={mainRef} onSkipToContent={skipToContent} settingsTrigger={<CurrentUserBadge />} settingsFooter={<UserMenu />}>
      <PageHeader title={t('launcher.title')} />
      {visibleApps.length === 0 ? (
        <EmptyState message={t('launcher.empty')} />
      ) : (
        <ul className="launcher-grid" aria-label={t('launcher.title')}>
          {visibleApps.map((app) => <LauncherCard key={app.id} app={app} />)}
        </ul>
      )}
    </AppShell>
  )
}
