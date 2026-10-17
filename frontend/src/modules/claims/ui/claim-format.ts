import type { Claim } from '..'

// Claim keys never contain "=", so the first "=" safely separates key and value.
const SEPARATOR = '='

export function claimLabel(claim: Claim): string {
  return `${claim.key}${SEPARATOR}${claim.value}`
}

export function parseClaimLabel(label: string): Claim | undefined {
  const index = label.indexOf(SEPARATOR)
  if (index <= 0) return undefined
  return { key: label.slice(0, index), value: label.slice(index + 1) }
}

function compareClaims(a: Claim, b: Claim): number {
  return a.key === b.key ? a.value.localeCompare(b.value) : a.key.localeCompare(b.key)
}

export function sortClaims(claims: readonly Claim[]): Claim[] {
  return [...claims].sort(compareClaims)
}

// Claims that exist but are not yet assigned, for the "add" picker.
export function unassignedClaims(all: readonly Claim[], assigned: readonly Claim[]): Claim[] {
  const taken = new Set(assigned.map(claimLabel))
  return sortClaims(all.filter((claim) => !taken.has(claimLabel(claim))))
}
