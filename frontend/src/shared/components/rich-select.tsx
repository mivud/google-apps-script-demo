import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Field, type FieldLayoutProps } from './field'
import { Icon } from './icon'

const TYPEAHEAD_RESET_MS = 700

export interface RichOption {
  value: string
  // Plain text: used for type-ahead and as the fallback name.
  label: string
}

interface RichSelectProps extends FieldLayoutProps {
  label: string
  value: string
  options: readonly RichOption[]
  onChange: (value: string) => void
  // How an option looks, in the closed button and in the list (e.g. a colored badge).
  renderOption: (option: RichOption) => ReactNode
  error?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

// Listbox-style select for options that need more than text. Select-only combobox pattern: focus stays on the button,
// aria-activedescendant points at the highlighted option; Up/Down/Home/End, type-ahead, Enter/Space and Escape work.
export function RichSelect({ label, value, options, onChange, renderOption, error, hideLabel, adornment, required, disabled, autoFocus }: RichSelectProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', timer: 0 })
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const optionId = (index: number) => `${listId}-option-${index}`
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    if (open) document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' })
    // optionId is derived from listId and the index only.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex])

  function openList() {
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  function choose(index: number) {
    onChange(options[index].value)
    setOpen(false)
  }

  function typeAhead(char: string) {
    window.clearTimeout(typed.current.timer)
    typed.current.text += char.toLowerCase()
    typed.current.timer = window.setTimeout(() => { typed.current.text = '' }, TYPEAHEAD_RESET_MS)
    const match = options.findIndex((option) => option.label.toLowerCase().startsWith(typed.current.text))
    if (match < 0) return
    if (open) setActiveIndex(match)
    else onChange(options[match].value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1
    const move = (index: number) => { event.preventDefault(); if (open) setActiveIndex(index); else openList() }
    switch (event.key) {
      case 'ArrowDown': return move(Math.min(last, open ? activeIndex + 1 : selectedIndex))
      case 'ArrowUp': return move(Math.max(0, open ? activeIndex - 1 : selectedIndex))
      case 'Home': return move(0)
      case 'End': return move(last)
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) choose(activeIndex)
        else openList()
        return
      case 'Escape':
        if (open) { event.preventDefault(); setOpen(false) }
        return
      case 'Tab':
        setOpen(false)
        return
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typeAhead(event.key)
    }
  }

  return (
    <Field label={label} error={error} hideLabel={hideLabel} adornment={adornment}>
      {(control) => (
        <div className={open ? 'rich-select is-open' : 'rich-select'} ref={rootRef}>
          <button
            {...control}
            type="button"
            role="combobox"
            className="rich-select-button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open ? optionId(activeIndex) : undefined}
            aria-required={required || undefined}
            disabled={disabled}
            autoFocus={autoFocus}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={handleKeyDown}
          >
            <span className="rich-select-value">{selected ? renderOption(selected) : null}</span>
            <Icon name="expandAll" />
          </button>
          {open && (
            <ul id={listId} role="listbox" aria-label={label} className="rich-select-list">
              {options.map((option, index) => (
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={option.value === value}
                  className={index === activeIndex ? 'rich-select-option is-active' : 'rich-select-option'}
                  // Keep focus on the button so the keyboard flow is not interrupted.
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                >
                  {renderOption(option)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Field>
  )
}
