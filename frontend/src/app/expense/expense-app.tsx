import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { AppShell } from '../../shared/components/app-shell'
import type { NavItemData } from '../../shared/components/nav-types'
import { useI18n } from '../../shared/i18n'
import { CurrentUserBadge, UserMenu } from '../../modules/access-control'
import {
  EXPENSE_BASE,
  EXPENSE_METHODS_PATH,
  EXPENSE_TEMPLATES_PATH,
  ExpenseTrackingServicesContext,
  ExpensesPage,
  PaymentMethodsPage,
  TemplatesPage,
  parseExpenseSection,
} from '../../modules/expense-tracking/ui'
import type { AppDeps } from '../app-deps'
import { LAUNCHER_PATH } from '../launcher/app-route'
import { useMainFocus } from '../use-main-focus'
import { VersionInfo } from '../version-info'
import { buildExpenseServices } from './build-expense-services'

function ExpenseScreens() {
  const { pathname: path } = useLocation()
  const { t } = useI18n()
  const { mainRef, skipToContent } = useMainFocus(path)
  const section = parseExpenseSection(path)
  const navItems: NavItemData[] = [
    { label: t('launcher.allApps'), to: LAUNCHER_PATH, icon: 'apps', current: false },
    { label: t('expense.nav.month'), to: EXPENSE_BASE, icon: 'list', current: section === 'month' },
    { label: t('expense.nav.methods'), to: EXPENSE_METHODS_PATH, icon: 'folder', current: section === 'methods' },
    { label: t('expense.nav.templates'), to: EXPENSE_TEMPLATES_PATH, icon: 'file', current: section === 'templates' },
  ]

  return (
    <AppShell title={t('expense.title')} navItems={navItems} mainRef={mainRef} onSkipToContent={skipToContent} settingsTrigger={<CurrentUserBadge />} settingsFooter={<><UserMenu /><VersionInfo /></>}>
      {section === 'methods' ? <PaymentMethodsPage /> : section === 'templates' ? <TemplatesPage /> : <ExpensesPage />}
    </AppShell>
  )
}

// The app tile and route are gated by permission=expense.read (see app-registry); permission=expense.write enables the write controls.
// Services are scoped to this app so other apps never pay for them.
export default function ExpenseApp({ deps }: { deps: AppDeps }) {
  const services = useMemo(() => buildExpenseServices(deps), [deps])
  return (
    <ExpenseTrackingServicesContext.Provider value={services}>
      <ExpenseScreens />
    </ExpenseTrackingServicesContext.Provider>
  )
}
