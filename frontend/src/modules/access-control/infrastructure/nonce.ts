const NONCE_BYTES = 16
const STATE_BYTES = 16

export interface Nonce {
  // Sent to the backend / Supabase, which compare its hash with the token's nonce claim.
  raw: string
  // Handed to Google; it ends up as the token's nonce claim.
  hashed: string
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return toHex(new Uint8Array(digest))
}

export async function createNonce(): Promise<Nonce> {
  const raw = toHex(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)))
  return { raw, hashed: await sha256Hex(raw) }
}

// CSRF token for the redirect flow; compared with the value Google echoes back.
export function createState(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(STATE_BYTES)))
}
