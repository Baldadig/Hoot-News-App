import { cardIntro, ownIntro, viaCost, VIA_TEKEN } from '../../shared/kaart-intro.mjs'
import { CORRECTION_REASONS } from '../lib/corrections.mjs'
import { headlineTier } from '../../shared/edition-display.mjs'
import { Fragment, createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState } from 'react'
import { useStackWhenCramped } from '../hooks/useStackWhenCramped.js'
import { usePhone } from '../hooks/usePhone.js'
import { timeAgo, readTime } from '../lib/time.js'
import { BookmarkIcon, PlayIcon, MoreIcon, ShareIcon, CaretIcon, ICON_SM } from './icons.jsx'
import { portraitImage, cropStyle } from '../lib/image-meta.js'
import { shareLink } from '../lib/share.js'
import { topicById } from '../lib/topics.js'
import { savedKey, withLead } from '../lib/saved.js'
import { isReadItem } from '../../shared/stroom.mjs'
import { avatarUrl, fitsLarge, fitsHero, sharpHere, measuredOriginal } from '../lib/img.js'
import { Beeld } from './Beeld.jsx'
import { focusMenuNotice } from '../lib/popmenu-dismiss.js'
import { Popmenu } from './Popmenu.jsx'
import { TermHelp } from './Terms.jsx'
import { Img, MeasuredImg } from './Img.jsx'
// De meting hoort bij het origineel uit de feed: alleen als MeasuredImg dat toont (measuredOriginal) krijgt het
// vak de meetuitsnede. Een variant van de uitgever (de Volkskrant, Het Parool: 3:2 in plaats van het vierkant
// uit de feed) vult het vak zelf; met de uitsnede van het vierkant zou die zonder object-view-box (Safari)
// worden uitgerekt.
const gemeten = (item, kind) => (measuredOriginal(item, kind) ? ' media--measured' : '')
const uitsnede = (item, kind) => (measuredOriginal(item, kind) ? cropStyle(item) : undefined)
import { isPlayableVideo } from '../lib/video-fullscreen.js'
import { Video } from './Video.jsx'
import { Why } from './Why.js'
import { directVideo, withoutBareLinks } from '../../shared/bluesky.mjs'
import { safeHttpUrl } from '../../shared/util.mjs'
import { wholeSentences, INTRO_LINES, KAART_LINES } from '../../shared/zinnen.mjs'
import { useIntroMax } from '../lib/intro.js'
import { EditionNumber } from './EditionNumber.jsx'
import { useVouw } from '../lib/vouw.js'
import { opinieInStroom } from '../../shared/opinie.mjs'

// Bewaarde berichten komen uit opslag (dit toestel, of je account), niet vers van de server:
// ook daar alleen http(s) in een href. Zonder geldige link is het een link zonder doel.
export const linkOf = (item) => safeHttpUrl(item?.url) || undefined

// Alles wat een bericht nodig heeft om te handelen (bewaren, bron bekijken, verhaal openen).
export const HootContext = createContext(null)
export const useHoot = () => useContext(HootContext)

// HLS-video speelt alleen native in Safari/iOS; elders tonen we de poster en opent de post.
const CAN_HLS = typeof document !== 'undefined' && !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl')

// Het hoofdbeeld onthouden voor de volgende start (index.html laadt het dan alvast). Van de
// eigen beeld-CDN relatief (/.netlify/images?…), zodat het ook na een domeinwissel klopt.
const rememberLead = (e) => {
  try {
    const src = new URL(e.currentTarget.currentSrc)
    const u = src.origin === location.origin ? src.pathname + src.search : src.href
    localStorage.setItem('hoot:lcp', JSON.stringify({ u, at: Date.now() }))
  } catch {
    /* niet erg */
  }
}

// Zolang het logo niet binnen is (lazy, traag of kapot), staat het monogram: de eerste letter op de
// tint van de bron (BRAND-UPDATE §9). Het lichte vlak achter een logo komt pas als het logo er is,
// anders is het een lege schijf.
const markLoaded = (img) => { if (img?.complete && img.naturalWidth > 0) img.classList.add('is-loaded') }

