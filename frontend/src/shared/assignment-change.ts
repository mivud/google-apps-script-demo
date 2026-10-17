export interface AssignmentChange {
  added: string[]
  removed: string[]
}

// Difference between the checked ids and the saved assignment, in option order.
export function diffAssignment(optionIds: readonly string[], assignedIds: readonly string[], checked: ReadonlySet<string>): AssignmentChange {
  const assigned = new Set(assignedIds)
  return {
    added: optionIds.filter((id) => checked.has(id) && !assigned.has(id)),
    removed: optionIds.filter((id) => !checked.has(id) && assigned.has(id)),
  }
}

export function hasChanges(change: AssignmentChange): boolean {
  return change.added.length + change.removed.length > 0
}

// Adds run before removals so swapping the only admin role never passes through a lockout state.
// onDone also runs when a call fails half way, so the page shows what was really saved.
export async function applyAssignmentChange(
  change: AssignmentChange,
  add: (id: string) => Promise<unknown>,
  remove: (id: string) => Promise<unknown>,
  onDone: () => void,
): Promise<void> {
  try {
    for (const id of change.added) await add(id)
    for (const id of change.removed) await remove(id)
  } finally {
    onDone()
  }
}
