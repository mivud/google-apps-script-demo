// Optimistic-concurrency failures arrive as ValidationError with the stable code `conflict`.
export function isConflictError(error: Error | undefined): boolean {
  return !!error && (error as { code?: unknown }).code === 'conflict'
}
