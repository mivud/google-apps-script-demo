import { collection, getDocs, query, type QueryConstraint } from 'firebase/firestore'
import type { FirebaseHandle } from '../firebase/firebase-client'
import type { ApiFailure } from './apps-script-api'

// Provider-neutral failure codes the existing Apps Script error mappers already understand.
const FIREBASE_CODE_TO_API_CODE: Record<string, string> = {
  unauthenticated: 'UNAUTHORIZED',
  'permission-denied': 'FORBIDDEN',
  'not-found': 'NOT_FOUND',
  'invalid-argument': 'VALIDATION',
  'failed-precondition': 'VALIDATION',
  'already-exists': 'VALIDATION',
}
const API_CODES = new Set(['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION', 'CONFLICT'])
const FUNCTIONS_PREFIX = 'functions/'

// A stable domain code (e.g. category_cycle) is carried as the message, like the Apps Script and Postgres backends do.
export function toApiFailure(error: unknown): ApiFailure {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown }
  const raw = typeof code === 'string' ? code.replace(FUNCTIONS_PREFIX, '') : ''
  const text = typeof message === 'string' ? message : ''
  if (API_CODES.has(raw)) return { ok: false, error: { code: raw, message: text || raw } }
  const mapped = FIREBASE_CODE_TO_API_CODE[raw]
  if (mapped) return { ok: false, error: { code: mapped, message: text } }
  if (/^[a-z][a-z0-9_]*$/.test(raw)) return { ok: false, error: { code: 'VALIDATION', message: raw } }
  return { ok: false, error: { code: 'INTERNAL', message: '' } }
}

// Shared transport for Firebase adapters: reads go straight to Firestore, writes and RPCs through the API callable.
export class FirebaseCaller {
  private readonly handle: FirebaseHandle
  private readonly mapError: (failure: ApiFailure) => Error

  constructor(handle: FirebaseHandle, mapError: (failure: ApiFailure) => Error) {
    this.handle = handle
    this.mapError = mapError
  }

  async call<T>(action: string, payload: object = {}): Promise<T> {
    try {
      return await this.handle.callApi<T>(action, payload)
    } catch (error) {
      throw this.mapError(toApiFailure(error))
    }
  }

  // Loads every document of a collection as a row; the document id fills the `id` column when the doc lacks it.
  async rows(name: string, ...constraints: QueryConstraint[]): Promise<Record<string, unknown>[]> {
    try {
      const snapshot = await getDocs(query(collection(this.handle.firestore, name), ...constraints))
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      throw this.mapError(toApiFailure(error))
    }
  }
}

