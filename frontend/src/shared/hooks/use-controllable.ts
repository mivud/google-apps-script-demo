import { useState } from 'react'

// Controlled when `onChange` is given (value undefined then means "initial"), otherwise self-managed.
export function useControllable<T>(value: T | undefined, onChange: ((next: T) => void) | undefined, initial: T): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(initial)
  if (onChange) return [value ?? initial, onChange]
  return [internal, setInternal]
}