export function SourceMark({ source, size = 24 }) {
  const letter = (source?.name || '?').trim().charAt(0)
  return (
    <span className={`mark${source?.avatarContain ? ' mark--logo' : ''}`} style={{ '--brand': source?.brandColor || 'var(--accent)', width: size, height: size, fontSize: size * 0.5 }} data-letter={letter} aria-hidden="true">
      {source?.avatar ? <img src={avatarUrl(source.avatar)} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" ref={markLoaded} onLoad={(e) => markLoaded(e.currentTarget)} onError={(e) => (e.currentTarget.hidden = true)} /> : null}
    </span>
  )
}

// Bron-gegevens van een bericht (de berichten dragen ze zelf, zodat bewaarde items compleet zijn).
const srcOf = (item) => ({ name: item.sourceName, avatar: item.avatar, avatarContain: item.avatarContain, brandColor: item.brandColor })

export function SaveButton({ id, kind = 'item', payload }) {
  const { saved, toggleSave } = useHoot()
  // Een verhaal dat intussen is samengegaan met een ander blijft bewaard onder zijn oude id.
  const key = savedKey(saved, id, payload)
  const on = !!key
  const text = on ? 'Bewaard, tik om te verwijderen' : 'Bewaar' // gelijk aan de app (Components.swift)
  return (
    <button type="button" className={`iconbtn save${on ? ' is-on' : ''}`} onClick={() => toggleSave(kind, key || id, payload)} aria-pressed={on} aria-label={text} title={text}>
      <BookmarkIcon filled={on} />
    </button>
  )
}

// Delen (src/lib/share.js): de link van de uitgever met de kop, via het deelblad van het toestel
// of anders het klembord — App.jsx meldt dan "Link gekopieerd". Zonder geldige link geen knop,
// zoals in de app (`if let link = item.link`). Staat naast bewaren, overal waar bewaren staat.
// `inMenu`: op de telefoon staat delen in het menu "…" (TasteButton), zoals in de app; hier blijft de knop
// dan alleen op breed scherm.
export function ShareButton({ item, label = 'bericht', inMenu = false }) {
  const { share } = useHoot()
  if (!share || !shareLink(item)) return null
  const text = `Deel dit ${label}`
  return (
    <button type="button" className={`iconbtn share${inMenu ? ' desk-only' : ''}`} onClick={() => share(item)} aria-label={text} title={text}>
      <ShareIcon />
    </button>
  )
}

// De rubriek boven de kop. In de Editie staat de telling vooraan (`n`: "01 · BUITENLAND", zie
// numberRows in src/lib/edition.js); de punt ertussen is die van .kicker.
function Kicker({ item, extra, followed, n = null }) {
  const bits = []
  if (n) bits.push(<EditionNumber key="n" n={n} />)
  if (extra) bits.push(<span key="x">{extra}</span>)
  if (opinieInStroom(item)) bits.push(<span key="t" className="kicker__type">Opinie</span>)
  if (item.section && !extra) bits.push(<span key="s">{item.section}</span>) // de rubriek van de Editie gaat voor die van de bron
  if (followed) bits.push(<span key="f" className="label--meta front__followed">{followed}</span>) // stil: een staat, geen rubriek
  return bits.length ? <p className="label label--kicker kicker">{bits}</p> : null
}

// Bronregel: logo, naam en tijd op één vaste plek, onder de kop en de samenvatting. Tikken
// toont alles van die bron.
// `outside`: de bron staat niet bij je bronnen; dat gaat op de regel voor de leestijd (de regel is smal).
export function SourceMeta({ item, outside = false }) {
  const { openSource, sourcesById } = useHoot()
  const paid = sourcesById?.get(item.source)?.paid
  return (
    <button type="button" className="srcbtn srcmeta" onClick={() => openSource(item.source)} aria-label={`Alles van ${item.sourceName} bekijken`}>
      <SourceMark source={srcOf(item)} size={24} />
      <span className="srcmeta__text">
        <span className="srcmeta__name">{item.sourceName}</span>
        <span className="srcmeta__time">
          <time dateTime={item.publishedAt || undefined}>{timeAgo(item.publishedAt)}</time>
          {item.readMin && !outside ? <span className="srcbtn__read"> · {readTime(item.readMin)}</span> : null}
          {paid ? <span className="srcbtn__read"> · Abonnement</span> : null}
          {outside ? <span className="srcbtn__read"> · Buiten je bronnen</span> : null}
        </span>
      </span>
    </button>
  )
}

// Het bronlabel: altijd het totaal, "1 bron" of "N bronnen" (de pijl staat ernaast als icoon).
export const bronnenLabel = (n) => `${n} ${n === 1 ? 'bron' : 'bronnen'}`

// Actieregel: vaste plekken — bron · vergelijken · meer of minder · delen · bewaren. Ontbreekt er
// een, dan blijft zijn plek leeg, zodat "Vergelijk", delen en bewaren in elke rij van een scherm
// op dezelfde x staan (een scherm zonder meer of minder heeft die plek niet, zie .meta). Delen en
// bewaren zijn op het web wat het contextmenu in de app is: elke rij heeft ze, zonder lang drukken.
export function Meta({ item, story, showSave = true, taste = null, outside = false }) {
  const { openStory, newInStory, voteOn, reportMistake } = useHoot()
  const fresh = story ? newInStory(story) : 0
  const others = story ? story.sourceCount - 1 : 0
  const metaRef = useStackWhenCramped(`${item.id}|${others}|${outside}`)
  // Op de telefoon zoals de app: Bewaar zichtbaar, de rest (delen, meer of minder, fout melden) onder "…".
  // Breed scherm houdt de knoppen naast elkaar.
  const hasMenu = !!(taste || voteOn || reportMistake) && item.kind !== 'post'
  useBronnenAchterTijd(metaRef, `${item.id}|${others}`)
  const compare = () => openStory(story.id, item.id)
  const compareLabel = `Vergelijk ${others + 1} bronnen${fresh ? `, ${fresh} nieuw` : ''}`
  return (
    <div className="meta" ref={metaRef}>
      {/* De bron, en in een smalle kolom het aantal bronnen klein achter de tijd ("1 uur geleden · 7 bronnen",
          src/styles/rust.css): daar staat het altijd, in plaats van als knop op een eigen regel. */}
      <span className="meta__src">
        <SourceMeta item={item} outside={outside} />
        {story && others > 0 ? (
          <button type="button" className="meta__bronnen" onClick={compare} aria-label={compareLabel}>
            {bronnenLabel(others + 1)}
          </button>
        ) : null}
      </span>
      {story && others > 0 ? (
        // Eén bronlabel, overal hetzelfde: het totaal, "6 bronnen ›", in --ink-2 (minder rood, keuze B).
        // Geen rood en geen tweede vorm ("Vergelijk", "+N") per breedte.
        <button type="button" className="linkbtn linkbtn--plain morebtn" onClick={compare} aria-label={compareLabel}>
          {fresh ? <span className="dot" aria-hidden="true" /> : null}
          <span>{bronnenLabel(others + 1)}</span>
          <CaretIcon size={ICON_SM} />
        </button>
      ) : null}
      {hasMenu ? <TasteButton entryKey={taste || story?.id || item.id} item={item} story={story} /> : null}
      <ShareButton item={item} inMenu={hasMenu} />
      {showSave ? story ? <SaveButton id={story.id} kind="story" payload={withLead(story, item.id)} label="verhaal" /> : <SaveButton id={item.id} payload={item} /> : null}
    </div>
  )
}

// Smalle kolom: "· N bronnen" staat achter de bron (.meta__src), maar hoort direct achter de tijd. Is de
// bronnaam breder dan de tijd, dan schuift het de ruimte ertussen in (alleen als het er staat, zie rust.css).
function useBronnenAchterTijd(ref, dep) {
  useLayoutEffect(() => {
    const meta = ref.current
    const count = meta?.querySelector('.meta__bronnen')
    const time = meta?.querySelector('.meta__src .srcmeta__time')
    const btn = meta?.querySelector('.meta__src > .srcmeta')
    if (!count || !time || !btn) return undefined
    const place = () => {
      count.style.marginInlineStart = ''
      count.classList.remove('is-eigen-regel')
      if (getComputedStyle(count).display === 'none') return
      const r = document.createRange()
      r.selectNodeContents(time)
      const rects = [...r.getClientRects()]
      const end = rects.length ? rects[rects.length - 1].right : time.getBoundingClientRect().right
      const pull = Math.max(0, btn.getBoundingClientRect().right - end)
      if (pull > 0.5) count.style.marginInlineStart = `${-pull}px`
      // Past "· N bronnen" niet meer achter de tijd, dan een eigen regel op de lijn van naam en tijd
      // (niet onder het logo), zonder de punt vooraan: nooit een regel die met "·" begint.
      const last = rects.length ? rects[rects.length - 1] : time.getBoundingClientRect()
      if (count.getBoundingClientRect().top >= last.bottom - 1) {
        count.classList.add('is-eigen-regel')
        count.style.marginInlineStart = `${time.getBoundingClientRect().left - btn.getBoundingClientRect().left}px`
      }
    }
    place()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(place)
    ro.observe(meta)
    let gone = false
    document.fonts?.ready?.then(() => !gone && place())
    return () => {
      gone = true
      ro.disconnect()
    }
  }, [ref, dep])
}

// De berichten van een plek in de Editie (het verhaal, of het losse bericht).
export const itemsOfEntry = (item, story, itemsById) => (story ? [item, ...(story.itemIds || []).filter((id) => id !== item.id).map((id) => itemsById?.get(id)).filter(Boolean)] : [item])

const wideOrMouse = () => typeof matchMedia === 'function' && matchMedia('(min-width: 960px), ((hover: hover) and (pointer: fine))').matches

// Verhaalopties: smaak en foutmelding zijn aparte acties. Eén rustige ingang in de metaregel: ⋯ opent
// een zwevend menu (Popmenu.jsx), zoals het contextmenu van de app (ArticleMenuContent in
// ios/Hoot/Views/Components.swift): Meer hiervan, Minder hiervan, en "Klopt dit niet?" met de redenen.
// De bronregel verandert daarbij niet: de knop blijft op zijn plek, niets klapt in de regel open.
// Na een keuze sluit het menu en zegt de melding onderin (dezelfde pil als "Link gekopieerd") wat er
// bewaard is, zoals de app dat met een korte melding doet.
// `withShare` (kaart A+): delen zit altijd in dit menu, niet als eigen knop in de bronregel.
// Zonder: alleen op een touch-telefoon (web-staten), waar de deelknop ernaast wegvalt.
export function TasteButton({ entryKey, item, story, withShare = false }) {
  const { voteOn, itemsById, reportMistake, share, notify } = useHoot()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('main')
  const moreRef = useRef(null)
  const menuId = useId()
  const items = itemsOfEntry(item, story, itemsById)
  const close = useCallback((refocus = true) => {
    setOpen(false)
    setView('main')
    if (refocus) moreRef.current?.focus({ preventScroll: true })
  }, [])
  const pick = (dir) => {
    close(dir > 0)
    voteOn(entryKey, items, dir)
    notify?.(`Je voorkeur voor ${dir > 0 ? 'meer' : 'minder'} over ${aboutOf(items)} is bewaard.`)
    if (dir < 0) requestAnimationFrame(() => focusMenuNotice())
  }
  const report = (reason) => {
    close()
    reportMistake?.(item, story?.id || null, reason) // de melding onderin komt van App.jsx
  }
  // Delen staat in het menu bij kaart A+ (withShare), en anders alleen waar de knop ernaast wegvalt
  // (touch-telefoon): zelfde voorwaarde als .phone-only.
  const canShare = !!(share && shareLink(item)) && (withShare || !wideOrMouse())
  const row = (label, onClick, extra = null) => (
    <button type="button" role="menuitem" className="popmenu__item" onClick={onClick}>
      <span>{label}</span>
      {extra}
    </button>
  )
  return (
    <>
      <button type="button" ref={moreRef} className={`iconbtn${open ? ' is-open' : ''}`} onClick={() => (open ? close() : setOpen(true))} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} aria-label={canShare ? 'Verhaalopties: delen, meer, minder of een fout melden' : 'Verhaalopties: meer, minder of een fout melden'} title="Verhaalopties">
        <MoreIcon />
      </button>
      {open ? (
        <Popmenu anchor={moreRef} id={menuId} view={view} label={view === 'report' ? 'Klopt dit niet?' : 'Verhaalopties'} onClose={close}>
          {view === 'report' ? (
            <>
              <button type="button" role="menuitem" className="popmenu__item popmenu__back" onClick={() => setView('main')} aria-label="Terug naar verhaalopties">
                <CaretIcon dir="left" size={ICON_SM} />
                <span>Klopt dit niet?</span>
              </button>
              <div role="separator" className="popmenu__sep" />
              {Object.entries(CORRECTION_REASONS).map(([reason, label]) => <Fragment key={reason}>{row(label, () => report(reason))}</Fragment>)}
            </>
          ) : (
            <>
              {canShare ? <>{row('Deel', () => { close(); share(item) })}<div role="separator" className="popmenu__sep" /></> : null}
              {voteOn ? <>{row('Meer hiervan', () => pick(1))}{row('Minder hiervan', () => pick(-1))}</> : null}
              {reportMistake ? <>{voteOn ? <div role="separator" className="popmenu__sep" /> : null}{row('Klopt dit niet?', () => setView('report'), <CaretIcon size={ICON_SM} />)}</> : null}
            </>
          )}
        </Popmenu>
      ) : null}
    </>
  )
}
// "voetbal en Ajax", of de bron als er geen onderwerp is.
export function aboutOf(items) {
  const names = [...new Set(items.flatMap((i) => i.topics || []))].map((t) => topicById(t)?.label).filter(Boolean).slice(0, 2)
  return names.length ? names.join(' en ') : `dit soort verhalen`
}

