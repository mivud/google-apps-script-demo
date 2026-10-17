import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { I18nContext, type I18nValue } from '../../../shared/i18n/i18n-context'
import type { AuthService } from '../application/auth-service'
import type { Session } from '../domain/session'
import { AuthContext } from './auth-context'
import { AuthGate } from './auth-gate'
import { CurrentUserBadge } from './current-user-badge'
import { UserMenu } from './user-menu'
import { useHasPermission } from './use-session'

// There is no DOM in this test setup: render to static markup and read stores synchronously (no server snapshot needed).
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, useSyncExternalStore: <T,>(_subscribe: unknown, getSnapshot: () => T) => getSnapshot() }
})
vi.mock('./login-page', () => ({ LoginPage: () => 'LOGIN_PAGE' }))

const i18n: I18nValue = { t: (key) => key, language: 'en', setLanguage: () => undefined }

function sessionWith(roles: string[], claims: { key: string; value: string }[] = []): Session {
  return { email: 'jane@example.com', role: roles[0] ?? '', roles, claims, idToken: 'tok', expiresAt: null }
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

function PermissionProbe() {
  return createElement('span', null, String(useHasPermission('device.mgt.write')))
}

describe('useHasPermission', () => {
  it('is true for the permission claim or the super role', () => {
    const claim = [{ key: 'permission', value: 'device.mgt.write' }]
    expect(render(fakeAuth(sessionWith(['editor'], claim)), createElement(PermissionProbe))).toContain('true')
    expect(render(fakeAuth(sessionWith(['super'])), createElement(PermissionProbe))).toContain('true')
    expect(render(fakeAuth(sessionWith(['viewer'])), createElement(PermissionProbe))).toContain('false')
    expect(render(fakeAuth(null), createElement(PermissionProbe))).toContain('false')
  })
})

describe('CurrentUserBadge', () => {
  it('shows the avatar initial, email and role', () => {
    const html = render(fakeAuth(sessionWith(['viewer'])), createElement(CurrentUserBadge))
    expect(html).toContain('>J<')
    expect(html).toContain('jane@example.com')
    expect(html).toContain('viewer')
  })

  it('renders nothing without a session', () => {
    expect(render(fakeAuth(null), createElement(CurrentUserBadge))).toBe('')
  })
})

describe('UserMenu', () => {
  it('shows the role names and the sign-out button', () => {
    const html = render(fakeAuth(sessionWith(['editor'])), createElement(UserMenu))
    expect(html).toContain('editor')
    expect(html).toContain('auth.signOut')
  })

  it('renders nothing without a session', () => {
    expect(render(fakeAuth(null), createElement(UserMenu))).toBe('')
  })
})

const redirectLogin = { begin: async () => undefined, consumeCallback: () => ({ status: 'none' as const }), clear: () => undefined }
const protectedProps = (auth: AuthService) => ({ auth, renderSignInButton: () => undefined, redirectLogin, children: 'PROTECTED' })

describe('AuthGate', () => {
  const gate = (auth: AuthService) =>
    render(auth, createElement(AuthGate, protectedProps(auth)))

  it('renders the children when signed in', () => {
    expect(gate(fakeAuth(sessionWith(['editor'])))).toContain('PROTECTED')
  })

  it('shows the checking state while no session is known yet', () => {
    const html = gate(fakeAuth(null))
    expect(html).toContain('auth.checking')
    expect(html).not.toContain('PROTECTED')
  })
})
