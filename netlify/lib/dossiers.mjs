// Haagse dossiers tellen als één verhaal (frisse ogen · ronde 3, punt 7; besluit van Alex, 11 november: automatisch
// bundelen op gedeelde namen, geen lijst die we met de hand bijhouden). Alleen voor de algemene Editie, op de server.
//
// De Belastingplan-week (4-6 november) haalde de Editie niet: bijna elke krant had een eigen invalshoek, elk stuk had
// één uitgever, en zo woog geen enkel stuk genoeg. Daarom, vóór de volgorde:
// - Een Haags stuk: een Nederlandstalig stuk van een Nederlandse bron, met de rubriek Binnenland, en een kop met een
//   Haags woord (kabinet, Kamer, coalitie, minister, partij, debat …; vaste taal van de politiek, geen dossiers).
//   Geen opinie, geen liveblog, niet ouder dan DOSSIER_HOURS.
// - Een naam: een woord dat in de koppen van die stukken ergens midden in een zin met een hoofdletter staat (Jetten,
//   Belastingplan, Bontenbal) of een afkorting (VVD, D66), behalve de woorden van de politiek zelf (Kamer, kabinet,
//   Den Haag …). Daarna telt de naam ook zonder hoofdletter ("met belastingplan").
// - Een dossier: één naam in de koppen van minstens DOSSIER_MIN uitgevers. Het dossier met de meeste uitgevers telt.
// - Staat er al een plek met een stuk uit het dossier in de Editie, dan gebeurt er niets (één dossier, één plek).
// - Anders krijgt het dossier één plek, met het gewicht van al zijn uitgevers: een nieuwsstuk uit het dossier, eerst
//   gratis (NOS, NU.nl, RTL), dan de nieuwste. Hoort dat stuk bij een verhaal, dan het verhaal met dat stuk als kop. De
//   plek komt achter de verhalen met meer uitgevers, nooit op 01; is de Editie vol, dan valt de laagste plek met minder
//   uitgevers weg (eerst een eenbronsplek). Heeft geen plek minder uitgevers, dan blijft alles staan (gewicht kiest).
// - Actueel gaat voor herhaald: het stuk is van na de vorige Editie en stond daar niet in.
import { isOpinion } from '../../shared/article-signals.mjs'
import { publisherOf, coverageOf, isGallery } from '../../shared/edition-policy.mjs'
import { desksOf } from './desks.mjs'
import { isLive, titled, leadCandidates } from './stories.mjs'
import { SOURCES } from './sources.mjs'
import { isAflevering } from '../../shared/aflevering.mjs'

export const DOSSIER_MIN = 4
export const DOSSIER_HOURS = 24
export const DOSSIER_FREE = new Set(['nos', 'nos-economie', 'nu', 'rtl'])
const H = 36e5
const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
const timeOf = (i) => Date.parse(i?.publishedAt) || 0
// De taal van de politiek (geen namen, geen dossiers).
export const HAAGS = /(?<![\p{L}\p{N}])(kabinet\w*|kamer|kamerle\w*|kamervragen|kamerdebat\w*|coalitie\w*|oppositie\w*|minister\w*|premier|staatssecretaris\w*|fractie\w*|partij\w*|motie\w*|debat\w*|wetsvoorstel\w*|begroting\w*|formatie\w*|formateur|informateur|verkiezing\w*|politie?k\w*|binnenhof)(?![\p{L}\p{N}])/iu
// Woorden die met een hoofdletter staan maar geen naam van een dossier zijn: de instellingen van de politiek zelf.
export const NOT_A_DOSSIER = new Set(['kamer', 'tweede', 'eerste', 'den', 'haag', 'haagse', 'kabinet', 'nederland', 'nederlandse', 'nederlanders', 'minister', 'premier', 'staatssecretaris', 'coalitie', 'oppositie', 'kamerleden', 'senaat', 'rijk', 'overheid', 'binnenhof', 'europa', 'europese', 'brussel'])
// De naamherkenning is gedeeld (volgen 1.5, blok 1): een Haags dossier en een volgzaak (netlify/lib/volgzaak-match.mjs)
// halen namen op precies dezelfde manier uit een kop. Alleen de drempels verschillen. tests/volgzaak-naamherkenning.test.mjs
// bewaakt dat dossierNames en haagsDossier dezelfde uitvoer geven als vóór de verbouwing.
export const normNaam = (w) => w.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
const norm = normNaam
const tokens = (t) => String(t || '').match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) || []
// De woorden van een kop, ook de delen van een woord met koppeltekens ("GTA-6" is "GTA" en "6"), nog niet genormaliseerd.
export const kopWoorden = (titel) => tokens(titel).flatMap((x) => x.split('-'))
const isAcronym = (w) => /^(?=.*\p{Lu})[\p{Lu}\p{N}]{2,5}$/u.test(w) && /\p{Lu}/u.test(w[0])

