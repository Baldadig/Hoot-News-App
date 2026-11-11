// Server-gestuurde Stroom-tabs (1.2.1): een volgende categorie zonder app-update.
//
// De vaste delen van de rij blijven in de app en op het web: Alles, de acht hoofdrubrieken in vaste
// volgorde en Buiten je bubbel als laatste (huisregel). Tussen Sport en Buiten je bubbel staan de tabs
// van de server, in de volgorde van deze lijst. Een server-tab is alleen een filter op de Stroom, geen
// eigen lijst of weergave.
//
// De feed (deel=start, kern en oude vorm) draagt `stroomTabs: [{ id, label }]`; elk bericht draagt
// `tabs: ['opinie', …]` (alleen als het er minstens één heeft). Een tab staat in de rij als minstens één
// bericht in de Stroom hem draagt. `opinion: true` blijft mee voor het web van vóór dit veld en als
// terugval.
//
// Labels komen van de server, dus de server bewaakt de huisregels: KISS, een hoofdletter, geen
// kloktijden. De lege regel wordt "Nog geen <label in kleine letters> vandaag."
import { isOpinie, opinieInStroom } from './opinie.mjs'

export const STROOM_TABS = [{ id: 'opinie', label: 'Opinie', test: isOpinie }]

// Wat de feed meestuurt: id en label, in volgorde.
export const stroomTabsFeed = () => STROOM_TABS.map(({ id, label }) => ({ id, label }))

// De tabs van één bericht (server, toClient); null als het er geen heeft (compact laat het dan weg).
export function tabsVan(item) {
  if (!item || item.kind === 'post') return null
  const ids = STROOM_TABS.filter((t) => t.test(item)).map((t) => t.id)
  return ids.length ? ids : null
}

// ---- Op het toestel (web; de app doet hetzelfde in Models.swift, StroomTab) ----

// Een feed van vóór `stroomTabs`: alleen Opinie, zoals 1.2.0 op het web.
export const TERUGVAL = [{ id: 'opinie', label: 'Opinie' }]

// Ids die de rij zelf al gebruikt: een server-tab mag die nooit overnemen.
const VAST = new Set(['', 'alles', 'bubbel', 'politiek', 'binnenland', 'wereld', 'economie', 'tech', 'wetenschap', 'cultuur', 'sport'])
const MAX = 4

// De lijst uit de feed, gecontroleerd: alleen { id, label } met een korte id in kleine letters en een
// label, zonder dubbelen of vaste ids, hooguit vier. Geen lijst in de feed: de terugval.
export function stroomTabsUit(feed) {
  const lijst = feed?.stroomTabs
  if (!Array.isArray(lijst)) return TERUGVAL
  const seen = new Set()
  const out = []
  for (const t of lijst) {
    const id = typeof t?.id === 'string' ? t.id : ''
    const label = typeof t?.label === 'string' ? t.label.trim() : ''
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(id) || !label || label.length > 24 || VAST.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push({ id, label })
    if (out.length === MAX) break
  }
  return out
}

// Draagt dit bericht de tab? Met `tabs` van de server telt alleen die lijst; een bericht van vóór dat
// veld valt voor Opinie terug op `opinion`/`type`.
export function inTab(item, id) {
  if (Array.isArray(item?.tabs)) return item.tabs.includes(id)
  return id === 'opinie' && opinieInStroom(item)
}

// Welke tabs er in de Stroom iets hebben.
export function tabsMetBerichten(stream = [], tabs = TERUGVAL) {
  return new Set(tabs.filter((t) => stream.some((i) => inTab(i, t.id))).map((t) => t.id))
}
