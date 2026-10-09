const base = { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const EditionIcon = () => (
  <svg {...base}>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
    <path d="M8 9h8M8 13h8M8 17h4" />
  </svg>
)
export const StreamIcon = () => (
  <svg {...base}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
)
export const BookmarkIcon = ({ filled }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1z" />
  </svg>
)
export const SourcesIcon = () => (
  <svg {...base}>
    <circle cx="6" cy="18" r="1.6" fill="currentColor" stroke="none" />
    <path d="M4.5 11.5a8 8 0 0 1 8 8M4.5 5a14.5 14.5 0 0 1 14.5 14.5" />
  </svg>
)
export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </svg>
)
export const RefreshIcon = () => (
  <svg {...base}>
    <path d="M20 12a8 8 0 1 1-2.35-5.65" />
    <path d="M20 4v5h-5" />
  </svg>
)
export const BackIcon = () => (
  <svg {...base}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
export const CloseIcon = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const FilterIcon = () => (
  <svg {...base}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </svg>
)
export const ArrowUpIcon = () => (
  <svg {...base}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
)
export const PanelIcon = () => (
  <svg {...base}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M14.5 4.5v15" />
  </svg>
)
export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width={40} height={40} aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.55)" />
    <path d="M10 8l6 4-6 4z" fill="#fff" />
  </svg>
)
