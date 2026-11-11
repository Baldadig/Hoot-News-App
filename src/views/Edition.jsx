import { hasEditionMinimum } from '../../shared/edition-limits.mjs'
import { kantenTip } from '../lib/kanten-tip.js'
import MaakVanJou from '../components/MaakVanJou.jsx'
import { pastThird } from '../lib/maak-van-jou.js'
import { EditionNumber } from '../components/EditionNumber.jsx'
import { useEffect, useRef, useState } from 'react'
import { usePairs } from '../hooks/usePairs.js'
import { usePhone } from '../hooks/usePhone.js'
import { ViewHeader, StatusLine, LoadError, Empty } from '../components/Shell.jsx'
import { LoadLinesBox, LoadLinesLayer, useLoadLines } from '../components/LoadLines.jsx'
import { TienLayer, TienSpace, useTien } from '../components/FirstEdition.jsx'
import { LeadStory, CompactItem, KaartItem, Meta, useHoot, linkOf, itemsOfEntry, aboutOf, viaLength, bronnenLabel } from '../components/Items.jsx'
import { Img } from '../components/Img.jsx'
import { Beeld, PlaceholderList } from '../components/Beeld.jsx'
import { EditionArt, SparkleIcon, CaretIcon, CloseIcon, ICON_SM } from '../components/icons.jsx'
import { BriefReader } from '../components/BriefReader.jsx'
import { BrandLogo } from '../components/Brand.jsx'
import { KopSun, EindeSun } from '../components/SunArt.jsx'
import Weather from '../components/Weather.jsx'
import { longDate } from '../lib/time.js'
import { useScrollMemory } from '../hooks/useScrollMemory.js'
import { eindzin } from '../../shared/eindzin.mjs'
import { tel } from '../lib/tel.js'
import { watch } from '../lib/inview.js'
import { resolveEditionEntry, heroFirst, numberRows, countOf, EDITION_SIZE, upNext } from '../lib/edition.js'
import { SLOTS } from '../../shared/slots.mjs'
import { fitsHero } from '../lib/img.js'
import { followedNow } from '../lib/follow.js'
import { TermHelp } from '../components/Terms.jsx'
import { Why, whyLine } from '../components/Why.js'
import { labelFor } from '../lib/label.js'
import { INTRO_LINES, KAART_LINES } from '../../shared/zinnen.mjs'
import { cardIntro } from '../../shared/kaart-intro.mjs'
import { usePrintEdition, markPrinted } from '../hooks/usePrintEdition.js'
import { useIntroMax, useColumnWidth, useShrinkToFit, shrunk } from '../lib/intro.js'
import { usePullHorizon } from '../components/PullHorizon.jsx'

// Rubriek van elke plek in de editie (komt van de server), als label boven het verhaal. Zelfde
// namen als DESK_NAMES in shared/editor.mjs; 'regio' is de plek die De Redacteur uit je regionale
// bronnen vult.
const DESK = { binnenland: 'Binnenland', buitenland: 'Buitenland', vs: 'VS', middenoosten: 'Midden-Oosten', oekraine: 'Oekraïne', wetenschap: 'Wetenschap', tech: 'Tech', economie: 'Economie', regio: 'Regio', bubbel: 'Buiten je bubbel', extern: 'Buiten je bronnen' }
const VIA = { google: 'Google Trends', bluesky: 'Bluesky', wikipedia: 'Wikipedia' }
const deskLabel = (e) => (e.desk === 'bubbel' && e.terms?.length ? `Buiten je bubbel · via ${[...new Set(e.terms.map((t) => VIA[t.via] || t.via))].join(' en ')}` : DESK[e.desk] || null)

const FRONT = 6 // op de telefoon: na zes verhalen "Verder in deze Editie"
const SIDE = 3 // breed: het hoofdverhaal met 02 en 03 ernaast, daarna de paren

