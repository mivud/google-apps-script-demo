// Avoids an early exit on the first differing character when comparing the secret state.
export function constantTimeEquals(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index++) diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0)
  return diff === 0
}
