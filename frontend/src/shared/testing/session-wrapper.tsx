import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import type { AuthService, Session } from '../../modules/access-control'
import { AuthContext } from '../../modules/access-control/ui/auth-context'
import { Providers } from './providers'

export function sessionOf(roles: string[], permissions: string[] = []): Session {
  return {
    email: 'jane@example.com',
    role: roles[0] ?? '',
    roles,
    claims: permissions.map((value) => ({ key: 'permission', value })),
    idToken: 'tok',
    expiresAt: null,
  }
}

function fakeAuth(session: Session | null): AuthService {
  return { current: () => session, subscribe: () => () => undefined, signOut: () => undefined } as unknown as AuthService
}

// Providers + router + a fixed signed-in session, for components that read permissions.
export function sessionWrapper(session: Session | null, route = '/') {
  const auth = fakeAuth(session)
  return function SessionWrapper({ children }: { children: ReactNode }) {
    return (
      <Providers>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </AuthContext.Provider>
      </Providers>
    )
  }
}