// Is dit een Haags stuk?
export function haagsPiece(it) {
  const src = SOURCE.get(it?.source)
  if (!it || !titled(it) || !src || src.lang !== 'nl' || !['nl', 'economie', 'regio'].includes(src.cat) || !HAAGS.test(it.title)) return false
  // Een aflevering (podcast, audio, video; shared/aflevering.mjs) is geen Haags stuk: ze telt niet mee voor de uitgevers
  // van het dossier (keuring luister, 14 november 2026).
  if ((it.lang && it.lang !== 'nl') || it.type === 'opinie' || isOpinion(it) || isLive(it) || isGallery(it) || isAflevering(it)) return false
  return desksOf(it).has('binnenland')
}

// Een naam is ook een woord met een klein getal erachter ("box 3"): zo heten regelingen en artikelen. Met of zonder
// hoofdletter, en een lange naam ook vooraan in een samenstelling ("Belastingplandebat", "belastingplannen").
const NUMBERED = /(?<![\p{L}\p{N}])(\p{L}{3,}) (\d{1,2})(?![\p{N}])/gu
// De woordenschat (genormaliseerd) en de lange namen daaruit (vanaf 8 tekens, die tellen ook vooraan in een samenstelling).
const metLang = (woordenschat) => [...woordenschat].filter((w) => w.length >= 8)
// De namen uit `woordenschat` (een Set van genormaliseerde woorden) in één kop: met of zonder hoofdletter, een lange naam
// ook vooraan in een samenstelling, en een woord met een klein getal erachter ("box 3", "gta 6"), behalve de woorden in
// `niet`. `lang`: de lange namen, als de aanroeper ze al heeft (dossierNames, voor veel koppen tegelijk).
export function namenInKop(titel, woordenschat, { lang = metLang(woordenschat), niet = NOT_A_DOSSIER } = {}) {
  const out = new Set()
  for (const w of kopWoorden(titel).map(norm)) {
    if (woordenschat.has(w)) out.add(w)
    else for (const n of lang) if (w.startsWith(n)) out.add(n)
  }
  for (const m of String(titel || '').matchAll(NUMBERED)) if (!niet.has(norm(m[1]))) out.add(`${norm(m[1])} ${m[2]}`)
  return out
}
// Staat deze naam (één of meer woorden, zoals "Tata Steel" of "Grand Theft Auto") als opeenvolgende woorden in de kop?
// Alleen voor volgzaken; haagsDossier gebruikt het niet.
export function kopBevat(titel, naam) {
  const n = kopWoorden(naam).map(norm)
  if (!n.length) return false
  const w = kopWoorden(titel).map(norm)
  outer: for (let i = 0; i + n.length <= w.length; i++) {
    for (let j = 0; j < n.length; j++) if (w[i + j] !== n[j]) continue outer
    return true
  }
  return false
}
// Per naam het aantal uitgevers (publisherOf: de NOS-familie is één uitgever). `namenPerStuk`: Map(stuk-id → Set(naam)).
export function uitgeversPerNaam(stukken, namenPerStuk) {
  const per = new Map()
  for (const it of stukken) for (const n of namenPerStuk.get(it.id) || []) (per.get(n) || per.set(n, new Set()).get(n)).add(publisherOf(it.source))
  return new Map([...per].map(([n, s]) => [n, s.size]))
}

