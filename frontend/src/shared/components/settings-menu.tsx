import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useDismiss, type DismissReason } from '../hooks/use-dismiss'
import { Button } from './button'
import { Icon } from './icon'
import { LanguageSwitcher } from './language-switcher'
import { ColorSchemePicker } from './color-scheme-picker'
import { ThemePicker } from './theme-picker'

export function SettingsMenu() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const dismiss = useCallback((reason: DismissReason) => {
    setOpen(false)
    // Only Escape restores focus; an outside press already moved it where the user clicked.
    if (reason === 'escape') triggerRef.current?.focus()
  }, [])
  useDismiss(rootRef, open, dismiss)

  // Keyboard users opening the popover must land inside it, not stay on the trigger.
  useEffect(() => {
    if (open) rootRef.current?.querySelector<HTMLElement>('.popover button')?.focus()
  }, [open])

  return (
    <div className="settings-menu" ref={rootRef}>
      <Button
        variant="ghost"
        size="icon"
        ref={triggerRef}
        aria-label={t('settings.label')}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="settings" />
      </Button>
      {open && (
        <div className="popover" id={panelId} role="group" aria-label={t('settings.label')}>
          <div className="field">
            <span>{t('language.label')}</span>
            <LanguageSwitcher />
          </div>
          <div className="field">
            <span>{t('colorScheme.label')}</span>
            <ColorSchemePicker />
          </div>
          <div className="field">
            <span>{t('theme.label')}</span>
            <ThemePicker />
          </div>
        </div>
      )}
    </div>
  )
}