// De intro in hele zinnen die in de gekozen regels passen (shared/zinnen.mjs, src/lib/intro.js).
// Hoot eindigt nooit met een beletselteken: een te lange eerste zin mag één regel doorlopen, en de
// line-clamp in de CSS staat precies die regel ruimer. `fit`: { max, rek }.
// Een geleende intro krijgt " · via X" erachter (VIA_TEKEN): die tekens gaan van de maat af (Item.viaLength in de app).
export const viaLength = (item) => viaCost(item.borrowedFrom)
// `tekst`: een al gekozen intro (de vouw van 01 kiest zelf een zin minder, src/lib/vouw.js).
// Past de eigen intro niet, dan de reserve uit hetzelfde verhaal (shared/kaart-intro.mjs).
const Summary = ({ item, className, fit = { max: Infinity, rek: Infinity }, tekst }) => {
  const chosen = tekst != null ? { text: tekst, via: item.borrowedFrom || null } : cardIntro(item, fit)
  return chosen.text ? (
    <p className={className}>
      {chosen.text}
      {chosen.via ? <span className="via">{VIA_TEKEN}{chosen.via}</span> : null}
    </p>
  ) : null
}

// Het hoofdbeeld: groot genoeg voor het hoofdverhaal (fitsHero) én scherp op dit scherm (sharpHere,
// src/lib/img.js). Anders het placeholderbeeld, zoals bij elk beeld dat te klein is voor zijn plek.
const heroFits = (item) => (url) => fitsHero(url) && sharpHere(item)

