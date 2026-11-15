// Volgen 1.5 op het web: de onderdelen die Zoeken, de pagina en het kaartmenu delen. Gelijk aan de app (schermen 01 tot
// 24 van Hoot-design/ontwerp/volgen-1.5): dezelfde plekken en dezelfde teksten (TEKST in src/lib/volgzaak.js).
// - VolgKop: boven de treffers in Zoeken na Enter (naam, één regel, Volg, "Er speelde al"; Bedoel je; hele rubriek; geen).
// - JeVolgtSectie: Zoeken zonder zoekterm, het thuis van wat je volgt (Nieuw of Niets nieuws, Wijzig).
// - VolgendKnop: de knop Volgend als menu (Stuur bij, Deel, Stop met volgen).
// - BeheerBlad: "Je volgt" met Klaar; stoppen met een knop (op het web in plaats van vegen), slepen voor de volgorde.
// - StuurBijBlad: "Zeg het scherper"; De Redacteur duidt opnieuw.
// - VerhaalRij: een verhaal op de pagina en onder "Er speelde al".
// Alles alleen als de vlag aan is (de aanroepers kijken naar volgAan).
import { useEffect, useId, useRef, useState } from 'react'
import { useHoot, SourceMark } from './Items.jsx'
import { Popmenu } from './Popmenu.jsx'
import { Dialog } from './Dialog.jsx'
import { CheckIcon, CaretIcon, CloseIcon, ShareIcon, INTEREST_ICONS, ICON_SM } from './icons.jsx'
import { TEKST, vraagVolgzaak, deelLink, gratisTip, weinigInEigen } from '../lib/volgzaak.js'
import { volgt as volgtSlug, isVol, actief, gestopt, inVolgorde, nieuwTekst } from '../lib/follow-volgzaken.js'
import { INTERESTS } from '../lib/topics.js'
import { toHash } from '../lib/context.js'

const rubriekNaam = (id) => INTERESTS.find((i) => i.id === id)?.label || ''
const PlusIcon = ({ size = ICON_SM }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="24" strokeLinecap="round" aria-hidden="true">
    <path d="M128 48v160M48 128h160" />
  </svg>
)
const MinCirkel = ({ size = ICON_SM }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" aria-hidden="true">
    <circle cx="128" cy="128" r="96" />
    <path d="M88 128h80" />
  </svg>
)
const Potlood = ({ size = ICON_SM }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="round" aria-hidden="true">
    <path d="M92.69 216H48a8 8 0 0 1-8-8v-44.69a8 8 0 0 1 2.34-5.65L165.66 34.34a8 8 0 0 1 11.31 0L221.66 79a8 8 0 0 1 0 11.31L98.34 213.66a8 8 0 0 1-5.65 2.34ZM136 64l56 56" />
  </svg>
)
const Greep = () => (
  <svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true">
    {[88, 128, 168].flatMap((y) => [104, 152].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="12" />))}
  </svg>
)

// Het symbool van de rubriek in een rustig vlak (zoals de rij in Zoeken en de kop in de app).
export function RubriekTegel({ rubriek }) {
  const Icon = INTEREST_ICONS[rubriek]
  return <span className="volgtegel" aria-hidden="true">{Icon ? <Icon size={18} /> : null}</span>
}

// Een verhaal: de kop, en eronder de bron met "+N bronnen" (en "Buiten je bronnen" als het niet van jouw bronnen is).
export function VerhaalRij({ v, compact = false, onOpen = null }) {
  const { sourcesById } = useHoot()
  const bron = sourcesById?.get(v.bron)
  const meer = TEKST.bronnen(v.bronnen)
  const inhoud = (
    <>
      <span className={`${compact ? 'volgrij__kop--klein' : 'head-4'} volgrij__kop`}>{v.kop}</span>
      <span className="volgrij__meta">
        {bron ? <SourceMark source={bron} size={20} /> : null}
        <span className="volgrij__bron">{bron?.name || v.bron}</span>
        {meer ? <span className="volgrij__meer">{meer}</span> : null}
        {v.buiten ? <span className="volgrij__buiten">Buiten je bronnen</span> : null}
      </span>
    </>
  )
  if (onOpen) return <button type="button" className="volgrij" onClick={onOpen}>{inhoud}</button>
  return v.url ? <a className="volgrij" href={v.url} rel="noreferrer">{inhoud}</a> : <div className="volgrij">{inhoud}</div>
}

