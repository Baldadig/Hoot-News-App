import { useEffect, useRef } from 'react'
import { CloseIcon } from './icons.jsx'

// Dialoog: één native <dialog> voor de bladen (filters, Jij, inloggen) en de Lezer. showModal
// houdt de focus binnen en geeft hem bij sluiten terug aan de knop waarmee je opende; Esc en een
// tik naast het venster sluiten. `variant` is de vorm: 'sheet' (een blad, van onder op de
// telefoon) of 'reader' (de Lezer, schermvullend op de telefoon). Een blad krijgt zijn
// binnenmarge van .sheet__in; de Lezer brengt zijn eigen kopbalk en kolom mee.
// `onOpen` draait direct na showModal, met de dialoog als argument (de Lezer zet daar de focus).
export function Dialog({ open, onClose, onOpen, variant = 'sheet', className = '', labelledBy, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      onOpen?.(d)
    }
    if (!open && d.open) d.close()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <dialog ref={ref} className={`dialog ${variant} ${className}`.trim()} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby={labelledBy}>
      {variant === 'sheet' ? <div className="sheet__in">{children}</div> : children}
    </dialog>
  )
}

// Kop van een dialoog: een label (kicker of meta) en/of een titel (.head-lg), met rechts de
// sluitknop. De X staat zonder tegel op de kolomlijn, net als de iconen in de schermkop.
export function DialogHeader({ id, label, tone = 'kicker', labelClass = '', title, onClose, className = '' }) {
  return (
    <div className={`dialog__head ${className}`.trim()}>
      <div className="dialog__heading">
        {label ? <span className={`label label--${tone} dialog__label ${labelClass}`.trim()}>{label}</span> : null}
        {title ? (
          <h2 id={id} className="head-lg dialog__title">
            {title}
          </h2>
        ) : null}
      </div>
      <button type="button" className="iconbtn" onClick={onClose} aria-label="Sluiten">
        <CloseIcon />
      </button>
    </div>
  )
}
