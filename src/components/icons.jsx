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
export const TimelineIcon = () => (
  <svg {...base}>
    <path d="M5 5h14" />
    <rect x="5" y="9" width="14" height="10" rx="2" />
  </svg>
)
export const PaperIcon = () => (
  <svg {...base}>
    <path d="M4 7h9M4 12h9M4 17h6" />
    <rect x="15.5" y="6.5" width="5" height="5" rx="1" />
  </svg>
)
export const TypographyIcon = () => (
  <svg {...base}>
    <path d="M4 18 9.5 5 15 18M6 13.5h7M15.5 18l2.5-6 2.5 6M16.3 16h3.4" />
  </svg>
)
export const HeadphonesIcon = () => (
  <svg {...base}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="4" y="13" width="4" height="6" rx="1.5" />
    <rect x="16" y="13" width="4" height="6" rx="1.5" />
  </svg>
)
export const StopIcon = () => (
  <svg {...base}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
)
export const SettingsIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)
export const ButterflyIcon = () => (
  <svg {...base}>
    <path d="M12 11c-1.4-2.8-4.9-6.6-7.6-6.6C3 4.4 3 6 3 6.9c0 1.1.6 4.6 1 5.3 1.2 2.4 4.4 2 5.9 1.4-2.7.8-4.4 2.4-2.4 4.6 2.4 2.3 3.8-.5 4.5-2.4.7 1.9 2.1 4.7 4.5 2.4 2-2.2.3-3.8-2.4-4.6 1.5.6 4.7 1 5.9-1.4.4-.7 1-4.2 1-5.3 0-.9 0-2.5-1.4-2.5C16.9 4.4 13.4 8.2 12 11Z" />
  </svg>
)
export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width={40} height={40} aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.55)" />
    <path d="M10 8l6 4-6 4z" fill="#fff" />
  </svg>
)
export const ReaderIcon = () => (
  <svg {...base}>
    <path d="M6 3.5h9l3 3v14H6z" />
    <path d="M9 10h6M9 13.5h6M9 17h4" />
  </svg>
)
