// De Stroom per bron: alles van de afgelopen 36 uur, hooguit 60 berichten, nieuwste eerst.
// Veel feeds noemen zelf maar hun laatste 20 à 50 berichten (bij NU.nl of de NOS een paar uur).
// Daarom bewaren we wat we eerder zagen (Netlify Blobs, STORE_KEY) en voegen het samen met wat
// de feed nu geeft: zonder dubbelen (zelfde link of kop binnen de bron), het verse exemplaar voor.
// Een bron die even niet laadt, houdt zo ook zijn berichten van de afgelopen 36 uur.
// Gedeeld door de Stroom én de verhalen en de Editie (build.mjs): wat ouder is dan 36 uur doet
// nergens meer mee.
import { STREAM_HOURS, STREAM_MAX } from './sources.mjs'
import { withoutCopies } from '../../shared/dedupe.mjs'

export const STORE_KEY = 'stream-v1'
const HOUR = 36e5

// Leeftijd volgens de publicatietijd; zonder tijd telt wanneer de feed het bericht het laatst
// noemde (`seenAt`, alleen intern: de app krijgt het niet, zie toClient in build.mjs).
const timeOf = (it) => Date.parse(it.publishedAt) || it.seenAt || 0

// Nieuwste eerst, niet ouder dan `hours`, hooguit `max` in de taal van de bron. Een bericht in een
// andere taal (`offLang`, rss.mjs) telt niet mee voor de grens maar blijft binnen die grens staan:
// de build laat het later weg voor wie de brontaal leest.
export function recentOf(list = [], { now = Date.now(), hours = STREAM_HOURS, max = STREAM_MAX } = {}) {
  const since = now - hours * HOUR
  const sorted = list.filter((it) => timeOf(it) >= since).sort((a, b) => timeOf(b) - timeOf(a))
  let kept = 0
  return sorted.filter((it) => (it.offLang ? kept < max : kept < max && ++kept))
}

// Eén bron: wat de feed nu geeft (`fresh`) plus wat we bewaarden (`stored`).
export function mergeSource(fresh = [], stored = [], { now = Date.now(), hours, max } = {}) {
  const seen = fresh.map((it) => ({ ...it, seenAt: now }))
  const old = (Array.isArray(stored) ? stored : []).filter((it) => it && it.url && it.title)
  return recentOf(withoutCopies([...seen, ...old], { perSource: true }), { now, hours, max })
}

// Alle bronnen: elke groep (rss.mjs: { id, ok, items, … }) krijgt zijn samengevoegde berichten.
// Ook een bron die nu niet laadde (ok: false) toont wat hij de afgelopen 36 uur bracht.
export function mergeStream(groups = [], store = {}, opts = {}) {
  const st = store && typeof store === 'object' ? store : {}
  return groups.map((g) => {
    const items = mergeSource(g.items, st[g.id], opts)
    return { ...g, items, count: items.length }
  })
}

// Wat we bewaren: per bron de berichten zoals ze na het aanvullen zijn (beeld, inleiding), zodat
// een bericht dat uit de feed verdween zijn beeld houdt. Zonder wat bij één ronde hoort.
export function storeOf(groups = []) {
  const out = {}
  for (const g of groups) if (g.items.length) out[g.id] = g.items.map(({ storyId, firstSeenAt, ...it }) => it)
  return out
}
