import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppShell } from '../shared/components/app-shell'
import type { NavItemData } from '../shared/components/nav-types'
import { useI18n } from '../shared/i18n'
import { CurrentUserBadge, UserMenu } from '../modules/access-control'
import {
  CATEGORIES_PATH,
  CategoriesPage,
  CategoriesProvider,
  DEVICES_PATH,
  EquipmentDetailPage,
  EquipmentListPage,
  ServicesProvider,
  parseEquipmentId,
  useServices,
} from '../modules/device-management'
import type { AppDeps } from './app-deps'
import { LAUNCHER_PATH } from './launcher/app-route'
import { buildServices } from './build-services'
import { useMainFocus } from './use-main-focus'
import { BackendVersionValue, VersionInfo } from './version-info'

function DeviceBackendVersion() {
  const { systemInfo } = useServices()
  const load = useCallback(() => systemInfo.getBackendVersion(), [systemInfo])
  return <BackendVersionValue load={load} />
}

function DeviceManagementScreens() {
  const { pathname: path } = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { mainRef, skipToContent } = useMainFocus(path)
  const equipmentId = parseEquipmentId(path)
  const onCategories = path === CATEGORIES_PATH
  const navItems: NavItemData[] = [
    { label: t('launcher.allApps'), to: LAUNCHER_PATH, icon: 'apps', current: false },
    { label: t('nav.equipment'), to: DEVICES_PATH, icon: 'list', current: !onCategories },
    { label: t('category.nav'), to: CATEGORIES_PATH, icon: 'folder', current: onCategories },
  ]

  return (
    <AppShell title={t('app.title')} navItems={navItems} mainRef={mainRef} onSkipToContent={skipToContent} settingsTrigger={<CurrentUserBadge />} settingsFooter={<><UserMenu /><VersionInfo backend={<DeviceBackendVersion />} /></>}>
      {equipmentId ? (
        <EquipmentDetailPage key={equipmentId} id={equipmentId} onDeleted={() => navigate(DEVICES_PATH)} />
      ) : onCategories ? (
        <CategoriesPage />
      ) : (
        <EquipmentListPage />
      )}
    </AppShell>
  )
}

// Services and categories are scoped to this app, so other apps never pay for them.
export default function DeviceManagementApp({ deps }: { deps: AppDeps }) {
  const services = useMemo(() => buildServices(deps.auth, deps.env, deps.supabase, deps.firebase), [deps])
  return (
    <ServicesProvider services={services}>
      <CategoriesProvider>
        <DeviceManagementScreens />
      </CategoriesProvider>
    </ServicesProvider>
  )
}
