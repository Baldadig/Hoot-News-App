import { useEffect, useMemo, useRef, useState } from 'react'
import { Empty, ViewHeader } from '../components/Shell.jsx'
import { Entry, useHoot } from '../components/Items.jsx'
import { CloseIcon, SearchArt } from '../components/icons.jsx'
import { searchHits } from '../lib/zoek.js'
import { VolgKop, JeVolgtSectie } from '../components/Volg.jsx'
import { vraagVolgzaak } from '../lib/volgzaak.js'

// Zoeken is een tab (telefoon) en staat in de zijbalk (breed): geen terugknop, wel een schermtitel (h1) zoals elk scherm.
export default function Search() {
  const { itemsById, saved, storiesById, muted, prefs, volgAan, account, tokenVan } = useHoot()
  const [q, setQ] = useState('')
  const [scope, setScope] = useState('mijn') // mijn | alle
  const inputRef = useRef(null)
  useEffect(() => inputRef.current?.focus(), [])

  // Mijn bronnen of alle bronnen, gelijk aan de app (lib/zoek.js).
  const ownMuted = useMemo(() => new Set(prefs?.muted || []), [prefs])
  const results = useMemo(() => searchHits(q, { itemsById, saved, scope, muted, ownMuted }), [q, scope, itemsById, saved, muted, ownMuted])

  // Volgen 1.5 (achter de vlag): na Return vraagt Zoeken de server of er iets te volgen valt (de tekst in een POST-body).
  // De gewone treffers staan er meteen, zoals altijd; de kop van De Redacteur komt erboven. Alleen met een account (duiden
  // kost iets en telt voor je quotum); zonder account blijft Zoeken zoals het was.
  const [kop, setKop] = useState(null) // { voor, antwoord }
  const lid = account?.status === 'in'
  const duid = async (opdracht) => {
    const tekst = opdracht.trim()
    if (!volgAan || !lid || tekst.length < 2) return
    const r = await vraagVolgzaak('duiden', { opdracht: tekst }, { token: await tokenVan?.() })
    if (r.status === 200 && r.data?.soort) setKop({ voor: opdracht, antwoord: r.data })
  }
  const kopNu = kop && kop.voor === q ? kop.antwoord : null

  return (
    <section className="view view--page" aria-label="Zoeken">
      <div className="col col--read">
        <ViewHeader title="Zoeken" showSearch={false}>
          <form className="searchbar" role="search" onSubmit={(e) => (e.preventDefault(), inputRef.current?.blur(), duid(q))}>
            <label className="visually-hidden" htmlFor="q">
              Zoek in berichten
            </label>
            <input id="q" data-skip ref={inputRef} type="search" className="input" placeholder="Zoek op woord of bron" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" autoComplete="off" />
            {/* Eigen wisknop in plaats van de × van de browser: leegmaken en terug in het veld. */}
            {q ? (
              <button type="button" className="iconbtn input__clear" onClick={() => (setQ(''), inputRef.current?.focus())} aria-label="Zoekterm wissen">
                <CloseIcon />
              </button>
            ) : null}
          </form>
          <div className="chips scope" role="group" aria-label="Waar zoeken">
            <button type="button" className="pill" aria-pressed={scope === 'mijn'} onClick={() => setScope('mijn')}>
              Mijn bronnen
            </button>
            <button type="button" className="pill" aria-pressed={scope === 'alle'} onClick={() => setScope('alle')}>
              Alle bronnen
            </button>
          </div>
        </ViewHeader>
        {!q.trim() && volgAan && (prefs?.volgzaken || []).some((z) => z.status !== 'gestopt') ? (
          // Zoeken zonder zoekterm is het thuis van wat je volgt (scherm 05d).
          <JeVolgtSectie />
        ) : !q.trim() ? (
          <Empty art={SearchArt} title="Zoek in je nieuws">
            In koppen, intro’s, bronnen en auteurs, ook in Bewaard.
          </Empty>
        ) : null}
        {q.trim() && kopNu ? <VolgKop antwoord={kopNu} onKies={(o) => { setQ(o); setKop(null); duid(o) }} /> : null}
        {!q.trim() ? null : results.length === 0 ? (
          <Empty
            art={SearchArt}
            title={`Niets gevonden voor ‘${q.trim()}’`}
            action={
              scope === 'mijn' ? (
                <button type="button" className="btn" onClick={() => setScope('alle')}>
                  Zoek in alle bronnen
                </button>
              ) : null
            }
          >
            Hoot zoekt in koppen, intro’s, bronnen en auteurs, ook in Bewaard.
          </Empty>
        ) : (
          <>
            <p className="status" role="status">
              {results.length} {results.length === 1 ? 'resultaat' : 'resultaten'}
              {results.length === 60 ? ' (eerste 60)' : ''} in {scope === 'mijn' ? 'je eigen bronnen en bewaard' : 'alle bronnen'}
            </p>
            <div className="list rows">
              {results.map((i) => (
                <Entry key={i.id} item={i} story={i.storyId ? storiesById.get(i.storyId) : null} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
