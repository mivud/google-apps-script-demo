import { OAuthProvider, signInWithCredential, signOut } from 'firebase/auth'
import { AuthError, ForbiddenError, NetworkError } from '../../../../../shared/errors'
import type { FirebaseHandle } from '../../../../../shared/firebase/firebase-client'
import type { SessionProvider } from '../../../application/session-provider'
import { parseEffectiveAccess } from '../../../domain/effective-access'
import type { Identity } from '../../../domain/session'

const CURRENT_IDENTITY_ACTION = 'access-control.identity.current'
const GOOGLE_PROVIDER_ID = 'google.com'
const FORBIDDEN_CODE = 'forbidden'

export class FirebaseSessionAdapter implements SessionProvider {
  private readonly handle: FirebaseHandle

  constructor(handle: FirebaseHandle) {
    this.handle = handle
  }

  // Works for One Tap and redirect alike: both end in a Google ID token plus its raw nonce.
  async establish(idToken: string, nonce: string): Promise<Identity> {
    const email = await this.signInWithGoogle(idToken, nonce)
    try {
      return await this.loadIdentity(email)
    } catch (error) {
      // A failed lookup must not leave a Firebase session behind without an app session.
      await this.clear()
      throw error
    }
  }

  async clear(): Promise<void> {
    await signOut(this.handle.auth)
  }

  private async signInWithGoogle(idToken: string, nonce: string): Promise<string> {
    try {
      const credential = new OAuthProvider(GOOGLE_PROVIDER_ID).credential({ idToken, rawNonce: nonce })
      const { user } = await signInWithCredential(this.handle.auth, credential)
      if (!user.email) throw new AuthError()
      return user.email
    } catch {
      throw new AuthError()
    }
  }

  // The callable returns an error code for unknown or inactive users.
  private async loadIdentity(email: string): Promise<Identity> {
    try {
      const data = await this.handle.callApi<Record<string, unknown>>(CURRENT_IDENTITY_ACTION)
      const access = parseEffectiveAccess(data)
      return { ...access, email: access.email || email }
    } catch (error) {
      const code = (error as { code?: unknown }).code
      if (code === FORBIDDEN_CODE) throw new ForbiddenError()
      throw new NetworkError()
    }
  }
}
