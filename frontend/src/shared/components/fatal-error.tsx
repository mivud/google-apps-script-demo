import { useI18n, type MessageKey } from '../i18n'
import { GlassSurface } from './glass-surface'

// Last-resort screen: the real error is logged to the console by the caller; users only see fixed, translated text.
export function FatalError({ titleKey }: { titleKey: MessageKey }) {
  const { t } = useI18n()
  return (
    <GlassSurface className="state state-error" role="alert">
      <p><strong>{t(titleKey)}</strong></p>
      <p className="muted">{t('error.fatalDetail')}</p>
    </GlassSurface>
  )
}