// ---- Vorm 1: hoofdverhaal ----
// `priority`: dit is het eerste beeld dat je ziet (alleen het zichtbare hoofdverhaal).
export function LeadStory({ item, story, note, n = null, why = null, followed = null, priority = false, taste = null, outside = false }) {
  const { markRead, read } = useHoot()
  const tier = headlineTier(item.title)
  const titleRole = tier === 'compact' ? 'head-lg' : tier === 'medium' ? 'head-5' : 'head-6'
  // Staand (beeld links, tekst rechts) alleen als het staande beeld er ook echt staat. Krijgt 01 het
  // placeholderbeeld (te klein of onscherp voor het hoofdvak, ook een geleend beeld), dan de gewone vorm:
  // anders zakt alles in de rechterkolom en blijft links een leeg vak (melding Alex, 11 november).
  // Mislukt het laden pas later, dan vangt rust.css (§ Hoofdverhaal staand) het op.
  const staand = portraitImage(item) && !!item.image && heroFits(item)(item.image)
  return (
    <article className={`entry lead${isReadItem(read, item) ? ' is-read' : ''}`} data-id={item.id}>
      <a className={`lead__link${staand ? ' lead__link--portrait' : ''}`} href={linkOf(item)} rel="noreferrer" onClick={() => markRead(item.id)}>
        {/* Overal beeld eerst, zoals de app: dan rubriek, kop en kern, zodat de bronregel bij zijn
            tekst blijft. Het waarom van de plek (jouw Editie) staat stil onder de rubriek, zie Why.js. */}
        <Beeld item={item} kind="lead" fits={heroFits(item)} className={`media media--lead${staand ? ' media--portrait' : ''}${gemeten(item, 'lead')}`} style={uitsnede(item, 'lead')}>
          {(onFail) => <MeasuredImg item={item} kind="lead" priority={priority} onLoad={priority ? rememberLead : undefined} onFail={onFail} />}
        </Beeld>
        <Kicker item={item} extra={note} followed={followed} n={n} />
        <Why why={why} />
        <h2 className={`${titleRole} lead__title`}>{item.title}</h2>
        <Summary item={item} className="lead__sum" fit={{ max: 240, rek: 240 }} />
        {item.author ? <p className="byline">Door {item.author}</p> : null}
      </a>
      <TermHelp text={`${item.title} ${item.summary || ''}`} />
      <Meta item={item} story={story} taste={taste} outside={outside} />
    </article>
  )
}

