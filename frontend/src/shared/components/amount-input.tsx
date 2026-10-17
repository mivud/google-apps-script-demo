import { useLayoutEffect, useReducer, useRef, type InputHTMLAttributes, type KeyboardEvent } from 'react'
import { GROUP_SEPARATOR, caretPosition, formatAmount, maskInput, parseAmountDigits } from '../amount-mask'
import { Field, type FieldLayoutProps } from './field'

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode' | 'autoComplete'>, FieldLayoutProps {
  label: string
  // null when the field is empty.
  value: number | null
  onChange: (value: number | null) => void
  error?: string
}

// Whole-number amount field with a live "#,###" mask. The value contract is number | null, so forms keep their own rules.
export function AmountInput({ label, value, onChange, error, hideLabel, adornment, className, ...rest }: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingDigits = useRef<number | null>(null)
  // The value may not change (a rejected character), so a state-free re-render restores the text and caret.
  const [, rerender] = useReducer((tick: number) => tick + 1, 0)
  const text = value === null ? '' : formatAmount(value)

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input || pendingDigits.current === null) return
    const position = caretPosition(text, pendingDigits.current)
    pendingDigits.current = null
    input.setSelectionRange(position, position)
  })

  function commit(raw: string, caret: number) {
    const { digits, digitsBeforeCaret } = maskInput(raw, caret)
    pendingDigits.current = digitsBeforeCaret
    onChange(parseAmountDigits(digits))
    rerender()
  }

  // Backspace / Delete next to a separator would only move the caret; remove the neighbouring digit instead.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const { selectionStart: start, selectionEnd: end } = input
    if (start === null || start !== end) return
    const crossesSeparator = (event.key === 'Backspace' && input.value[start - 1] === GROUP_SEPARATOR) || (event.key === 'Delete' && input.value[start] === GROUP_SEPARATOR)
    if (!crossesSeparator) return
    event.preventDefault()
    const removeAt = event.key === 'Backspace' ? start - 2 : start + 1
    commit(input.value.slice(0, removeAt) + input.value.slice(removeAt + 1), event.key === 'Backspace' ? start - 1 : start)
  }

  return (
    <Field label={label} error={error} hideLabel={hideLabel} adornment={adornment}>
      {(control) => (
        <input
          {...rest}
          {...control}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={className ? `amount-input ${className}` : 'amount-input'}
          value={text}
          onKeyDown={handleKeyDown}
          onChange={(e) => commit(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        />
      )}
    </Field>
  )
}
