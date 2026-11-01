import { BrandMark } from './Brand.jsx'
export function WaitingMark({ size = 24, text = true, label = 'Even kijken bij je bronnen' }) {
  return <span className={`waiting${size <= 8 ? ' waiting--dot' : ''}`} role="status" aria-label={!text ? label : undefined}>
    {size <= 8 ? <span className="waiting__dot" aria-hidden="true" /> : <BrandMark size={size} />}
    {text ? <span>{label}</span> : null}
  </span>
}