// ---- Vorm 2: compact bericht ----
// Twee vormen, dezelfde als in de app (ItemRow): "tijdlijn" — kop, intro en het beeld over de
// volle kolombreedte in 2:1, de bronregel eronder — en "krant" — kop en intro links, een klein
// beeld in 3:2 rechts met een vaste breedte (--thumb-w), de bronregel onder de tekst. Op alle
// breedtes dezelfde twee vormen. `plain` houdt de krant-vorm aan: in de Editie (die is een krant, op
// web en in de app) en op smalle plekken zoals het vergelijkpaneel.
// `lines`: hoeveel regels intro (1, 2, 3 of 'alles'); standaard de instelling van de Stroom, en in
// de krant-vorm van de Editie en het vergelijkpaneel (`plain`) INTRO_LINES (3), zoals de app.
export function CompactItem({ item, story, note, n = null, why = null, showSave = true, plain = false, taste = null, lines, outside = false }) {
  const { markRead, read, layout, prefs } = useHoot()
  const introMax = useIntroMax()
  const lineCount = lines ?? (plain ? INTRO_LINES : prefs?.preview ?? INTRO_LINES)
  const phone = usePhone()
  const cls = `entry compact${isReadItem(read, item) ? ' is-read' : ''}`
  // Telefoon, Stroom in de tijdlijn: kaart A+ zonder nummer en waarom (zelfde kaart als in de Editie).
  if (phone && layout === 'tijdlijn' && !plain) return <KaartItem item={item} story={story} note={note} showSave={showSave} taste={taste} outside={outside} lines={lines} />
  // Een beeld dat te klein is voor de volle kolom (onscherp, zie sharpHere) staat klein rechts: de
  // krant-vorm hieronder, in plaats van opgerekt over de hele breedte.
  const small = !!item.image && (!fitsLarge(item.image) || !sharpHere(item))
  if (layout === 'tijdlijn' && !plain && !small) {
    return (
      <article className={`${cls} compact--tl`} data-id={item.id}>
        {/* Zelfde volgorde als op de voorpagina: rubriek (met het waarom), kop, samenvatting, beeld, dan de bron. */}
        <a className="compact__link" href={linkOf(item)} rel="noreferrer" onClick={() => markRead(item.id)}>
          <Kicker item={item} extra={note} n={n} />
          <Why why={why} />
          <h3 className="head-4 compact__title">{item.title}</h3>
          <Summary item={item} className="compact__sum" fit={introMax(lineCount)} />
          <Beeld item={item} kind="tijdlijn" fits={fitsLarge} className={`media media--tl${gemeten(item, 'lead')}`} style={uitsnede(item, 'lead')}>
            {(onFail) => <MeasuredImg item={item} kind="lead" onFail={onFail} />}
          </Beeld>
        </a>
        <Meta item={item} story={story} showSave={showSave} taste={taste} outside={outside} />
      </article>
    )
  }
  return (
    <article className={`${cls}${layout === 'tijdlijn' && !plain ? ' compact--klein' : ''}`} data-id={item.id}>
      <a className="compact__link" href={linkOf(item)} rel="noreferrer" onClick={() => markRead(item.id)}>
        <div className="compact__text">
          <Kicker item={item} extra={note} n={n} />
          <Why why={why} />
          <h3 className="head-4 compact__title">{item.title}</h3>
          <Summary item={item} className="compact__sum" fit={introMax(lineCount, 'rij', (prefs?.images ?? 'aan') === 'aan')} />
        </div>
        {/* Intrinsieke maat 3:2; de echte maat komt uit CSS (--thumb-w/--thumb-h). */}
        <Beeld item={item} kind="krant" className={`thumb${gemeten(item, 'thumb')}`} style={uitsnede(item, 'thumb')}>
          {(onFail) => <MeasuredImg item={item} width="96" height="64" onFail={onFail} />}
        </Beeld>
      </a>
      <Meta item={item} story={story} showSave={showSave} taste={taste} outside={outside} />
    </article>
  )
}

