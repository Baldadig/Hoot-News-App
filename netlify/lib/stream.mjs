// De Stroom per bron: alles van de afgelopen 36 uur, hooguit 60 berichten, nieuwste eerst.
// Veel feeds noemen zelf maar hun laatste 20 à 50 berichten (bij NU.nl of de NOS een paar uur).
// Daarom bewaren we wat we eerder zagen (Netlify Blobs, STORE_KEY) en voegen het samen met wat
// de feed nu geeft: zonder dubbelen (zelfde link of kop binnen de bron), het verse exemplaar voor.
// Een bron die even niet laadt, houdt zo ook zijn berichten van de afgelopen 36 uur.
// Alleen voor de Stroom. De verhalen en de Editie houden het oude venster (de eerste 30 van de
// feed, ook als die ouder zijn dan 36 uur: editionWindowOf in sources.mjs, zie build.mjs).
import { SOURCES, STREAM_HOURS, STREAM_MAX, editionWindowOf } from './sources.mjs'
import { withoutCopies } from '../../shared/dedupe.mjs'

export const STORE_KEY = 'stream-v1'
const HOUR = 36e5
const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))

// Wat waarschijnlijk een aanbod is, telt niet mee voor de vensters hieronder (Redacteur · ruis, 11 november 2026). De
// ophaalfilter (isNoise, rss.mjs) gooit deals niet meer op woorden weg; zonder dit zouden ze in een dealrijke feed (Wired,
// IGN rond Black Friday) de plekken van het nieuws innemen: in de Stroom (hooguit 60 per bron) en in het Editie-venster
// (de eerste 30). Dit WEERT NIETS: zo'n stuk blijft binnen de grens staan, net als een stuk in een andere taal; het telt
// alleen niet mee. De woorden zijn die van de oude ophaalfilter, zodat het nieuws precies dezelfde plekken houdt.
const OFFER_HINT = /\b(prime day|black friday|cyber monday|singles day|promo codes?|coupon codes?|gift guides?|best gifts?|gifts? for (him|her|men|women|kids|dads?|moms?))\b|\bbest\b.*\bdeals\b|\bdeals\b.*(\bsave\b|\$\d|\bunder \$)|\d+ ?(%|percent) off\b|\b(aanbiedingen?|in de aanbieding|kortingscodes?|dagdeals?|prijsfouten?|uitverkoop|koopjes|tijdelijk (goedkoper|in prijs verlaagd)|nu \d+ ?% korting)\b|\b\w+-deals\b|^[^:]{0,60}\bnewsletter:/i
const OFFER_CATEGORY = /\b(deals|coupons?|shopping)\b|\baanbieding/i
export const offerHint = (it = {}) => OFFER_HINT.test(String(it.title || '')) || OFFER_CATEGORY.test(String(it.cats || ''))
// Telt een bericht mee voor een venster? Niet als het in een andere taal is (`offLang`) of waarschijnlijk een aanbod.
const counts = (it) => !it.offLang && !offerHint(it)

// De eerste `limit` berichten in feedvolgorde. De grens telt alleen berichten in de taal van de bron:
// anders drukken de Engelstalige Parool-stukken (een derde van de feed) de Nederlandse eruit.
// Afwijkende berichten (en een waarschijnlijk aanbod, offerHint) binnen die grens blijven, gemarkeerd.
export function firstOf(items = [], limit = Infinity) {
  let kept = 0
  return items.filter((i) => (!counts(i) ? kept < limit : kept < limit && ++kept))
}

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
  return sorted.filter((it) => (!counts(it) ? kept < max : kept < max && ++kept))
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

// Uit de hele feed per bron (`fetched`) twee lijsten (shared/stroom.mjs):
// - de Stroom (`mainGroups`, `streamIds`): 36 uur, hooguit 60, samen met wat we bewaarden;
// - de voeding van de verhalen en de Editie (`editionIds`): het oude venster, de eerste 30 van de
//   feed (per rubriek minder), zoals vóór de 36-uursgrens, ook wat ouder is dan 36 uur.
// `editionExtra`: wat alleen in het oude venster staat, zodat elk bericht één keer meegaat.
export function splitFeed(fetched = [], stored = null, { now = Date.now(), windowOf = editionWindowOf } = {}) {
  const mainGroups = mergeStream(fetched, stored, { now })
  const streamIds = new Set(mainGroups.flatMap((g) => g.items.map((it) => it.id)))
  const windowed = fetched.flatMap((g) => firstOf(g.items, windowOf(SOURCE.get(g.id) || { cat: g.cat })))
  const editionIds = new Set(windowed.map((it) => it.id))
  const editionExtra = windowed.filter((it) => !streamIds.has(it.id))
  return { mainGroups, streamIds, editionIds, editionExtra }
}

// Vlak voor het wegschrijven: wat intussen in de opslag staat erbij. De geplande verversing en een
// verversing vanuit /api/feed (waitUntil, als de feed verouderd is) kunnen in twee instanties
// tegelijk lopen; de vergrendeling in refresh.mjs geldt maar binnen één instantie. Zonder dit wint
// de laatste schrijver, en is een bericht dat alleen de andere ronde nog zag (het verdween net uit
// de feed) kwijt. Dit verkleint dat venster tot het stuk tussen lezen en schrijven. `seenAt` blijft
// zoals het was: alleen wat de feed nu noemt telt als gezien.
export function withLatest(groups = [], latest = {}, { now = Date.now(), hours, max } = {}) {
  const st = latest && typeof latest === 'object' ? latest : {}
  return groups.map((g) => {
    const extra = (Array.isArray(st[g.id]) ? st[g.id] : []).filter((it) => it && it.url && it.title)
    const items = extra.length ? recentOf(withoutCopies([...g.items, ...extra], { perSource: true }), { now, hours, max }) : g.items
    return { ...g, items }
  })
}

// Wat we bewaren: per bron de berichten zoals ze na het aanvullen zijn (beeld, inleiding), zodat
// een bericht dat uit de feed verdween zijn beeld houdt. Zonder wat bij één ronde hoort.
export function storeOf(groups = []) {
  const out = {}
  for (const g of groups) if (g.items.length) out[g.id] = g.items.map(({ storyId, firstSeenAt, ...it }) => it)
  return out
}