// Klein verhaal op de voorpagina: rubriek, kop en hooguit twee regels samenvatting (ook bij een
// lange kop: die vertelt zelden wat er gebeurde), dan dezelfde actieregel als elk bericht. Is de
// kolom smal, dan krijgt de bron een eigen regel en staan vergelijken en bewaren eronder.
// Volg je het verhaal, dan staat dat stil achter de rubriek ('Je volgt'). Het waarom van de plek
// (jouw Editie) staat als stille regel onder de rubriek, boven de kop (zie Why.js).
// `boven`: breed, in een paar dat anders een gat laat (Edition: usePairs). Het beeld staat dan groot
// boven het verhaal, precies zo hoog als het paar nodig heeft, in plaats van klein naast de kop.
// De kolom van de intro in een FrontItem: de tekstkolom naast het beeld, of (zijkolom, breed) de hele link.
const introColumn = (link) => {
  const text = link.querySelector('.fitem__text')
  return text && getComputedStyle(text).display !== 'contents' ? text.getBoundingClientRect().width : link.getBoundingClientRect().width
}
function FrontItem({ item, story, note, n = null, why = null, followed, taste, outside = false, boven = null, whySpace = false }) {
  const { markRead, read, prefs } = useHoot()
  const opinie = item.type === 'opinie'
  const title = item.title
  // De miniatuur staat er altijd (het beeld of het placeholderbeeld), behalve met beelden uit: dan de hele breedte.
  // Gemeten is gemeten: de echte breedte van de tekstkolom (useColumnWidth). Tot die er is, de smalste maat.
  // In de zijkolom naast het hoofdverhaal (breed) staat de intro onder kop en beeld, over de hele kolom: dan
  // is .fitem__text 'display: contents' en telt de breedte van de link (zie .front__side in styles.css).
  const linkRef = useRef(null)
  const width = useColumnWidth(linkRef, introColumn)
  const fit = useIntroMax()(INTRO_LINES, (prefs?.images ?? 'aan') === 'aan' ? 'voorpagina' : 'rij', false, width)
  // Knipt de clamp toch (smalle zijkolom), dan een halve regel kleiner (useShrinkToFit).
  const sumRef = useRef(null)
  const step = useShrinkToFit(sumRef, `${item.id}|${width}`)
  // Hele zinnen, nooit "…"; past de eigen intro niet, dan de reserve uit hetzelfde verhaal (cardIntro).
  // Vangnet op een gemeten kolom: is er dan nog niets, dan mag één lange eerste zin twee regels doorlopen
  // in plaats van één (de clamp gaat mee: fitem__sum--rek). Liever een regel langer dan een leeg vlak.
  const maat = shrunk(fit, step)
  const gewoon = cardIntro(item, maat)
  const rek = !gewoon.text && width > 0 && !step ? cardIntro(item, { max: maat.max, rek: maat.rek + (fit.rek - fit.max) }) : null
  const { text: summary, via } = rek?.text ? rek : gewoon
  return (
    <article className={`entry fitem${read.has(item.id) ? ' is-read' : ''}${boven ? ' fitem--boven' : ''}`} data-id={item.id} style={boven ? { '--boven-h': `${boven}px` } : undefined}>
      {boven && item.image ? (
        <a className="fitem__boven" href={linkOf(item)} rel="noreferrer" tabIndex={-1} aria-hidden="true" onClick={() => markRead(item.id)}>
          <Img url={item.image} kind="lead" />
        </a>
      ) : null}
      {n || note || opinie || followed ? (
        <p className="label label--kicker kicker">
          {n ? <EditionNumber n={n} /> : null}
          {note ? <span>{note}</span> : null}
          {opinie ? <span className="kicker__type">Opinie</span> : null}
          {followed ? <span className="label--meta front__followed">{followed}</span> : null}
        </p>
      ) : null}
      <Why why={why} />
      {whySpace && !whyLine(why) ? <p className="why why--leeg" aria-hidden="true">&nbsp;</p> : null}
      <a className="fitem__link" ref={linkRef} href={linkOf(item)} rel="noreferrer" onClick={() => markRead(item.id)}>
        <span className="fitem__text">
          <span className="head-4 fitem__title" role="heading" aria-level="3">
            {title}
          </span>
          {summary ? (
            <span className={`clamp clamp--vangnet fitem__sum${rek?.text ? ' fitem__sum--rek' : ''}`} ref={sumRef}>
              {summary}
              {via ? <span className="via"> — via {via}</span> : null}
            </span>
          ) : null}
        </span>
        {!boven ? <Beeld item={item} kind="krant" as="span" className="thumb" width="96" height="64" /> : null}
      </a>
      <TermHelp text={`${title} ${summary || ''}`} max={1} />
      <Meta item={item} story={story} taste={taste} outside={outside} />
    </article>
  )
}

