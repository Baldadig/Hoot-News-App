import { useId, useState } from 'react'
import { termsIn } from '../lib/glossary.js'

// "Uitleg: formateur" onder een bericht: tik en de uitleg klapt open, met Wikipedia als bron.
// Staat buiten de link naar het artikel, zodat een tik op het begrip het artikel niet opent.
export function TermHelp({ text, max = 2 }) {
  const terms = termsIn(text, max)
  const [open, setOpen] = useState(null)
  const id = useId()
  if (!terms.length) return null
  const shown = terms.find((t) => t.term === open)
  return (
    <div className="terms">
      <div className="terms__row">
        {terms.map((t) => (
          <button key={t.term} type="button" className="terms__btn" aria-expanded={open === t.term} aria-controls={id} onClick={() => setOpen((o) => (o === t.term ? null : t.term))}>
            Uitleg: {t.term}
          </button>
        ))}
      </div>
      {shown ? (
        <p className="terms__box" id={id}>
          <strong>{shown.term}.</strong> {shown.text}{' '}
          <a href={shown.source} target="_blank" rel="noopener noreferrer">
            Meer op Wikipedia
          </a>
        </p>
      ) : null}
    </div>
  )
}
