// Volg je bronnen (Welkom, stap 4, na de interesses) — pure functies, getoetst in
// tests/follow-welcome.test.mjs. Zoals accounts volgen: niets staat vooraf aan. Bovenaan de Basis
// (Nederlands nieuws, met het gratis begin NOS, NU.nl en RTL Nieuws voorop), daaronder per gekozen
// interesse een eigen blok met de bronnen die erbij horen, ook de kleine en de vakbronnen, en een
// gratis aanrader voorop. Wat in geen blok valt staat ingeklapt onder Meer bronnen; sport alleen
// als je Sport kiest. Zoeken vindt alles, ook sport: zoeken is ook een keuze.
// Zelfde regels als de app (WelcomeView.swift, FollowList).
import { INTERESTS, SOURCE_CATS, STARTER } from './topics.js'

export const FREE_START = ['nos', 'nu', 'rtl']
export const SPORT = 'sport'

export const toggleFollow = (ids, id) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

const byName = (a, b) => a.name.localeCompare(b.name, 'nl')

// Het gratis begin: de drie die bestaan en gratis zijn, in vaste volgorde.
export function freeStart(sources = []) {
  const byId = new Map(sources.map((s) => [s.id, s]))
  return FREE_START.map((id) => byId.get(id)).filter((s) => s && !s.paid)
}

// "Later kiezen" en "Liever meteen lezen": de startset (gratis, Nederlands, geen sport).
export function startIds(sources = []) {
  const ok = new Set(sources.filter((s) => !s.paid).map((s) => s.id))
  return STARTER.flatMap((g) => g.ids).filter((id) => ok.has(id))
}

// De Basis: het Nederlandse nieuws (rubriek Nederland) in het kort: het gratis begin voorop, dan de
// kranten die de catalogus aanraadt (`pick`), op naam. De andere Nederlandse titels staan onder Meer
// bronnen, zodat de blokken van je interesses niet ver weg zakken.
export const BASIS_CAT = 'nl'
export function basisSources(sources = []) {
  const start = freeStart(sources)
  const ids = new Set(start.map((s) => s.id))
  return [...start, ...sources.filter((s) => s.cat === BASIS_CAT && s.pick && !ids.has(s.id)).sort(byName)]
}

// Bij een interesse horen de bronnen uit zijn rubrieken (INTERESTS.cats; Wereld krijgt er
// Internationaal bij), de bronnen die de catalogus voor die interesse aanraadt (`for`) en de
// bronnen van een van zijn onderwerpen (`forTopic`). De Basis staat er niet nog eens in.
const EXTRA_CATS = { wereld: ['int'] }
export function fitsInterest(s, interest) {
  if (s.cat === BASIS_CAT) return false
  const cats = [...interest.cats, ...(EXTRA_CATS[interest.id] || [])]
  return cats.includes(s.cat) || (s.for || []).includes(interest.id) || (!!s.forTopic && interest.topics.includes(s.forTopic))
}

// De gratis aanrader van een blok: gratis, liefst Nederlands en door de catalogus aangeraden (voor
// deze interesse telt zwaarder dan voor een van zijn onderwerpen).
export function freePick(list = [], interestId = null) {
  const free = list.filter((s) => !s.paid)
  const score = (s) => (s.lang === 'nl' ? 4 : 0) + ((s.for || []).includes(interestId) ? 2 : 0) + (s.pick ? 1 : 0)
  return free.sort((a, b) => score(b) - score(a) || byName(a, b))[0] || null
}

// Per gekozen interesse (vaste volgorde) een blok: de gratis aanrader voorop, dan de rest op naam.
// Elke bron staat één keer: in het eerste blok waar hij hoort (NYT bij Politiek, niet nog eens bij
// Wereld en Economie). Zo heeft elk blok ook precies één aanrader.
export function interestBlocks(sources = [], interests = []) {
  const seen = new Set()
  return INTERESTS.filter((i) => interests.includes(i.id))
    .map((i) => {
      const list = sources.filter((s) => !seen.has(s.id) && fitsInterest(s, i)).sort(byName)
      list.forEach((s) => seen.add(s.id))
      const pick = freePick(list, i.id)
      return { id: i.id, label: i.label, pick: pick?.id || null, sources: pick ? [pick, ...list.filter((s) => s !== pick)] : list }
    })
    .filter((b) => b.sources.length)
}

// Meer bronnen (ingeklapt): wat niet in de Basis of in een blok staat, per rubriek (ook de andere
// Nederlandse titels). Sport alleen via de interesse Sport of zoeken.
export function moreGroups(sources = [], interests = []) {
  const shown = new Set([...basisSources(sources), ...interestBlocks(sources, interests).flatMap((b) => b.sources)].map((s) => s.id))
  return followGroups(sources.filter((s) => !shown.has(s.id) && s.cat !== SPORT))
}

// Alle bronnen per rubriek (SOURCE_CATS-volgorde), zonder het gratis begin; wat in geen rubriek
// valt komt als Overig achteraan. Sport staat erin, de weergave klapt hem in.
export function followGroups(sources = []) {
  const start = new Set(FREE_START)
  const rest = sources.filter((s) => !start.has(s.id))
  const known = new Set(SOURCE_CATS.map(([c]) => c))
  const groups = SOURCE_CATS.map(([cat, label]) => ({ cat, label, sources: rest.filter((s) => s.cat === cat).sort(byName) }))
  groups.push({ cat: 'overig', label: 'Overig', sources: rest.filter((s) => !known.has(s.cat)).sort(byName) })
  return groups.filter((g) => g.sources.length)
}

// Zoeken op naam en omschrijving, in alle bronnen (ook sport).
export function findSources(sources = [], query = '') {
  const q = query.trim().toLocaleLowerCase('nl')
  if (!q) return []
  return sources.filter((s) => `${s.name} ${s.about || ''}`.toLocaleLowerCase('nl').includes(q)).sort(byName)
}

// Wat je volgt, op volgorde van volgen (de lijst Gevolgd).
export const followedSources = (sources = [], followed = []) => {
  const byId = new Map(sources.map((s) => [s.id, s]))
  return followed.map((id) => byId.get(id)).filter(Boolean)
}

// "3 bronnen gevolgd": de regel boven de knop (ook voor de schermlezer).
export const followedLine = (n) => (n ? `${n} ${n === 1 ? 'bron' : 'bronnen'} gevolgd` : 'Nog niets gevolgd')

// Het meegroeiende voorbeeld: per bron die je volgt het nieuwste artikel, de nieuwste eerst.
// Volg je nog niets, dan het gratis begin. Echte koppen uit de feed; geen kop van een bron die je
// niet volgt.
export function previewLines(items = [], sources = [], followed = [], max = 4) {
  const ids = followed.length ? followed : FREE_START
  const byId = new Map(sources.map((s) => [s.id, s]))
  const newest = new Map()
  for (const it of items) {
    if (it.kind && it.kind !== 'article') continue
    if (!ids.includes(it.source) || !it.title) continue
    const prev = newest.get(it.source)
    if (!prev || (it.publishedAt || '') > (prev.publishedAt || '')) newest.set(it.source, it)
  }
  return [...newest.values()]
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    .slice(0, max)
    .map((it) => ({ id: it.id, title: it.title, source: byId.get(it.source) || { id: it.source, name: it.sourceName || it.source } }))
}
