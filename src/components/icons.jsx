export function OwlMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#21468B" />
      <g fill="#FFFFFF">
        <path d="M13.5 17.5 L18 8.5 L21 16.8 Z" />
        <path d="M34.5 17.5 L30 8.5 L27 16.8 Z" />
        <ellipse cx="24" cy="27.5" rx="15.5" ry="14" />
      </g>
      <circle cx="18.6" cy="26.6" r="7" fill="#21468B" />
      <circle cx="29.4" cy="26.6" r="7" fill="#21468B" />
      <circle cx="19.4" cy="27" r="2.2" fill="#FFFFFF" />
      <circle cx="28.6" cy="27" r="2.2" fill="#FFFFFF" />
      <path d="M24 30.6 L22.9 28.3 L25.1 28.3 Z" fill="#FFFFFF" />
    </svg>
  )
}

export function VerifiedCheck() {
  return (
    <svg className="verified" viewBox="0 0 22 22" width="15" height="15" aria-label="geverifieerd" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#21468B"
        d="M11 1.8l2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.6 2.7.9 2.6-2 1.9-.4 2.7-2.7.4-1.7 2.1L11 19.7l-2.5 1-1.7-2.1-2.7-.4-.4-2.7-2-1.9.9-2.6-.6-2.7L4.1 5.7l1-2.5 2.7.2z"
      />
      <path fill="#FFFFFF" d="M9.7 14.2l-2.9-2.9 1.3-1.3 1.6 1.6 4-4 1.3 1.3z" />
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
