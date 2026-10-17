import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppShell } from '../../shared/components/app-shell'
import type { NavItemData } from '../../shared/components/nav-types'
import { EmptyState } from '../../shared/components/empty-state'
import { useI18n } from '../../shared/i18n'
import { CurrentUserBadge, UserMenu, useRole } from '../../modules/access-control'
import { EffectiveAccessPanel } from '../../modules/access-control/ui'
import { CLAIMS_PATH, ROLES_PATH, USERS_PATH, parseIdentityRoute, type IdentityRoute } from '../../shared/identity-routes'
import { ClaimsPage } from '../../modules/claims/ui'
import { RoleDetailPage, RolesPage } from '../../modules/roles/ui'
import { UserDetailPage, UsersPage } from '../../modules/users/ui'
import type { AppDeps } from '../app-deps'
import { useMainFocus } from '../use-main-focus'
import { LAUNCHER_PATH } from '../launcher/app-route'
import { VersionInfo } from '../version-info'
import { buildIdentityServices } from './build-identity-services'
import { IdentityServicesContext, useIdentityServices } from './identity-services'


function IdentityPage({ route }: { route: IdentityRoute }) {
  const navigate = useNavigate()
  const { users, roles, claims, access } = useIdentityServices()
  switch (route.page) {
    case 'user':
      return <UserDetailPage key={route.id} id={route.id} users={users} roles={roles} claims={claims} renderAccess={(version) => <EffectiveAccessPanel access={access} userId={route.id} version={version} />} onDeleted={() => navigate(USERS_PATH)} />
    case 'roles':
      return <RolesPage roles={roles} />
    case 'role':
      return <RoleDetailPage key={route.id} id={route.id} roles={roles} claims={claims} onDeleted={() => navigate(ROLES_PATH)} />
    case 'claims':
      return <ClaimsPage claims={claims} />
    default:
      return <UsersPage users={users} roles={roles} />
  }
}

function IdentityScreens() {
  const { pathname: path } = useLocation()
  const { t } = useI18n()
  const isAdmin = useRole() === 'admin'
  const { mainRef, skipToContent } = useMainFocus(path)
  const route = parseIdentityRoute(path)
  const section = route.page === 'user' ? 'users' : route.page === 'role' ? 'roles' : route.page
  const navItems: NavItemData[] = [
    { label: t('launcher.allApps'), to: LAUNCHER_PATH, icon: 'apps', current: false },
    { label: t('identity.nav.users'), to: USERS_PATH, icon: 'users', current: section === 'users' },
    { label: t('identity.nav.roles'), to: ROLES_PATH, icon: 'folder', current: section === 'roles' },
    { label: t('identity.nav.claims'), to: CLAIMS_PATH, icon: 'list', current: section === 'claims' },
  ]

  return (
    <AppShell title={t('identity.title')} navItems={navItems} mainRef={mainRef} onSkipToContent={skipToContent} settingsTrigger={<CurrentUserBadge />} settingsFooter={<><UserMenu /><VersionInfo /></>}>
      {/* The backend is authoritative; this only avoids rendering (and requesting) admin screens for others. */}
      {isAdmin ? <IdentityPage route={route} /> : <EmptyState icon="users" message={t('identity.noAccess')} />}
    </AppShell>
  )
}

// Services are scoped to this app so other apps never pay for them.
export default function IdentityApp({ deps }: { deps: AppDeps }) {
  const services = useMemo(() => buildIdentityServices(deps), [deps])
  return (
    <IdentityServicesContext.Provider value={services}>
      <IdentityScreens />
    </IdentityServicesContext.Provider>
  )
}
