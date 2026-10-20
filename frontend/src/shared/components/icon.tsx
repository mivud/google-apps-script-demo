import type { ReactNode } from 'react'

const ICONS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  back: <path d="m15 18-6-6 6-6" />,
  check: <path d="m5 12 5 5 9-10" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  folderOpen: <path d="M3 18V6a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v2M3 18l2.5-7.5A2 2 0 0 1 7.4 9H21a1 1 0 0 1 .95 1.3L19.5 18a2 2 0 0 1-1.9 1.4H5a2 2 0 0 1-2-1.4z" />,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />,
  expandAll: <path d="m7 7 5 5 5-5M7 13l5 5 5-5" />,
  collapseAll: <path d="m7 11 5-5 5 5M7 17l5-5 5 5" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  laptop: <><rect x="4" y="5" width="16" height="11" rx="2" /><path d="M2 20h20" /></>,
  book: <><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6" /></>,
  apps: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.3-1.7-.4-1 .3-2.3 1.5-2.3H17a4 4 0 0 0 4-4c0-5-4-10-9-10z" /><path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01" /></>,
  alert: <><path d="M12 3 2.5 20h19z" /><path d="M12 10v4M12 17h.01" /></>,
  refresh: <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" />,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4 20h16" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

// Decorative by default: the surrounding control must carry the accessible name.
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  )
}
