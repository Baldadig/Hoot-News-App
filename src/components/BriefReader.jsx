import { useRef } from 'react'
import { Dialog, DialogHeader } from './Dialog.jsx'
import { briefSections } from '../../shared/brief.mjs'
import { uncovered } from '../lib/edition.js'
import { TermHelp } from './Terms.jsx'

// "De editie in één minuut" als leesvenster: schreefletter, tussenkoppen, rustige kolom.
// Een Dialog (variant reader): focus blijft binnen, Esc of een tik naast het venster sluit.
// `rows`: de plekken van de editie (index = plek), voor de bronnen onder elk blok en voor
// "Ook in deze editie": wat het overzicht niet noemt, valt zo niet stilletjes weg.
export function BriefReader({ open, onClose, brief, kicker, rows = [] }) {
  const body = useRef(null)
  // Focus op de tekst, niet op de sluitknop (anders een dikke focusrand bij een tik);
  // Safari scrolt daarbij toch mee, dus daarna terug naar boven.
  const onOpen = (d) => {
    body.current?.focus({ preventScroll: true })
    requestAnimationFrame(() => (d.scrollTop = 0))
  }
  const sections = briefSections(brief)
  const byIndex = new Map(rows.map((r) => [r.index, r]))
  const rest = uncovered(brief, rows.length ? Math.max(...rows.map((r) => r.index)) + 1 : 0)
    .map((i) => byIndex.get(i))
    .filter(Boolean)
  return (
    <Dialog open={open} onClose={onClose} onOpen={onOpen} variant="reader" labelledBy="reader-title">
      {/* De kopbalk loopt over de volle breedte (de lijn eronder); wat erin staat, deelt de
          kolom van de tekst, zodat de kicker en de titel op één lijn beginnen. */}
      <div className="reader__bar">
        <DialogHeader className="reader__barin" label={kicker} tone="meta" labelClass="reader__kicker" onClose={onClose} />
      </div>
      <article ref={body} className="reader__body" tabIndex={-1}>
        <p className="label label--kicker reader__label">Samenvatting door AI</p>
        <h1 id="reader-title" className="head-5 reader__title">
          De Editie in één minuut
        </h1>
        {sections.map((sec, i) => {
          const refs = (sec.refs || []).map((r) => byIndex.get(r)).filter(Boolean)
          return (
            <section key={i} className="reader__sect">
              {sec.head ? <h2 className="head-4 reader__head">{sec.head}</h2> : null}
              <p className="reader__p">{sec.text}</p>
              <TermHelp text={sec.text} />
              {refs.length ? (
                <p className="reader__refs">
                  <span className="visually-hidden">Bronnen: </span>
                  {refs.map((r, k) => {
                    // Twee verhalen van dezelfde bron: nummeren, zodat elke link herkenbaar blijft.
                    const same = refs.filter((x) => x.item.sourceName === r.item.sourceName)
                    const name = same.length > 1 ? `${r.item.sourceName} (${same.indexOf(r) + 1})` : r.item.sourceName
                    return (
                      <a key={r.key} href={r.item.url} target="_blank" rel="noopener noreferrer" title={r.item.title}>
                        {name}
                        {k < refs.length - 1 ? <span aria-hidden="true"> · </span> : null}
                      </a>
                    )
                  })}
                </p>
              ) : null}
            </section>
          )
        })}
        {rest.length ? (
          <section className="reader__sect reader__rest">
            <h2 className="head-4 reader__head">Ook in deze Editie</h2>
            <ul>
              {rest.map((r) => (
                <li key={r.key}>
                  <a href={r.item.url} target="_blank" rel="noopener noreferrer">
                    {r.item.title}
                  </a>{' '}
                  <span className="reader__src">{r.item.sourceName}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="reader__foot">Geschreven door AI, uitsluitend uit de koppen en intro's van deze Editie, en daarna per zin gecontroleerd tegen die bronnen. Lees bij twijfel het artikel zelf.</p>
      </article>
    </Dialog>
  )
}