// ---- Kaart A+ (telefoon; keuze van Alex, 4 november) ----
// Eén kaart voor de Editie en de Stroom op een telefoon: rubriek (met in de Editie het nummer en het
// waarom), kop, intro, dan het beeld 2:1 over de volle breedte en de bronregel. De Stroom laat nummer
// en waarom weg; verder verschuift er niets. iPad en desktop houden hun bredere vormen (CompactItem,
// FrontItem, LeadStory). De maten staan in src/styles/kaart.css; iOS spiegelt ze in ItemRow en LeadCard.
// `lead`: het hoofdverhaal (01): beeld tot de rand in 3:2, grotere kop en intro, het nummer in het rood.

// Bronregel van de kaart: bron (tijd in woorden, "Abonnement" als stille tekst), "N bronnen" als
// tekstknop, bewaren en het ⋯-menu waar delen in zit. Een bron buiten je bronnen zegt dat in de tijdregel.
export function KaartSource({ item, outside = false }) {
  const { openSource, sourcesById } = useHoot()
  const paid = sourcesById?.get(item.source)?.paid
  return (
    <button type="button" className="srcbtn srcmeta kmeta__src" onClick={() => openSource(item.source)} aria-label={`Alles van ${item.sourceName} bekijken`}>
      <SourceMark source={srcOf(item)} size={24} />
      <span className="srcmeta__text">
        <span className="srcmeta__name">{item.sourceName}</span>
        <span className="srcmeta__time">
          <time dateTime={item.publishedAt || undefined}>{timeAgo(item.publishedAt)}</time>
          {paid ? <span className="kmeta__abo"> · Abonnement</span> : null}
          {outside ? <span className="srcbtn__read"> · Buiten je bronnen</span> : null}
        </span>
      </span>
    </button>
  )
}

