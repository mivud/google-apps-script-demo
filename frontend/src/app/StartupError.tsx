import { FatalError } from '../shared/components/FatalError'
import { LanguageSwitcher } from '../shared/components/LanguageSwitcher'

export function StartupError({ error }: { error: unknown }) {
  return (
    <main className="container">
      <LanguageSwitcher />
      <FatalError titleKey="app.startFailed" error={error} />
    </main>
  )
}