// Een verhaal waar je "minder hiervan" op zei: ingeklapt tot één regel, met de weg terug.
function LessNote({ entryKey, item, story, n }) {
  const { undoLess, itemsById } = useHoot()
  const items = itemsOfEntry(item, story, itemsById)
  return (
    <p className="lessnote" role="status">
      <EditionNumber n={n} />
      <span>Je ziet minder over {aboutOf(items)}.</span>
      <button type="button" className="linkbtn linkbtn--plain lessnote__undo" onClick={() => undoLess(entryKey, items)}>
        Ongedaan maken
      </button>
    </p>
  )
}
// Elke plek: het verhaal zelf, of ingeklapt als je er minder van wilde.
const Slot = ({ less, row, children }) => (less.includes(row.key) ? <LessNote n={row.n} entryKey={row.key} item={row.item} story={row.story} /> : children)

export default function Edition({ active, edition, bubble = [], brief = null, briefNote = null, briefForMembers = false, onJoin, hint = false, onHintDone, tien: tienStart = null, onTienDone, loading, failedLoad, statusProps, onRefresh, refreshing, browsing = false, onMakeYours, onLater }) {
  const { itemsById, storiesById, muted, followStories, newInStory, openStory, less, account, prefs, sourcesById, setPref } = useHoot()
  const following = followedNow(followStories, storiesById, newInStory)
  const ref = useRef(null)
  const phone = usePhone() // telefoon: de Stroom-vorm met kaart A+ (src/styles/kaart.css); breder houdt de krant-vormen

  // Elke plek van de editie: het gepubliceerde bericht (vast) met de bundel erachter. Alle plekken
  // blijven staan; een bron die je niet volgt krijgt een label (behalve "Buiten je bubbel", dat
  // daar juist voor is). Jouw Editie geeft elke plek een waarom (`why`, bouwspec §6); de algemene
  // Editie en een Editie van vóór het waarom hebben er geen, en tonen dus niets extra.
  const published = new Map((edition?.items || []).map((i) => [i.id, i]))
  const placed = (edition?.entries || [])
    .map((e, index) => {
      if (e.desk === 'bubbel' && prefs?.bubble === false) return null
      const r = resolveEditionEntry(e, { storiesById, itemsById, published, muted })
      if (!r) return null
      // Het aantal bronnen staat in de bronregel ("5 bronnen ›"), niet nog eens in de rubriek (E6).
      const label = e.desk === 'breed' ? 'Waar iedereen over schrijft' : deskLabel({ ...e, desk: r.desk })
      // Het label (lib/label.js): de interesse van de lezer als het verhaal die echt draagt, anders de rubriek;
      // de waarom-regel alleen als die iets toevoegt; 'Buiten je bronnen' staat bij de bronregel.
      const l = labelFor({ topics: r.item.topics, mainTopics: r.item.mainTopics, follows: prefs?.topics || [], cat: sourcesById?.get(r.item.source)?.cat, desk: r.desk, deskLabel: label, why: e.why, followed: r.followed || ['bubbel', 'breed'].includes(e.desk) })
      return { key: e.id, index, desk: e.desk, item: r.item, story: r.story, note: l.kicker || 'Nieuws', why: l.why, outside: l.outside }
    })
    .filter(Boolean)
  // De telling (numberRows): elke rij krijgt zijn nummer in de getoonde volgorde; N is het totaal.
  const numbered = numberRows(heroFirst(placed, fitsHero))
  const rows = numbered.filter(r=>r.desk !== 'bubbel')
  const editionBubble = numbered.filter(r=>r.desk === 'bubbel')
  const count = countOf(rows)
  const hasMinimum = hasEditionMinimum(count)
  const hasPersonalLabel = !!edition?.personal && ['interests','topics','favorites'].some(k=>prefs?.[k]?.length)

  // Je volgt, zonder dubbelingen: een gevolgd verhaal dat op de voorpagina staat (en niet is
  // ingeklapt), krijgt daar 'Je volgt' achter de rubriek en valt uit het lijstje erboven. Wat je
  // volgt verandert niet; alleen waar het staat.
  const onFront = new Map() // plek → label
  const shown = new Set() // verhalen die al op de voorpagina staan
  for (const r of rows.slice(0, FRONT)) {
    const f = r.story && !less.includes(r.key) ? following.find((x) => x.story.id === r.story.id) : null
    if (!f) continue
    onFront.set(r.key, f.fresh ? `Je volgt · ${f.fresh} nieuw` : 'Je volgt')
    shown.add(f.story.id)
  }
  const followingRest = following.filter((f) => !shown.has(f.story.id))

  const [reading, setReading] = useState(false)
  const hasBrief = !!(brief?.sections?.length || brief?.text)

  useScrollMemory(ref, 'hoot:pos-editie:' + (edition?.id || ''), rows.length > 0, rows.length, active)

  // Wie snel begon ("Liever meteen lezen"): na ongeveer een derde van de Editie één keer "Maak Hoot van jou".
  const [nudge, setNudge] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !browsing || !active || nudge) return
    const onScroll = () => pastThird(el) && setNudge(true)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [browsing, active, nudge])

  const title = SLOTS[edition?.slot]?.naam || 'Editie' // de naam van het dagdeel (shared/slots.mjs)
  const ready = !loading && !failedLoad && rows.length > 0
  // Gemeten (src/lib/tel.js): het einde ("Je bent bij.") komt in beeld, één keer per dagdeel op dit toestel.
  const endRef = useRef(null)
  const dagdeel = edition?.date && edition?.slot ? `${edition.date}-${edition.slot}` : null
  useEffect(() => {
    if (!active || !dagdeel || !hasMinimum || !ready) return undefined
    return watch(endRef.current, { threshold: 0.5 }, (e) => e.isIntersecting && tel('editie-einde', dagdeel))
  }, [active, dagdeel, hasMinimum, ready])

  // Eerste laden: de laadstrepen. Klaar: het bovenste vel wordt de kopstreep, de andere drie de
  // onderlijnen van de kop van het hoofdverhaal (src/lib/load-lines.js); dan geen tweede "druk".
  const hostRef = useRef(null)
  // Je eerste Editie, na het welkom: "Tien en de bubbel" (src/lib/tien.js) in plaats van de laadstrepen.
  const tien = useTien(tienStart, { loading, failed: !!failedLoad })
  const lines = useLoadLines(loading && !tien.active, ready)
  const pull = usePullHorizon(ref, { onRefresh, busy: refreshing, failed: statusProps?.refreshError, label: 'Editie', enabled: ready })
  const sub = edition ? longDate(edition.date).replace(/^./, (c) => c.toUpperCase()) : null

  // Meer kanten van één verhaal (keuze r5-kanten-welkom, 5 november; review G4): één keer een rustige
  // tip bij het eerste verhaal met meer bronnen. Weg met de X of zodra je vergelijkt (App.jsx openStory);
  // daarna nooit meer. Niet tegelijk met de uitleg na het eerste Welkom.
  const kanten = kantenTip({ rows, done: !!prefs?.kantenTip })
  const endKanten = () => setPref('kantenTip', true)

  // Eén keer na het eerste Welkom: wat "Jouw Editie" in de metaregel betekent (src/lib/welcome.js).
  // Hij gaat weg met de X, of vanzelf zodra je de Editie verlaat nadat je hem zag.
  const showHint = hint && ready && hasPersonalLabel
  const hintSeen = useRef(false)
  if (showHint && active) hintSeen.current = true
  useEffect(() => {
    if (!active && hintSeen.current) onHintDone?.()
  }, [active, onHintDone])

  usePrintEdition(ref, edition?.id, active, ready && rows.length > 0 && !lines.ending && !tien.active)
  // De bubbel ging al open: deze Editie geldt als gedrukt.
  useEffect(() => {
    if (tien.active && ready) markPrinted(edition?.id)
  }, [tien.active, ready, edition?.id])

  // Breed (A): het hoofdverhaal even hoog als zijn zijkolom. De paren krijgen geen groot beeld meer
  // boven het kortere verhaal (poetsbeurt 5 november: elke rij dezelfde opbouw, kop links en een
  // klein beeld rechts op één hoogte, zie src/styles/rust.css); usePairs meet nog wel de voorpagina.
  const frontRef = useRef(null)
  const pairsRef = useRef(null)
  usePairs(pairsRef, frontRef, active && ready && !phone, rows.slice(SIDE).map((r) => r.key).join(','))

  // Buiten je bubbel: een eigen katern. Breed (twee kolommen) staat hij in het raster van de paren,
  // naast de laatste plek als die alleen staat (bubble--naast), anders op een eigen rij; smaller
  // en op de telefoon onder de Editie, zoals altijd.
  const bubbleInGrid = !phone && rows.length > SIDE
  const bubbleNaast = (rows.length - SIDE) % 2 === 1
  const bubbleKatern = editionBubble.length ? (
    <section className={`bubble${bubbleInGrid ? ` bubble--katern ${bubbleNaast ? 'bubble--naast' : 'bubble--rij'}` : ''}`} aria-label="Buiten je bubbel">
      <h2 className="label label--section front__more">Buiten je bubbel</h2>
      <p className="hint bubble__hint">Een verhaal naast je Editie.</p>
      <PlaceholderList rows={editionBubble.map((r) => ({ item: r.item, kind: phone ? 'tijdlijn' : 'krant' }))}>
      {editionBubble.map(r=><Slot key={r.key} less={less} row={r}>{phone ? <KaartItem item={r.item} story={r.story} note={r.note?.replace(/^Buiten je bubbel(?: · )?/, '') || null} why={r.why} outside={r.outside} taste={r.key} lines={KAART_LINES} /> : <CompactItem item={r.item} story={r.story} note={r.note?.replace(/^Buiten je bubbel(?: · )?/, '') || null} why={r.why} outside={r.outside} taste={r.key} plain />}</Slot>)}
      </PlaceholderList>
    </section>
  ) : null

  return (
    <section className="view" hidden={!active} ref={ref} aria-label="Editie">
      {pull}
      <div className={`col col--wide col--front${tien.active ? tien.hostClass : lines.hostClass}`} ref={hostRef}>
        <TienLayer tien={tien} host={hostRef} onDone={onTienDone} />
        <LoadLinesLayer lines={lines} host={hostRef}  land={phone ? '.kaarten .kaart__title--lead' : '.front .lead__title'} rule=".edrule" onLand={() => markPrinted(edition?.id)} />
        {/* De kop van de Editie: titel en één metaregel (datum · weer · wiens Editie); de inktlijn
            eronder is het begin van het nieuws. Eén blok, zodat de kleur "Inkt" er een band van kan
            maken. De ingang naar het overzicht staat ónder de lijn, als stille bedieningsrij. */}
        <div className="edtop">
          {/* Het kleine woordmerk linksboven, zoals in de app (Wordmark in EditionView): je ziet waar
              je bent zonder dat het de krant overneemt, en het opstartscherm landt erop. Op breed
              scherm staat het in de zijbalk (.edbrand verdwijnt dan). */}
          <div className="edbrand">
            <BrandLogo height={20} />
          </div>
          <ViewHeader
            title={
              edition?.slot ? (
                <span className="edtitle">
                  <span className="edtitle__text">{title}</span>
                  {/* De kleine, stille zon: zijn hoogte toont het dagdeel (plan 01/05). */}
                  <KopSun slot={edition.slot} />
                </span>
              ) : (
                title
              )
            }
            sub={edition ? null : sub} onRefresh={onRefresh} refreshing={refreshing} refreshDesktop compare />
          {ready ? (
            <>
              <StatusLine {...statusProps} quiet />
              {/* De extra's van de Editiekop (weer, De Editie in één minuut, verversknop) staan alleen op breed scherm: de telefoon heeft dezelfde kop als de app. Eén metaregel, net als onder elke schermkop en zoals in de app: datum, het weer en
                  wiens Editie het is. Geen weer, dan valt het tussenstuk weg (en zijn punt). Waar
                  jouw Editie uit bestaat, staat bij Instellingen → Edities (en één keer als hint
                  onder de lijn, na het eerste Welkom). */}
              <p className="vh__sub edmeta">
                <span>{sub}</span>
                <span className="edmeta__wx desk-only">
                  <Weather />
                </span>
                {/* Geen "Jouw Editie" meer (Alex, 5 november: dat is het altijd). Alleen wat afwijkt, staat er. */}
                {hasPersonalLabel ? null : <span>{edition.personal ? 'Om te beginnen' : 'De Editie voor iedereen'}</span>}
              </p>
            </>
          ) : null}
          {ready ? <hr className="edrule" /> : null}
        </div>
        {showHint ? (
          <div className="edhint">
            <p className="hint">Jouw Editie: gekozen uit jouw bronnen en interesses.</p>
            <button type="button" className="iconbtn hit edhint__x" onClick={onHintDone} aria-label="Uitleg sluiten">
              <CloseIcon size={ICON_SM} />
            </button>
          </div>
        ) : null}
        {ready && hasMinimum && !showHint && kanten ? (
          <div className="edhint kantentip">
            <p className="hint">
              Meer kanten van één verhaal: bij ‘{bronnenLabel(kanten.n)}’ zie je hoe elke bron het brengt.{' '}
              <button type="button" className="linkbtn linkbtn--inline kantentip__go" onClick={() => (endKanten(), openStory(kanten.story.id, kanten.item.id))}>
                Vergelijk
              </button>
            </p>
            <button type="button" className="iconbtn hit edhint__x" onClick={endKanten} aria-label="Tip sluiten">
              <CloseIcon size={ICON_SM} />
            </button>
          </div>
        ) : null}
        {/* Een korte Editie zegt hoeveel verhalen er zijn: een hint onder de lijn, niet in de metaregel. */}
        {ready && hasMinimum && rows.length < EDITION_SIZE ? (
          <p className="hint edshort">
            {rows.length} {rows.length === 1 ? 'verhaal' : 'verhalen'}: er was niet meer passend nieuws beschikbaar
          </p>
        ) : null}
        {loading && tien.active ? (
          <TienSpace />
        ) : loading ? (
          <LoadLinesBox />
        ) : failedLoad ? (
          <LoadError what="editie" onRetry={onRefresh} />
        ) : rows.length === 0 ? (
          <Empty art={EditionArt}
            title="Er is nog geen Editie"
            action={
              <a className="btn" href="#/stroom">
                Naar de Stroom
              </a>
            }
          >
            Er zijn te weinig verse verhalen om een Editie van te maken. In de Stroom staat alles wat er wél is.
          </Empty>
        ) : (
          <>
            {followingRest.length ? (
              <section className="following" aria-label="Verhalen die je volgt">
                <h2 className="label label--section following__head">Je volgt</h2>
                <ul>
                  {followingRest.map((f) => (
                    <li key={f.id}>
                      <button type="button" className="following__row" onClick={() => openStory(f.story.id)}>
                        <span className="head-4 following__title">{f.title}</span>
                        <span className={`following__new${f.fresh ? ' is-new' : ''}`}>{f.fresh ? `${f.fresh} nieuw` : 'niets nieuws'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {/* Voorpagina: het hoofdverhaal groot, daarnaast drie kleinere — altijd in krant-vorm.
                Is het raam niet breder dan 48rem (telefoon, tablet staand, of met het vergelijkpaneel open), dan staan ze onder elkaar. */}
            {!hasMinimum ? <Empty title="Nog geen Editie" action={<a className="linkbtn" href="#/stroom">Naar de Stroom</a>}>Er is nog te weinig passend nieuws voor een Editie.</Empty> : null}
            {/* Het raster (keuze 1.1.0). Telefoon: alles onder elkaar, na zes "Verder in deze Editie".
                Tablet staand (B): één leeskolom met de nummers in de kantlijn. Breed (A): het
                hoofdverhaal met 02 en 03 ernaast (het beeld rekt mee tot de zijkolom even hoog is),
                daarna paren in twee kolommen, elk paar even hoog (usePairs). Koppen breken nooit af. */}
            {/* Welk placeholderbeeld een beeldloze rij krijgt, hangt af van de rij erboven (Beeld.jsx). */}
            {phone ? (
              // Telefoon (kaart A+): alles onder elkaar in de Stroom-vorm; het hoofdverhaal met beeld tot de rand.
              // Na zes "Verder in deze Editie". Nummer en waarom staan in de kaart (KaartItem).
              <PlaceholderList rows={rows.map((r, i) => ({ item: r.item, kind: i === 0 ? 'lead' : 'tijdlijn' }))}>
                <div className="kaarten rows">
                  {rows.map((r, i) => [
                    i === FRONT ? (
                      <h2 key="verder" className="label label--section front__more kaarten__label">
                        Verder in deze Editie
                      </h2>
                    ) : null,
                    <Slot key={r.key} less={less} row={r}>
                      <KaartItem lead={i === 0} priority={i === 0 && active} n={r.n} item={r.item} story={r.story} note={r.note} why={r.why} outside={r.outside} followed={onFront.get(r.key)} taste={r.key} lines={KAART_LINES} />
                    </Slot>,
                  ])}
                </div>
              </PlaceholderList>
            ) : (
            <PlaceholderList rows={rows.map((r, i) => ({ item: r.item, kind: i === 0 ? 'lead' : 'krant' }))}>
            <div className="front" ref={frontRef}>
              <Slot less={less} row={rows[0]}>
                <LeadStory n={rows[0].n} item={rows[0].item} story={rows[0].story} note={rows[0].note} why={rows[0].why} outside={rows[0].outside} followed={onFront.get(rows[0].key)} priority={active} taste={rows[0].key} />
              </Slot>
              {rows.length > 1 ? (
                <div className="front__side rows">
                  {rows.slice(1, SIDE).map((r) => (
                    <Slot key={r.key} less={less} row={r}>
                      <FrontItem n={r.n} item={r.item} story={r.story} note={r.note} why={r.why} outside={r.outside} followed={onFront.get(r.key)} taste={r.key} />
                    </Slot>
                  ))}
                </div>
              ) : null}
            </div>
            {rows.length > SIDE ? (
              <div className="pairs rows" ref={pairsRef}>
                {rows.slice(SIDE).map((r, i, paired) => [
                  SIDE + i === FRONT ? (
                    <h2 key="verder" className="label label--section front__more pairs__label">
                      Verder in deze Editie
                    </h2>
                  ) : null,
                  <Slot key={r.key} less={less} row={r}>
                    <FrontItem n={r.n} item={r.item} story={r.story} note={r.note} why={r.why} outside={r.outside} followed={onFront.get(r.key)} taste={r.key} whySpace={!!whyLine(paired[i % 2 ? i - 1 : i + 1]?.why)} />
                  </Slot>,
                ])}
                {/* Buiten je bubbel als eigen katern in het raster: in de lege cel naast de laatste plek, of
                    (staat de laatste rij vol) op een eigen rij. Nooit plek 11: eigen kop, eigen lijn. */}
                {bubbleInGrid ? bubbleKatern : null}
              </div>
            ) : null}
            </PlaceholderList>
            )}
            {editionBubble.length && !bubbleInGrid ? bubbleKatern : null}
            {/* "De Editie in één minuut" staat onder het nieuws, vóór het einde (op iOS staat de rij er niet boven): het nieuws begint direct onder de lijn. */}
            {hasBrief ? (
              <button type="button" className="briefcta briefcta--end desk-only" onClick={() => setReading(true)} aria-haspopup="dialog">
                <span className="briefcta__icon" aria-hidden="true">
                  <SparkleIcon />
                </span>
                <span className="briefcta__text">
                  <span className="briefcta__title">De Editie in één minuut</span>
                  <span className="briefcta__sub">Samenvatting door AI, met de bronnen erbij</span>
                </span>
                <span className="briefcta__go" aria-hidden="true">
                  <CaretIcon size={ICON_SM} />
                </span>
              </button>
            ) : null}
            {!hasBrief && !briefForMembers && briefNote ? (
              // Het plafond voor vandaag is bereikt: dezelfde rij, zonder knop, met een rustige zin. Geen
              // hover of druk: de stijl staat hier, want styles.css is vastgelegd (tests/zacht-papier).
              <div className="briefcta briefcta--rust briefcta--end desk-only" role="status" style={{ background: 'none', cursor: 'default' }}>
                <span className="briefcta__icon" aria-hidden="true">
                  <SparkleIcon />
                </span>
                <span className="briefcta__text">
                  <span className="briefcta__title">De Editie in één minuut</span>
                  <span className="briefcta__sub">{briefNote}</span>
                </span>
              </div>
            ) : null}
            {!hasBrief && briefForMembers ? (
              // Zonder account: de knop opent het inlogblad. Ingelogd maar het account is er nog niet
              // helemaal (zeldzaam)? Dan brengt hij je naar Instellingen, waar je het opnieuw probeert.
              <button type="button" className="briefcta briefcta--end desk-only" onClick={onJoin} aria-haspopup={account?.status === 'out' ? 'dialog' : undefined}>
                <span className="briefcta__icon" aria-hidden="true">
                  <SparkleIcon />
                </span>
                <span className="briefcta__text">
                  <span className="briefcta__title">De Editie in één minuut</span>
                  <span className="briefcta__sub">Met een account</span>
                </span>
                <span className="briefcta__go" aria-hidden="true">
                  <CaretIcon size={ICON_SM} />
                </span>
              </button>
            ) : null}
            {hasMinimum ? (<div className="endcap" ref={endRef}>
              {/* De telling rond: "10 van 10" boven het merk, stil op rood (bij een korte Editie "7 van 7"). */}
              {count ? (
                <p className="endcap__count">
                  {count} van {count}
                </p>
              ) : null}
              {/* Het enige merkmoment tijdens het lezen: de zon komt één keer op (plan 01/05). */}
              <EindeSun className="endcap__sun" />
              <h2 className="head-5 endcap__title">{eindzin(edition.date, edition.slot)}</h2>
              <p className="endcap__text">
                Dit was de {title} van {longDate(edition.date)}.{upNext(edition.slot)}
              </p>
              {/* Het einde is leidend; verder lezen mag, als één rustige link (geen knop die je doortrekt). */}
              <a className="linkbtn endcap__more" href="#/stroom">
                Lees verder in de Stroom
              </a>
            </div>) : null}
            {nudge && browsing ? <MaakVanJou onChoose={onMakeYours} onLater={onLater} /> : null}
            {/* Het overzicht in één minuut: een dialoog, dus achteraan; hij neemt geen plek in de kolom. */}
            {hasBrief ? <BriefReader open={reading} onClose={() => setReading(false)} brief={brief} rows={rows} kicker={`${title} · ${longDate(edition.date)}`} /> : null}
          </>
        )}
      </div>
    </section>
  )
}