export function KaartMeta({ item, story, showSave = true, taste = null, outside = false }) {
  const { openStory, newInStory, voteOn, reportMistake, share } = useHoot()
  const fresh = story ? newInStory(story) : 0
  const others = story ? story.sourceCount - 1 : 0
  const metaRef = useStackWhenCramped(`${item.id}|${others}|${outside}`)
  const more = item.kind !== 'post' && (taste || voteOn || reportMistake || (share && shareLink(item)))
  return (
    <div className="kmeta" ref={metaRef}>
      <KaartSource item={item} outside={outside} />
      {story && others > 0 ? (
        <button type="button" className="kmeta__bronnen" onClick={() => openStory(story.id, item.id)} aria-label={`Vergelijk ${others + 1} bronnen${fresh ? `, ${fresh} nieuw` : ''}`}>
          {fresh ? <span className="dot" aria-hidden="true" /> : null}
          {bronnenLabel(others + 1)}
        </button>
      ) : null}
      {showSave ? story ? <SaveButton id={story.id} kind="story" payload={withLead(story, item.id)} label="verhaal" /> : <SaveButton id={item.id} payload={item} /> : null}
      {more ? <TasteButton entryKey={taste || story?.id || item.id} item={item} story={story} withShare /> : null}
    </div>
  )
}

export function KaartItem({ item, story, note, n = null, why = null, followed = null, showSave = true, taste = null, outside = false, lead = false, priority = false, lines }) {
  const { markRead, read, prefs } = useHoot()
  const introMax = useIntroMax()
  // Editie (met nummer): KAART_LINES (4); de Stroom: de instelling.
  const lineCount = lines ?? (n ? KAART_LINES : prefs?.preview ?? INTRO_LINES)
  // Te klein voor de volle breedte (onscherp, zie sharpHere): klein rechts naast de tekst, zoals in de
  // Stroom op desktop. Het hoofdverhaal houdt dan het placeholderbeeld (heroFits).
  const klein = !lead && !!item.image && (!fitsLarge(item.image) || !sharpHere(item))
  const fit = lead ? { max: 240, rek: 240 } : introMax(lineCount, klein ? 'rij' : 'kaartA', klein)
  // 01 boven de vouw (src/lib/vouw.js): alleen het hoofdverhaal op een telefoon.
  const phone = usePhone()
  const kaartRef = useRef(null)
  const vouw = useVouw(kaartRef, { aan: lead && phone, introTekst: lead ? wholeSentences(ownIntro(item), 240 - viaLength(item), 240 - viaLength(item)) : '', key: item.id })
  const beeld = klein ? (
    <Beeld item={item} kind="krant" className={`thumb kaart__thumb${gemeten(item, 'thumb')}`} style={uitsnede(item, 'thumb')}>
      {(onFail) => <MeasuredImg item={item} width="96" height="64" onFail={onFail} />}
    </Beeld>
  ) : lead ? (
    <Beeld item={item} kind="lead" fits={heroFits(item)} className={`media kaart__beeld${gemeten(item, 'lead')}`} style={vouw?.beeld ? { ...uitsnede(item, 'lead'), '--vouw-beeld': `${vouw.beeld}px` } : uitsnede(item, 'lead')}>
      {(onFail) => <MeasuredImg item={item} kind="lead" priority={priority} onLoad={priority ? rememberLead : undefined} onFail={onFail} />}
    </Beeld>
  ) : (
    <Beeld item={item} kind="tijdlijn" fits={fitsLarge} className={`media kaart__beeld${gemeten(item, 'lead')}`} style={uitsnede(item, 'lead')}>
      {(onFail) => <MeasuredImg item={item} kind="lead" onFail={onFail} />}
    </Beeld>
  )
  return (
    <article ref={kaartRef} className={`entry kaart${lead ? ' kaart--lead' : ''}${isReadItem(read, item) ? ' is-read' : ''}`} data-id={item.id} data-vouw={vouw ? vouw.profiel : undefined}>
      <a className="kaart__link" href={linkOf(item)} rel="noreferrer" onClick={() => markRead(item.id)}>
        {lead ? beeld : null}
        <div className={`kaart__in${klein ? ' kaart__in--klein' : ''}`}>
          <div className="kaart__head">
            <Kicker item={item} extra={note} followed={followed} n={n} />
            <Why why={why} />
          </div>
          {lead ? <h2 className={`kaart__title kaart__title--lead${vouw?.k26 ? ' kaart__title--26' : ''}`}>{item.title}</h2> : <h3 className="kaart__title">{item.title}</h3>}
          <Summary item={item} className="kaart__sum" fit={fit} tekst={vouw ? vouw.intro : undefined} />
          {lead ? null : beeld}
        </div>
      </a>
      <TermHelp text={`${item.title} ${item.summary || ''}`} max={1} />
      <KaartMeta item={item} story={story} showSave={showSave} taste={taste} outside={outside} />
    </article>
  )
}