// De knop Volgend als menu, zoals in de app: Stuur bij, Deel, en apart Stop met volgen. Eén tik ontvolgt nooit per ongeluk.
export function VolgendKnop({ zaak, onStuurBij }) {
  const { ontvolgZaak, share } = useHoot()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const id = useId()
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) ref.current?.focus({ preventScroll: true })
  }
  return (
    <>
      <button type="button" ref={ref} className="volgend" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}>
        <CheckIcon size={14} />
        <span>{TEKST.volgend}</span>
        <CaretIcon dir="down" size={12} />
      </button>
      {open ? (
        <Popmenu anchor={ref} id={id} label={TEKST.volgend} onClose={close}>
          {onStuurBij ? (
            <button type="button" role="menuitem" className="popmenu__item" onClick={() => { close(false); onStuurBij() }}>
              <span>{TEKST.stuurBij}</span>
              <Potlood />
            </button>
          ) : null}
          {share ? (
            <button type="button" role="menuitem" className="popmenu__item" onClick={() => { close(); share({ title: zaak.label, url: deelLink(zaak.slug) }) }}>
              <span>{TEKST.deel}</span>
              <ShareIcon size={ICON_SM} />
            </button>
          ) : null}
          <div role="separator" className="popmenu__sep" />
          <button type="button" role="menuitem" className="popmenu__item volg__stop" onClick={() => { close(false); ontvolgZaak(zaak.slug) }}>
            <span>{TEKST.stop}</span>
            <MinCirkel />
          </button>
        </Popmenu>
      ) : null}
    </>
  )
}

// De knop onder de naam: Volg, Volgend (menu), of bij drie "Je volgt er al drie." met Beheer.
export function VolgKnop({ zaak, onStuurBij }) {
  const { volgzaken, volgZaak, openBeheer } = useHoot()
  if (volgtSlug(volgzaken, zaak.slug)) return <VolgendKnop zaak={zaak} onStuurBij={onStuurBij} />
  if (isVol(volgzaken))
    return (
      <div className="volgkop__vol">
        <p className="volgkop__regel">{TEKST.alDrie}</p>
        <button type="button" className="pill pill--sm hit" onClick={openBeheer}>{TEKST.beheer}</button>
      </div>
    )
  return (
    <button type="button" className="btn btn--accent volgknop" onClick={() => volgZaak({ slug: zaak.slug, label: zaak.label })}>
      <PlusIcon />
      {TEKST.volg}
    </button>
  )
}

