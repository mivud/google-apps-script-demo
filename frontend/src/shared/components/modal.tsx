import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  title: string
  // Escape and close requests are ignored while a save is in flight.
  pending?: boolean
  onClose: () => void
  children: ReactNode
}

// Native <dialog> + showModal() gives focus trapping, inert background and Escape handling for free.
export function Modal({ title, pending = false, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!dialog.open) dialog.showModal()
    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
      // Restore explicitly: removing the node does not reliably return focus to the opener.
      opener?.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onClose()
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  )
}
