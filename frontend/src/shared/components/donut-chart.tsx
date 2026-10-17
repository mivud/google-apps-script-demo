import { useId, useMemo, useState } from 'react'
import { ringSlicePath, sliceAngles } from '../donut-geometry'
import { useI18n } from '../i18n'
import { LoadingButton } from './loading-button'

const LOCALES = { en: 'en-US', vi: 'vi-VN' } as const
const VIEW_SIZE = 200
const CENTER = VIEW_SIZE / 2
const OUTER_RADIUS = 96
// Ring thickness is about a third of the radius.
const INNER_RADIUS = 66
const HATCH_SPACING = 6

export interface DonutItem {
  key: string
  label: string
  value: number
  // Rows behind the value, shown in the tooltip and the table view.
  count: number
  // Stable categorical slot (1-based class series-N); undefined draws the neutral gray.
  colorIndex?: number
  // Names folded into this slice (the "Other" bucket), listed in its tooltip.
  members?: readonly string[]
}

interface DonutChartProps {
  title: string
  // One line saying what the chart reflects, e.g. "Follows the table filters".
  caption: string
  items: readonly DonutItem[]
  formatValue: (value: number) => string
  totalLabel: string
  valueHeader: string
  labelHeader: string
  countHeader: string
  emptyMessage: string
  // Extra muted line under the chart, e.g. how many rows were left out.
  note?: string
}

function colorClass(item: DonutItem): string {
  return item.colorIndex === undefined ? 'donut-fill-neutral' : `donut-fill-${item.colorIndex}`
}

// Share of a total as a ring. Slices keep the caller's stable order and fixed colors; the legend (swatch, name, amount,
// share) is the direct labelling, slices are separated by a surface-colored gap, and a table view carries the same numbers.
export function DonutChart({ title, caption, items, formatValue, totalLabel, valueHeader, labelHeader, countHeader, emptyMessage, note }: DonutChartProps) {
  const { t, language } = useI18n()
  const [asTable, setAsTable] = useState(false)
  const [active, setActive] = useState<string | undefined>(undefined)
  const hatchId = useId()
  const percent = useMemo(() => new Intl.NumberFormat(LOCALES[language] ?? LOCALES.en, { style: 'percent', maximumFractionDigits: 1 }), [language])
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const angles = useMemo(() => sliceAngles(items.map((item) => item.value)), [items])
  const share = (item: DonutItem) => percent.format(total === 0 ? 0 : item.value / total)
  const describe = (item: DonutItem) => `${item.label}: ${formatValue(item.value)}, ${share(item)}, ${countHeader} ${item.count}`
  const summary = `${title}: ${items.map((item) => `${item.label} ${share(item)}`).join(', ')}`
  const highlighted = items.find((item) => item.key === active)
  const hover = (key: string | undefined) => ({
    onPointerEnter: () => setActive(key),
    onPointerLeave: () => setActive(undefined),
    onFocus: () => setActive(key),
    onBlur: () => setActive(undefined),
  })

  return (
    <figure className="chart" role="group" aria-label={summary}>
      <div className="chart-head">
        <p className="muted chart-caption">{caption}</p>
        {total > 0 && <LoadingButton type="button" size="sm" variant="ghost" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>{asTable ? t('chart.showChart') : t('chart.showTable')}</LoadingButton>}
      </div>
      {total <= 0 ? (
        <p className="state">{emptyMessage}</p>
      ) : asTable ? (
        <table className="chart-table">
          <thead>
            <tr><th scope="col">{labelHeader}</th><th scope="col">{valueHeader}</th><th scope="col">{t('chart.share')}</th><th scope="col">{countHeader}</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}><th scope="row">{item.label}</th><td>{formatValue(item.value)}</td><td>{share(item)}</td><td>{item.count}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="donut-body">
          <div className="donut-ring">
            <svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} aria-hidden="false" focusable="false">
              <defs>
                <pattern id={hatchId} width={HATCH_SPACING} height={HATCH_SPACING} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2={HATCH_SPACING} className="donut-hatch" />
                </pattern>
              </defs>
              {items.map((item, index) => {
                const d = ringSlicePath(CENTER, CENTER, OUTER_RADIUS, INNER_RADIUS, angles[index])
                const dimmed = active !== undefined && active !== item.key
                return (
                  <g key={item.key}>
                    <path d={d} fillRule="evenodd" className={`donut-slice ${colorClass(item)}${dimmed ? ' is-dimmed' : ''}`} tabIndex={0} aria-label={describe(item)} {...hover(item.key)} />
                    <path d={d} fillRule="evenodd" fill={`url(#${hatchId})`} className="donut-texture" pointerEvents="none" />
                  </g>
                )
              })}
            </svg>
            <div className="donut-center" aria-hidden="true">
              <span className="donut-center-value">{formatValue(highlighted ? highlighted.value : total)}</span>
              <span className="muted donut-center-label">{highlighted ? highlighted.label : totalLabel}</span>
            </div>
          </div>
          <ul className="donut-legend">
            {items.map((item) => (
              <li key={item.key} className={active === item.key ? 'donut-legend-row is-active' : 'donut-legend-row'} tabIndex={0} aria-label={describe(item)} {...hover(item.key)}>
                <span className={`donut-swatch ${colorClass(item)}`} aria-hidden="true" />
                <span className="donut-legend-name">{item.label}</span>
                <span className="donut-legend-value">{formatValue(item.value)} <span className="muted">{share(item)}</span></span>
                {active === item.key && (
                  <div className="chart-tooltip" role="presentation">
                    <strong>{formatValue(item.value)}</strong>
                    <span className="muted">{item.label}</span>
                    <span className="muted">{share(item)} \xb7 {countHeader} {item.count}</span>
                    {item.members && item.members.length > 0 && <span className="muted">{item.members.join(', ')}</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {note && <p className="muted chart-caption">{note}</p>}
    </figure>
  )
}
