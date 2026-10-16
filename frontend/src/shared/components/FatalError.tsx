import { useI18n, type MessageKey } from '../i18n'
import { GlassSurface } from './GlassSurface'

// Last-resort screen: translated headline, raw message as detail for debugging.
export function FatalError({ titleKey, error }: { titleKey: MessageKey; error: unknown }) {
  const { t } = useI18n()
  const detail = error instanceof Error ? error.message : String(error)
  return (
    <GlassSurface className="state state-error" role="alert">
      <p><strong>{t(titleKey)}</strong></p>
      <p className="muted">{detail}</p>
    </GlassSurface>
  )
}
