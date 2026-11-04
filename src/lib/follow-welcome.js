// Volg je bronnen (Welkom, stap 3) — pure functies, getoetst in tests/follow-welcome.test.mjs.
// Zoals accounts volgen: niets staat vooraf aan. Bovenaan het gratis begin (NOS, NU.nl en RTL
// Nieuws, altijd gratis), daaronder alle bronnen per rubriek. Sport staat ingeklapt: sport komt
// alleen als je het zelf kiest. Zoeken vindt alles, ook sport: zoeken is ook een keuze.
// Zelfde regels als de app (WelcomeView.swift, FollowList).
import { SOURCE_CATS, STARTER } from './topics.js'

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
