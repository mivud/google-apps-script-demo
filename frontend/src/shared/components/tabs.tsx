import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

export interface TabDefinition {
  id: string
  label: string
  content: ReactNode
}

interface TabsProps {
  // Names the tablist for assistive technology.
  label: string
  tabs: readonly TabDefinition[]
  initialId?: string
}

function targetIndex(key: string, index: number, count: number): number | undefined {
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'ArrowRight') return (index + 1) % count
  if (key === 'ArrowLeft') return (index - 1 + count) % count
  return undefined
}

// Accessible tabs: roving tabindex, Left/Right/Home/End move focus and select (activation on focus). Only the selected panel is rendered.
export function Tabs({ label, tabs, initialId }: TabsProps) {
  const baseId = useId()
  const [selected, setSelected] = useState(initialId ?? tabs[0]?.id)
  const listRef = useRef<HTMLDivElement>(null)

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const next = targetIndex(event.key, index, tabs.length)
    if (next === undefined) return
    event.preventDefault()
    setSelected(tabs[next].id)
    listRef.current?.querySelectorAll<HTMLElement>('[role=tab]')[next]?.focus()
  }

  const active = tabs.find((tab) => tab.id === selected) ?? tabs[0]
  if (!active) return null
  return (
    <div className="tabs">
      <div className="tabs-list" role="tablist" aria-label={label} ref={listRef}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            className="tabs-tab"
            aria-selected={tab.id === active.id}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={tab.id === active.id ? 0 : -1}
            onClick={() => setSelected(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-panel-${active.id}`} aria-labelledby={`${baseId}-tab-${active.id}`} className="tabs-panel" tabIndex={0}>
        {active.content}
      </div>
    </div>
  )
}
