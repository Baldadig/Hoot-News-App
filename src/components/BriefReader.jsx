import { useEffect, useRef } from 'react'
import { CloseIcon } from './icons.jsx'
import { briefSections } from '../../shared/brief.mjs'

// "De editie in één minuut" als leesvenster: schreefletter, tussenkoppen, rustige kolom.
// Native dialog: focus blijft binnen, Esc of een tik naast het venster sluit.
export function BriefReader({ open, onClose, brief, kicker }) {
  const ref = useRef(null)
  const body = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // Focus op de tekst, niet op de sluitknop (anders een dikke focusrand bij een tik);
      // Safari scrolt daarbij toch mee, dus daarna terug naar boven.
      body.current?.focus({ preventScroll: true })
      requestAnimationFrame(() => (d.scrollTop = 0))
    }
    if (!open && d.open) d.close()
  }, [open])
  const sections = briefSections(brief)
  return (
    <dialog ref={ref} className="reader" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="reader-title">
      <div className="reader__bar">
        <span className="reader__kicker">{kicker}</span>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Sluiten">
          <CloseIcon />
        </button>
      </div>
      <article ref={body} className="reader__body" tabIndex={-1}>
        <h1 id="reader-title" className="reader__title">
          De editie in één minuut
        </h1>
        {sections.map((s, i) => (
          <section key={i} className="reader__sect">
            {s.head ? <h2 className="reader__head">{s.head}</h2> : null}
            <p className="reader__p">{s.text}</p>
          </section>
        ))}
        <p className="reader__foot">Geschreven door AI, uitsluitend uit de koppen en samenvattingen van deze editie.</p>
      </article>
    </dialog>
  )
}
