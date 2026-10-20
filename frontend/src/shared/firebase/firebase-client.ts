import { initializeApp } from 'firebase/app'
import { getAuth, inMemoryPersistence, setPersistence, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  functionsRegion?: string
}

export type FirebaseHandle = {
  firestore: Firestore
  auth: Auth
  callApi: <T>(action: string, payload?: object) => Promise<T>
}

const API_CALLABLE = 'api'
const UNKNOWN_CODE = 'unknown'
const GENERIC_MESSAGE = 'Request failed'

interface ApiRequest {
  action: string
  payload: object
}

// Carries only the stable backend code; the server message is never surfaced.
export class FirebaseApiError extends Error {
  readonly code: string
  constructor(code: string) {
    super(GENERIC_MESSAGE)
    this.name = 'FirebaseApiError'
    this.code = code
  }
}

function extractCode(error: unknown): string {
  const details = (error as { details?: { code?: unknown } } | null)?.details
  return typeof details?.code === 'string' && details.code ? details.code : UNKNOWN_CODE
}

// The composition root creates one handle so auth, Firestore and callable share one session.
export function createFirebaseHandle(config: FirebaseConfig): FirebaseHandle {
  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    appId: config.appId,
  })
  const auth = getAuth(app)
  // Tokens stay in memory like the other providers; the app restores sessions through Google sign-in.
  void setPersistence(auth, inMemoryPersistence)
  const functions = config.functionsRegion ? getFunctions(app, config.functionsRegion) : getFunctions(app)
  const callable = httpsCallable<ApiRequest, unknown>(functions, API_CALLABLE)
  return {
    firestore: getFirestore(app),
    auth,
    callApi: async <T>(action: string, payload: object = {}) => {
      try {
        const result = await callable({ action, payload })
        return result.data as T
      } catch (error) {
        throw new FirebaseApiError(extractCode(error))
      }
    },
  }
}