// De namen in Haagse koppen: woordenschat uit de koppen zelf (een woord met een hoofdletter midden in een zin, niet na
// een dubbele punt of een aanhalingsteken; of een afkorting), daarna per kop de namen uit die woordenschat (namenInKop).
export function dossierNames(pieces = []) {
  const vocab = new Set()
  for (const it of pieces) {
    let start = true
    for (const part of String(it.title || '').split(/\s+/)) {
      if (!part) continue
      const quoted = /^["“‘'(]/.test(part)
      for (const w of tokens(part).flatMap((x) => x.split('-'))) {
        if (isAcronym(w) || (!start && !quoted && /^\p{Lu}\p{Ll}/u.test(w) && w.length >= 4)) vocab.add(norm(w))
        start = false
      }
      if (/[.!?:;"”’'“‘(]$/.test(part)) start = true
    }
  }
  for (const w of NOT_A_DOSSIER) vocab.delete(w)
  const lang = metLang(vocab)
  return new Map(pieces.map((it) => [it.id, namenInKop(it.title, vocab, { lang })]))
}

// `entries`: de plekken (na selectie en aanvulling); `newsPool`: de stukken die de Editie mag gebruiken; `stories`: de
// verhalen; `previous`: de vorige Editie (previousOf). Geeft { entries, dossier } (dossier: { naam, uitgevers, plek } of
// null). Wijzigt `entries` niet.
export function haagsDossier(entries, { newsPool = [], stories = [], previous = null, now = Date.now(), mainIds = new Set(), size = 10, max = 3, audit = null } = {}) {
  const pieces = newsPool.filter((it) => it.kind === 'article' && timeOf(it) <= now && now - timeOf(it) <= DOSSIER_HOURS * H && haagsPiece(it))
  if (pieces.length < DOSSIER_MIN) return { entries, dossier: null }
  const names = dossierNames(pieces)
  const byName = new Map()
  for (const it of pieces) for (const n of names.get(it.id)) (byName.get(n) || byName.set(n, []).get(n)).push(it)
  const pubs = (xs) => new Set(xs.map((i) => publisherOf(i.source))).size
  const dossiers = [...byName].map(([naam, xs]) => ({ naam, items: xs, uitgevers: pubs(xs) })).filter((d) => d.uitgevers >= DOSSIER_MIN)
  if (!dossiers.length) return { entries, dossier: null }
  dossiers.sort((a, b) => b.uitgevers - a.uitgevers || b.items.length - a.items.length || (a.naam < b.naam ? -1 : 1))
  const d = dossiers[0]
  const ids = new Set(d.items.map((i) => i.id))
  const storyById = new Map(stories.map((st) => [st.id, st]))
  const storyOfItem = new Map(stories.flatMap((st) => (st.itemIds || []).map((id) => [id, st])))
  const byId = new Map(newsPool.map((i) => [i.id, i]))
  const idsOf = (e) => (e.kind === 'story' ? storyById.get(e.id)?.itemIds || [] : [e.id])
  const regular = entries.filter((e) => e.desk !== 'bubbel')
  // Het dossier staat er al.
  if (regular.some((e) => idsOf(e).some((id) => ids.has(id)))) return { entries, dossier: { naam: d.naam, uitgevers: d.uitgevers, plek: 'al' } }
  const since = previous?.at || 0
  // Een stuk uit een verhaal dat (met één stuk) al in de vorige Editie stond, telt niet: dat verhaal is gezien.
  const seen = (i) => { const st = storyOfItem.get(i.id); return !!st && (previous?.storyIds?.has(st.id) || (st.itemIds || []).some((id) => previous?.itemIds?.has(id))) }
  const news = d.items.filter((i) => timeOf(i) > since && !previous?.itemIds?.has(i.id) && !seen(i) && !/\?/.test(i.title) && (i.summary || i.image))
  if (!news.length) return { entries, dossier: null }
  // Hooguit `max` plekken per bron.
  const leadSource = (e) => publisherOf(byId.get(e.leadId || e.id)?.source)
  const count = new Map()
  for (const e of regular) count.set(leadSource(e), (count.get(leadSource(e)) || 0) + 1)
  const room = news.filter((i) => (count.get(publisherOf(i.source)) || 0) < max)
  if (!room.length) return { entries, dossier: null }
  const ordered = leadCandidates(room, mainIds, null, now)
  const lead = ordered.find((i) => DOSSIER_FREE.has(i.source)) || ordered[0]
  const st = storyOfItem.get(lead.id)
  const pubsOf = (e) => (e.kind === 'story' ? storyById.get(e.id)?.publisherCount ?? coverageOf(idsOf(e).map((id) => byId.get(id)).filter(Boolean)).publisherCount : 1)
  const entry = st ? { kind: 'story', id: st.id, leadId: lead.id, desk: 'binnenland' } : { kind: 'item', id: lead.id, desk: 'binnenland' }
  const out = [...entries]
  let weg = null
  if (regular.length >= size) {
    // Vol: de laagste plek met minder uitgevers valt weg, eerst een eenbronsplek.
    const lower = (e) => e.desk !== 'bubbel' && pubsOf(e) < d.uitgevers
    let k = out.findLastIndex((e) => lower(e) && pubsOf(e) < 2)
    if (k < 0) k = out.findLastIndex(lower)
    if (k <= 0) return { entries, dossier: null }
    const [gone] = out.splice(k, 1)
    audit?.push({ kind: gone.kind, id: gone.id, itemIds: idsOf(gone), reason: 'plaats-voor-haags-dossier' })
    weg = { kind: gone.kind, id: gone.id, kop: byId.get(gone.leadId || gone.id)?.title || null }
  }
  // Achter de verhalen met meer uitgevers, nooit op 01, vóór de bubbelplek.
  const end = out.findIndex((e) => e.desk === 'bubbel')
  const last = end < 0 ? out.length : end
  let at = out.findIndex((e, k) => k >= 1 && k < last && pubsOf(e) < d.uitgevers)
  if (at < 0) at = last
  out.splice(at, 0, entry)
  // Wat de lezer zou zien en waarom: de kop, de stukken onder de naam en de plek die zou wijken (voor de schaduw).
  const koppen = d.items.slice(0, 12).map((i) => ({ bron: i.source, kop: i.title }))
  return { entries: out, dossier: { naam: d.naam, uitgevers: d.uitgevers, plek: at + 1, kop: lead.title, bron: lead.source, leadId: lead.id, koppen, weg } }
}
