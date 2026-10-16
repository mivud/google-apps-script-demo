import { FatalError } from '../shared/components/fatal-error'
import { LanguageSwitcher } from '../shared/components/language-switcher'

export function StartupError({ error }: { error: unknown }) {
  return (
    <main className="container">
      <LanguageSwitcher />
      <FatalError titleKey="app.startFailed" error={error} />
    </main>
  )
}
