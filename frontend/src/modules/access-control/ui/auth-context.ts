import { createContext, useContext } from 'react'
import type { AuthService } from '../application/auth-service'

// DOM-facing, so it lives with the UI and is supplied by the infrastructure.
export type RenderSignInButton = (container: HTMLElement) => void

export const AuthContext = createContext<AuthService | null>(null)
export const SignInButtonContext = createContext<RenderSignInButton | null>(null)

export function useAuth(): AuthService {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthGate')
  return auth
}

export function useSignInButton(): RenderSignInButton {
  const render = useContext(SignInButtonContext)
  if (!render) throw new Error('useSignInButton must be used inside AuthGate')
  return render
}
