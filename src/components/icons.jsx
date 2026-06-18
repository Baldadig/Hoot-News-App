export function OwlMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#21468B" />
      <g fill="#FFFFFF">
        <path d="M15 21c-1-5 1.2-7.2 3.6-6.4C18.6 16.7 18.5 18.6 18.6 21z" />
        <path d="M33 21c1-5-1.2-7.2-3.6-6.4C29.4 16.7 29.5 18.6 29.4 21z" />
        <ellipse cx="24" cy="28" rx="15" ry="16.5" />
      </g>
      <circle cx="19" cy="24" r="3.6" fill="#21468B" />
      <circle cx="29" cy="24" r="3.6" fill="#21468B" />
      <path d="M24 28.4l-2.2-3q2.2-1 4.4 0z" fill="#21468B" />
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
