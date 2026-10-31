import { BrandMark } from './Brand.jsx'
export function WaitingMark({ size = 24, text = true }) {
  return <span className={`waiting${size <= 8 ? ' waiting--dot' : ''}`} role={text ? 'status' : undefined} aria-label={!text ? 'Even kijken bij je bronnen' : undefined}>
    {size <= 8 ? <span className="waiting__dot" aria-hidden="true" /> : <BrandMark size={size} />}
    {text ? <span>Even kijken bij je bronnen</span> : null}
  </span>
}
