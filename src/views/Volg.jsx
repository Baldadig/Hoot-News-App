// Volgen 1.5: de pagina van één volgzaak (route `volg`, #/volg?naam=<slug>), scherm 24. Een gewone pagina in de router,
// met rechts de knop Volgend als menu (Deel, Stop met volgen). De server krijgt de naam alleen in een POST-body
// (/api/volgzaak pagina); alleen Deel zet hem in een link.
//
// Wat je ziet rekent de gedeelde rekenkern uit (volgzaakView, shared/volgzaak-weergave.mjs, ook in de app): eerst je taal
// en je eigen bronnen, gratis van buiten met "Buiten je bronnen", Nieuw sinds je vorige bezoek en Eerder per week, en het
// einde "Je bent bij.". Openen zet de rij in Zoeken terug op "Niets nieuws"; wat nieuw was blijft hier nieuw tot je weer
// opent (de grens ligt vast bij het openen). De stand van zaken staat er alleen als de server die meegeeft (achter
// HOOT_VOLGZAAK_STAND); de slotregel bij afloop en "Drie weken stil" ook alleen op aanwijzing van de server.
import { useEffect, useMemo, useRef, useState } from 'react'
import { BackButton } from '../components/Shell.jsx'
import { useHoot } from '../components/Items.jsx'
import { VerhaalRij, VolgendKnop } from '../components/Volg.jsx'
import { TEKST, vraagVolgzaak } from '../lib/volgzaak.js'
import { volgzaakView } from '../../shared/volgzaak-weergave.mjs'

export default function Volg({ slug, onBack, backLabel }) {
  const { volgzaken, volgZaak, ontvolgZaak, volgBekeken, sourcesById, muted, read, itemsById } = useHoot()
  const zaak = (volgzaken || []).find((z) => z.slug === slug) || null
  const volgend = !!zaak && zaak.status !== 'gestopt'
  const [pagina, setPagina] = useState(null) // { volgzaak, status, stand } of { fout }
  useEffect(() => {
    let weg = false
    vraagVolgzaak('pagina', { slug }).then((r) => {
      if (weg) return
      setPagina(r.status === 200 && r.data?.volgzaak ? r.data : { fout: r.status === 404 ? 'weg' : 'mis' })
    })
    return () => {
      weg = true
    }
  }, [slug])

  // De grens van Nieuw ligt vast bij het openen: daarna telt de pagina als gezien (Zoeken zegt "Niets nieuws").
  const grens = useRef(undefined)
  if (grens.current === undefined) grens.current = zaak ? zaak.gezien || zaak.at || null : null
  useEffect(() => {
    if (pagina?.volgzaak && volgend) volgBekeken(slug)
  }, [pagina?.volgzaak, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gelezen telt niet als nieuw, ook als je het in de Editie las: de verhalen van wat je opende.
  const gelezen = useMemo(() => [...new Set([...(read || [])].map((id) => itemsById?.get(id)?.storyId).filter(Boolean))], [read, itemsById])
  const bronnen = useMemo(() => [...(sourcesById?.values?.() || [])].map((s) => ({ id: s.id, lang: s.lang || 'nl', paid: !!s.paid, followed: !!s.followed })), [sourcesById])
  const eigen = useMemo(() => bronnen.filter((b) => b.followed && !muted.has(b.id)).map((b) => b.id), [bronnen, muted])
  const view = useMemo(() => (pagina?.stand ? volgzaakView({ stand: pagina.stand, bronnen, eigen, gezien: volgend ? grens.current : null, gelezen, now: Date.now() }) : { nieuw: [], eerder: [], aantal: 0 }), [pagina, bronnen, eigen, gelezen, volgend])

  const def = pagina?.volgzaak || (zaak ? { slug, label: zaak.label } : { slug, label: '' })
  const stil = pagina?.status === 'stil' || zaak?.status === 'gestopt'
  const volgWeer = () => volgZaak({ slug, label: def.label })
  const knop = pagina?.fout ? null : volgend && !stil ? (
    <VolgendKnop zaak={def} />
  ) : (
    <button type="button" className="btn btn--accent volgknop" onClick={volgWeer} disabled={!def.label}>
      {stil ? TEKST.volgWeer : TEKST.volg}
    </button>
  )

  return (
    <section className="view view--page" aria-label={def.label || TEKST.volgend}>
      <div className="col col--read volgpagina">
        {/* Zoals een gepusht scherm met grote titel: terug links en Volgend rechts op de bovenste rij, de naam eronder. */}
        <header className="vh volgvh">
          <div className="vh__row">
            {onBack ? <BackButton onClick={onBack} ariaLabel={`Terug naar ${backLabel}`} /> : null}
            <span className="volgvh__ruimte" />
            {knop}
          </div>
          <h1 className="head-5 vh__title volgvh__titel">{def.label || '\u00a0'}</h1>
          {def.regel ? <p className="vh__sub volgvh__regel">{def.regel}</p> : null}
        </header>
        {pagina?.fout ? (
          <p className="listempty">{pagina.fout === 'weg' ? TEKST.geen : TEKST.mislukt}</p>
        ) : !pagina ? null : (
          <>
            {pagina.slot && volgend ? (
              <div className="volgslot" role="status">
                <p className="head-4 volgslot__zin">{pagina.slot}</p>
                <div className="volgslot__knoppen">
                  <button type="button" className="pill pill--sm hit" onClick={() => volgBekeken(slug)}>{TEKST.blijfVolgen}</button>
                  <button type="button" className="pill pill--sm hit" onClick={() => ontvolgZaak(slug)}>{TEKST.klaar}</button>
                </div>
              </div>
            ) : null}
            {stil ? <p className="volgstil">{TEKST.stil}</p> : null}
            {pagina.stand?.samenvatting?.tekst ? (
              <div className="volgstand">
                <p className="volgstand__tekst">{pagina.stand.samenvatting.tekst}</p>
                {pagina.stand.samenvatting.volgens ? <p className="volgstand__bron">{pagina.stand.samenvatting.volgens}</p> : null}
              </div>
            ) : null}
            {view.nieuw.length ? (
              <section className="volgdeel" aria-labelledby="volg-nieuw">
                <h2 id="volg-nieuw" className="label label--section volgdeel__label">{TEKST.nieuw}</h2>
                <div className="volgdeel__lijst">{view.nieuw.map((v) => <VerhaalRij key={v.verhaal} v={v} />)}</div>
              </section>
            ) : null}
            {view.eerder.length ? (
              <section className="volgdeel" aria-labelledby="volg-eerder">
                <h2 id="volg-eerder" className="label label--section volgdeel__label">{TEKST.eerder}</h2>
                {view.eerder.map((w) => (
                  <div key={w.week} className="volgweek">
                    <h3 className="label label--meta volgweek__label">{w.week}</h3>
                    <div className="volgdeel__lijst">{w.verhalen.map((v) => <VerhaalRij key={v.verhaal} v={v} />)}</div>
                  </div>
                ))}
              </section>
            ) : null}
            <p className="listend volgeinde">{view.nieuw.length || !volgend ? TEKST.bij : TEKST.nietsNieuwsBij}</p>
          </>
        )}
      </div>
    </section>
  )
}
