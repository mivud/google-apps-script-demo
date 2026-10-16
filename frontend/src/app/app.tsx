import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { AppShell } from '../shared/components/app-shell'
import type { NavItemData } from '../shared/components/nav-types'
import { useI18n } from '../shared/i18n'
import {
  CATEGORIES_PATH,
  CategoriesPage,
  EquipmentDetailPage,
  EquipmentListPage,
  navigate,
  parseEquipmentId,
} from '../modules/device-management'

// Hash routing works on static hosts (GitHub Pages, Cloudflare Pages) without server rewrites.
function useHashPath(): string {
  const [path, setPath] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const onChange = () => setPath(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}

export default function App() {
  const path = useHashPath()
  const { t } = useI18n()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  const equipmentId = parseEquipmentId(path)

  // Hash navigation keeps scroll and focus where they were; move both so keyboard and screen reader users start at the new page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [path])

  // A plain "#main" href would be taken as a route by the hash router.
  function skipToContent(event: MouseEvent) {
    event.preventDefault()
    mainRef.current?.focus()
  }

  const onCategories = path === CATEGORIES_PATH
  const navItems: NavItemData[] = [
    { label: t('nav.equipment'), href: '#/', icon: 'list', current: !onCategories },
    { label: t('category.nav'), href: `#${CATEGORIES_PATH}`, icon: 'folder', current: onCategories },
  ]

  return (
    <AppShell title={t('app.title')} navItems={navItems} mainRef={mainRef} onSkipToContent={skipToContent}>
      {equipmentId ? (
        <EquipmentDetailPage key={equipmentId} id={equipmentId} onDeleted={() => navigate('/')} />
      ) : onCategories ? (
        <CategoriesPage />
      ) : (
        <EquipmentListPage />
      )}
    </AppShell>
  )
}
