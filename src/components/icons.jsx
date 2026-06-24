export function OwlMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#21468B" />
      <g transform="translate(2.9 2.9) scale(0.88)">
        <g fill="#FFFFFF">
          <path d="M13.5 17 L18 8 L21 16 Z" />
          <path d="M34.5 17 L30 8 L27 16 Z" />
          <ellipse cx="24" cy="26.5" rx="15.5" ry="14" />
        </g>
        <circle cx="18.6" cy="25.3" r="7" fill="#21468B" />
        <circle cx="29.4" cy="25.3" r="7" fill="#21468B" />
        <circle cx="19.4" cy="25.7" r="2.2" fill="#FFFFFF" />
        <circle cx="28.6" cy="25.7" r="2.2" fill="#FFFFFF" />
        <path d="M24 29.2 L22.9 27 L25.1 27 Z" fill="#FFFFFF" />
      </g>
    </svg>
  )
}

export function VerifiedCheck() {
  return (
    <svg className="verified" viewBox="0 0 24 24" width="15" height="15" aria-label="geverifieerd" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#21468B" />
      <path d="M7 12.4l3.2 3.2L17 8.8" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export function BookmarkIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  )
}