// De kop van De Redacteur boven de treffers. `antwoord`: wat /api/volgzaak duiden gaf. `onKies`: opnieuw duiden met een
// keuze uit Bedoel je of binnen een rubriek.
export function VolgKop({ antwoord, onKies, onStuurBij }) {
  const { openStory, storiesById, sourcesById, muted, setMuted } = useHoot()
  if (!antwoord) return null
  if (antwoord.soort === 'geen') return <p className="volgkop__stil">{TEKST.geen}</p>
  if (antwoord.soort === 'bedoel' && antwoord.keuzes?.length)
    return (
      <section className="volgkop" aria-label={TEKST.bedoelJe}>
        <h2 className="label label--section volgkop__label">{TEKST.bedoelJe}</h2>
        <ul className="volgkop__keuzes">
          {antwoord.keuzes.map((k) => (
            <li key={k.opdracht || k.naam}>
              <button type="button" className="volgkeuze" onClick={() => onKies(k.opdracht || k.naam)}>
                <span className="volgkeuze__tekst">
                  <span className="volgkeuze__naam">{k.naam}</span>
                  {k.regel ? <span className="volgkeuze__regel">{k.regel}</span> : null}
                </span>
                <CaretIcon size={ICON_SM} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  if (antwoord.soort === 'rubriek') {
    const naam = rubriekNaam(antwoord.rubriek) || antwoord.rubriek
    return (
      <section className="volgkop" aria-label={naam}>
        <div className="volgkop__kop">
          <RubriekTegel rubriek={antwoord.rubriek} />
          <div className="volgkop__titels">
            <h2 className="head-5 volgkop__naam">{TEKST.heleRubriek(naam)}</h2>
          </div>
        </div>
        <a className="pill pill--sm hit volgkop__naar" href={toHash('stroom', { rubriek: antwoord.rubriek })}>{TEKST.naarRubriek(naam)}</a>
        {antwoord.binnen?.length ? (
          <ul className="volgkop__keuzes">
            {antwoord.binnen.map((k) => (
              <li key={k.opdracht || k.naam}>
                <button type="button" className="volgkeuze" onClick={() => onKies(k.opdracht || k.naam)}>
                  <span className="volgkeuze__tekst">
                    <span className="volgkeuze__naam">{k.naam}</span>
                    {k.regel ? <span className="volgkeuze__regel">{k.regel}</span> : null}
                  </span>
                  <CaretIcon size={ICON_SM} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    )
  }
  const z = antwoord.volgzaak
  if (!z?.slug) return null
  // Dunne dekking: je eigen bronnen schrijven er nauwelijks over. Dan een gratis bron in jouw taal, met Voeg toe.
  const all = [...(sourcesById?.values?.() || [])]
  const eigen = new Set(all.filter((s) => s.followed && !muted.has(s.id)).map((s) => s.id))
  const weinig = weinigInEigen(antwoord.bronnen, eigen)
  const tip = weinig ? gratisTip(antwoord.bronnen, all, eigen) : null
  return (
    <section className="volgkop" aria-label={z.label}>
      <div className="volgkop__kop">
        <RubriekTegel rubriek={z.rubriek} />
        <div className="volgkop__titels">
          <h2 className="head-5 volgkop__naam">{z.label}</h2>
          {z.regel ? <p className="volgkop__regel">{z.regel}</p> : null}
        </div>
      </div>
      <div className="volgkop__knop">
        <VolgKnop zaak={z} onStuurBij={onStuurBij} />
      </div>
      {weinig ? (
        <div className="volgkop__weinig">
          <h3 className="label label--section volgkop__label">{TEKST.weinig}</h3>
          {tip ? (
            <p className="volgkop__tip">
              <span>{TEKST.tip(tip.name)}</span>
              <button type="button" className="linkbtn linkbtn--plain" onClick={() => setMuted(tip.id, true)}>{TEKST.voegToe}</button>
            </p>
          ) : null}
        </div>
      ) : antwoord.eerder?.length ? (
        <>
          <h3 className="label label--section volgkop__label">{TEKST.erSpeeldeAl}</h3>
          <div className="volgkop__lijst">
            {antwoord.eerder.map((e) => (
              <VerhaalRij key={e.verhaal} compact v={{ verhaal: e.verhaal, kop: e.kop, bron: e.bron, bronnen: e.bronnen, url: null }} onOpen={storiesById?.has(e.verhaal) ? () => openStory(e.verhaal) : null} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

// Zoeken zonder zoekterm: wat je volgt, één rij per volgzaak, "Nieuw" of "Niets nieuws" (nooit een getal), wat nieuw is
// bovenaan (vast zolang je kijkt). Rechts Wijzig naar het beheerblad.
export function JeVolgtSectie() {
  const { volgzaken, openVolg, openBeheer } = useHoot()
  const lijst = actief(volgzaken)
  const sleutel = lijst.map((z) => z.slug).join(',')
  const [overzicht, setOverzicht] = useState(null)
  useEffect(() => {
    if (!sleutel) return undefined
    let weg = false
    vraagVolgzaak('overzicht', { slugs: sleutel.split(',') }).then((r) => !weg && setOverzicht(r.status === 200 ? r.data?.overzicht || {} : {}))
    return () => {
      weg = true
    }
  }, [sleutel])
  // De volgorde ligt vast zodra het overzicht er is.
  const [vast, setVast] = useState(null)
  useEffect(() => {
    if (overzicht) setVast(inVolgorde(volgzaken, overzicht).map((z) => z.slug))
  }, [overzicht]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!lijst.length) return null
  const rijen = inVolgorde(volgzaken, overzicht || {})
  const geordend = vast ? [...vast.map((s) => rijen.find((r) => r.slug === s)).filter(Boolean), ...rijen.filter((r) => !vast.includes(r.slug))] : rijen
  return (
    <section className="jevolgt" aria-labelledby="jevolgt-kop">
      <div className="jevolgt__kop">
        <h2 id="jevolgt-kop" className="label label--section">{TEKST.jeVolgt}</h2>
        <button type="button" className="linkbtn linkbtn--plain jevolgt__wijzig" onClick={openBeheer}>{TEKST.wijzig}</button>
      </div>
      <ul className="jevolgt__lijst">
        {geordend.map((z) => (
          <li key={z.slug}>
            <button type="button" className="jevolgt__rij" onClick={() => openVolg(z.slug)}>
              <span className="jevolgt__tekst">
                <span className="jevolgt__naam">{z.label}</span>
                <span className={`jevolgt__stand${z.nieuw ? ' is-nieuw' : ''}`}>{nieuwTekst(z.nieuw)}</span>
              </span>
              <CaretIcon size={ICON_SM} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// Het beheerblad "Je volgt": hooguit drie, stoppen met een knop, slepen (of Alt en een pijltje) voor de volgorde; wat stopte
// staat nog een week onder Gestopt, met Volg weer.
export function BeheerBlad({ open, onClose, volgzaken = [], onStop, onMove, onVolg }) {
  const lijst = actief(volgzaken)
  const weg = gestopt(volgzaken)
  const [sleep, setSleep] = useState(null)
  const zet = (van, naar) => onMove(van, Math.max(0, Math.min(lijst.length - 1, naar)))
  return (
    <Dialog open={open} onClose={onClose} className="sheet--volg" labelledBy="beheer-titel">
      <div className="beheer__kop">
        <h2 id="beheer-titel" className="head-lg beheer__titel">{TEKST.jeVolgt}</h2>
        <button type="button" className="linkbtn linkbtn--plain beheer__klaar" onClick={onClose}>{TEKST.klaar}</button>
      </div>
      {lijst.length ? (
        <ul className="beheer__lijst">
          {lijst.map((z, i) => (
            <li
              key={z.slug}
              className={`beheer__rij${sleep === i ? ' is-sleep' : ''}`}
              draggable
              onDragStart={(e) => { setSleep(i); e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => { e.preventDefault(); if (sleep != null && sleep !== i) { zet(sleep, i); setSleep(i) } }}
              onDragEnd={() => setSleep(null)}
            >
              <button type="button" className="iconbtn beheer__greep" aria-label={`${z.label} verplaatsen`} title="Sleep om te verplaatsen" onKeyDown={(e) => { if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); zet(i, i - 1) } if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); zet(i, i + 1) } }}>
                <Greep />
              </button>
              <span className="beheer__naam">{z.label}</span>
              <button type="button" className="beheer__stop" onClick={() => onStop(z.slug)}>
                {TEKST.stop}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="beheer__leeg">{TEKST.nietsNieuws}</p>
      )}
      {weg.length ? (
        <>
          <h3 className="label label--section beheer__label">{TEKST.gestopt}</h3>
          <ul className="beheer__lijst">
            {weg.map((z) => (
              <li key={z.slug} className="beheer__rij is-gestopt">
                <span className="beheer__naam">{z.label}</span>
                <button type="button" className="pill pill--sm hit" onClick={() => onVolg({ slug: z.slug, label: z.label })}>{TEKST.volgWeer}</button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Dialog>
  )
}

// Stuur bij: hoe Hoot het leest (Let op en Niet, als gewone tekst als de server ze meegeeft) en één veld "Zeg het scherper".
// Gedeeld: komt er een andere volgzaak uit, dan volg je voortaan die. Je gewone zoekterm wijst naar de gewone volgzaak.
export function StuurBijBlad({ zaak, open, onClose, onKlaar }) {
  const { tokenVan, volgWissel } = useHoot()
  const [tekst, setTekst] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')
  useEffect(() => {
    if (open) {
      setTekst('')
      setFout('')
    }
  }, [open])
  const stuur = async (e) => {
    e.preventDefault()
    if (!tekst.trim() || bezig) return
    setBezig(true)
    setFout('')
    const r = await vraagVolgzaak('bijsturen', { slug: zaak.slug, scherper: tekst.trim() }, { token: await tokenVan?.() })
    setBezig(false)
    if (r.status !== 200 || !r.data) return setFout(r.data?.error || TEKST.mislukt)
    if (r.data.naar && r.data.volgzaak) {
      volgWissel(zaak.slug, { slug: r.data.naar, label: r.data.volgzaak.label })
      onKlaar?.(r.data.naar)
    } else if (r.data.soort === 'geen') return setFout(r.data.tekst || TEKST.geen)
    onClose()
  }
  const chips = (titel, lijst) =>
    lijst?.length ? (
      <div className="stuurbij__groep">
        <h3 className="label label--section">{titel}</h3>
        <p className="stuurbij__chips">{lijst.map((n) => <span key={n} className="stuurbij__chip">{n}</span>)}</p>
      </div>
    ) : null
  return (
    <Dialog open={open} onClose={onClose} className="sheet--volg" labelledBy="stuurbij-titel">
      <div className="beheer__kop">
        <h2 id="stuurbij-titel" className="head-lg beheer__titel">{TEKST.stuurBij}</h2>
        <button type="button" className="iconbtn" onClick={onClose} aria-label="Sluiten">
          <CloseIcon />
        </button>
      </div>
      {zaak.regel ? <p className="stuurbij__regel">{zaak.regel}</p> : null}
      {chips(TEKST.letOp, zaak.namen)}
      {chips(TEKST.niet, zaak.uit)}
      <form className="stuurbij__form" onSubmit={stuur}>
        <label className="label label--section" htmlFor="stuurbij-veld">{TEKST.scherper}</label>
        <input id="stuurbij-veld" className="input" value={tekst} onChange={(e) => setTekst(e.target.value)} maxLength={200} autoComplete="off" enterKeyHint="send" />
        {fout ? <p className="stuurbij__fout" role="status">{fout}</p> : null}
        <button type="submit" className="btn" aria-busy={bezig} disabled={!tekst.trim()}>{TEKST.stuurBij}</button>
      </form>
    </Dialog>
  )
}

