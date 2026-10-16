import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { I18nContext, type I18nValue } from '../../../shared/i18n/i18n-context'
import type { AuthService } from '../application/auth-service'
import type { Role } from '../domain/role'
import type { Session } from '../domain/session'
import { AuthContext } from './auth-context'
import { AuthGate } from './auth-gate'
import { CurrentUserBadge } from './current-user-badge'
import { UserMenu } from './user-menu'
import { useCanWrite } from './use-session'

// There is no DOM in this test setup: render to static markup and read stores synchronously (no server snapshot needed).
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useSyncExternalStore: <T,>(_subscribe: unknown, getSnapshot: () => T) => getSnapshot() }
})
vi.mock('./login-page', () => ({ LoginPage: () => 'LOGIN_PAGE' }))

const i18n: I18nValue = { t: (key) => key, language: 'en', setLanguage: () => undefined }

function sessionWith(role: Role): Session {
  return { email: 'jane@example.com', role, idToken: 'tok', expiresAt: null }
}

function fakeAuth(session: Session | null, refresh = vi.fn().mockResolvedValue(null)) {
  return {
    current: () => session,
    subscribe: () => () => undefined,
    signOut: vi.fn(),
    refreshIdToken: refresh,
  } as unknown as AuthService
}

function render(auth: AuthService, node: ReactNode): string {
  return renderToStaticMarkup(
    createElement(I18nContext.Provider, { value: i18n }, createElement(AuthContext.Provider, { value: auth }, node)),
  )
}

function CanWriteProbe() {
  return createElement('span', null, String(useCanWrite()))
}

describe('useCanWrite', () => {
  it('is true for admin only', () => {
    expect(render(fakeAuth(sessionWith('admin')), createElement(CanWriteProbe))).toContain('true')
    expect(render(fakeAuth(sessionWith('viewer')), createElement(CanWriteProbe))).toContain('false')
    expect(render(fakeAuth(null), createElement(CanWriteProbe))).toContain('false')
  })
})

describe('CurrentUserBadge', () => {
  it('shows the avatar initial, email and role', () => {
    const html = render(fakeAuth(sessionWith('viewer')), createElement(CurrentUserBadge))
    expect(html).toContain('>J<')
    expect(html).toContain('jane@example.com')
    expect(html).toContain('auth.role.viewer')
  })

  it('renders nothing without a session', () => {
    expect(render(fakeAuth(null), createElement(CurrentUserBadge))).toBe('')
  })
})

describe('UserMenu', () => {
  it('shows the read-only hint for viewers', () => {
    const html = render(fakeAuth(sessionWith('viewer')), createElement(UserMenu))
    expect(html).toContain('auth.viewerReadOnly')
    expect(html).toContain('auth.signOut')
  })

  it('hides the read-only hint for admins', () => {
    const html = render(fakeAuth(sessionWith('admin')), createElement(UserMenu))
    expect(html).not.toContain('auth.viewerReadOnly')
    expect(html).toContain('auth.role.admin')
  })

  it('renders nothing without a session', () => {
    expect(render(fakeAuth(null), createElement(UserMenu))).toBe('')
  })
})

const protectedProps = (auth: AuthService) => ({ auth, renderSignInButton: () => undefined, children: 'PROTECTED' })

describe('AuthGate', () => {
  const gate = (auth: AuthService) =>
    render(auth, createElement(AuthGate, protectedProps(auth)))

  it('renders the children when signed in', () => {
    expect(gate(fakeAuth(sessionWith('admin')))).toContain('PROTECTED')
  })

  it('shows the checking state while no session is known yet', () => {
    const html = gate(fakeAuth(null))
    expect(html).toContain('auth.checking')
    expect(html).not.toContain('PROTECTED')
  })
})
