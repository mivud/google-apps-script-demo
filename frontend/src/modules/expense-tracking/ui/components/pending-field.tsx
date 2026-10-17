import { LoadingButton } from '../../../../shared/components/loading-button'

interface PendingFieldProps {
  // Translated badge text, e.g. "Amount needed".
  label: string
  canWrite: boolean
  // Opens the edit dialog focused on the missing field.
  onFill: () => void
}

// A value a generated expense still lacks: writers get a one-click shortcut, read-only users a plain badge.
export function PendingField({ label, canWrite, onFill }: PendingFieldProps) {
  return (
    <span className="button-group">
      <span aria-hidden="true">&mdash;</span>
      {canWrite ? (
        <LoadingButton type="button" size="sm" variant="outline" onClick={onFill}>{label}</LoadingButton>
      ) : (
        <span className="badge badge-warning">{label}</span>
      )}
    </span>
  )
}
