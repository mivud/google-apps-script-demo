import { Link } from 'react-router'
import { GlassSurface } from '../../shared/components/glass-surface'
import { Icon } from '../../shared/components/icon'
import { useI18n } from '../../shared/i18n'
import type { AppDefinition } from './app-definition'

// A real link, so open-in-new-tab, copy-link and keyboard activation work without extra code.
export function LauncherCard({ app }: { app: AppDefinition }) {
  const { t } = useI18n()
  return (
    <li>
      <GlassSurface as={Link} to={app.path} interactive className="launcher-card">
        <Icon name={app.icon} />
        <div>
          <h2 className="launcher-card-title">{t(app.titleKey)}</h2>
          <p className="launcher-card-description">{t(app.descriptionKey)}</p>
        </div>
      </GlassSurface>
    </li>
  )
}