// ---- Vorm 3: sociale bijdrage ----
// Op het raster van het artikel (Stroom-kaart B, keuze 1.1.0): de tekst zelf in leestekst (geen
// kop), dan het beeld of de linkkaart over de hele kolom, en de bron onderaan op dezelfde plek als
// bij een artikel: avatar 24, naam en de @-naam waar bij een artikel de tijd staat, met delen en
// bewaren rechts. Geen kale link in de tekst: die staat in de linkkaart.
export function SocialItem({ item }) {
  const { markRead, read, openSource } = useHoot()
  const metaRef = useStackWhenCramped(item.id)
  // Een staand beeld wordt hooguit 4:5, een liggend hooguit 2,4:1; de breedte is altijd de kolom.
  const ratio = item.imageRatio ? Math.min(2.4, Math.max(0.8, item.imageRatio)) : null
  // Drie soorten beeld: een gedeelde link (linkkaart), een eigen foto en video (16:9 met afspeelknop).
  const isLink = !item.video && !item.imageRatio && !!item.domain && item.domain !== 'bsky.app'
  const playable = isPlayableVideo(item.video, CAN_HLS)
  const text = withoutBareLinks(item.summary, isLink ? item.domain : '')
  return (
    <article className={`entry social${isReadItem(read, item) ? ' is-read' : ''}`} data-id={item.id}>
      <a className="social__body" href={linkOf(item)} rel="noreferrer" onClick={() => markRead(item.id)}>
        {/* Bluesky-kaart A+ (1.1.1): een stille rubriek, dan de tekst schreefloos (src/styles/bluesky.css). */}
        <p className="label label--kicker social__kicker" aria-hidden="true">
          Bluesky
        </p>
        {text ? <p className="social__text">{text}</p> : null}
        {item.video && !playable ? (
          <div className="media media--social media--poster" style={{ aspectRatio: 16 / 9 }}>
            {item.videoPoster ? <img src={directVideo(item.videoPoster)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null}
            <span className="media__play">
              <PlayIcon />
            </span>
          </div>
        ) : isLink ? (
          <div className="card linkcard">
            {item.image ? (
              <div className="media linkcard__media">
                <Img url={item.image} kind="lead" />
              </div>
            ) : null}
            <div className="linkcard__text">
              {item.linkTitle ? <span className="clamp linkcard__title">{item.linkTitle}</span> : null}
              <span className="linkcard__domain">{item.domain}</span>
            </div>
          </div>
        ) : !item.video && item.image ? (
          <div className="media media--social" style={{ aspectRatio: ratio || 16 / 9 }}>
            <Img url={item.image} kind="lead" />
          </div>
        ) : null}
      </a>
      {playable ? <Video src={item.video} poster={item.videoPoster} label={`Video van ${item.sourceName} afspelen`} style={{ aspectRatio: 16 / 9 }} /> : null}
      <div className="meta" ref={metaRef}>
        <button type="button" className="srcbtn srcmeta" onClick={() => openSource(item.source)} aria-label={`Alles van ${item.sourceName} bekijken`}>
          <SourceMark source={srcOf(item)} size={24} />
          <span className="srcmeta__text">
            <span className="srcmeta__name">{item.sourceName}</span>
            <span className="srcmeta__time">
              {item.handle} · <time dateTime={item.publishedAt || undefined}>{timeAgo(item.publishedAt)}</time>
            </span>
          </span>
        </button>
        <ShareButton item={item} label="bericht" />
        <SaveButton id={item.id} payload={item} />
      </div>
    </article>
  )
}

// Kiest de juiste vorm voor een los bericht.
export function Entry({ item, story }) {
  return item.kind === 'post' ? <SocialItem item={item} /> : <CompactItem item={item} story={story} />
}
