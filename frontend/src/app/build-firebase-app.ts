import { createFirebaseHandle, type FirebaseHandle } from '../shared/firebase/firebase-client'
import { requireValue } from './data-service-factory'
import type { AppEnv } from './env'

// Created once here and handed to auth and data adapters so they share one session explicitly.
export function buildFirebaseApp(env: AppEnv): FirebaseHandle | null {
  if (env.provider !== 'firebase') return null
  return createFirebaseHandle({
    apiKey: requireValue(env.firebaseApiKey, 'VITE_FIREBASE_API_KEY'),
    authDomain: requireValue(env.firebaseAuthDomain, 'VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requireValue(env.firebaseProjectId, 'VITE_FIREBASE_PROJECT_ID'),
    appId: requireValue(env.firebaseAppId, 'VITE_FIREBASE_APP_ID'),
    functionsRegion: env.firebaseFunctionsRegion || undefined,
  })
}
