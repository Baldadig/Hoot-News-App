import { titleKey } from './dedupe.mjs'

// Een bron-deel (/api/feed?bron=…) draagt twee lijsten in één: de Stroom (per bron alles van de
// afgelopen 36 uur, hooguit 60) en de voeding van de Editie (het oude venster: de eerste 30 berichten
// van de feed, per rubriek minder). Meestal valt dat samen; waar niet, zegt het bericht het zelf
// (netlify/lib/build.mjs):
//   editionOnly: ouder dan 36 uur (of voorbij de 60), alleen voor De Redacteur; niet in de Stroom.
//   streamOnly:  alleen in de Stroom (een drukke bron reikt daar verder); niet voor De Redacteur.
// Zo stelt de Editie samen uit precies dezelfde berichten als vóór de 36-uursgrens. Een oudere app
// kent de vlaggen niet: die toont alles en rekent met alles, zoals voorheen.
// Gedeeld door de website (Stroom, De Redacteur) en de server; iOS doet hetzelfde in HootStore.swift.
export const inStroom = (it) => !it?.editionOnly
export const forEdition = (it) => !it?.streamOnly

// ---- Eén stuk, één plek in de Stroom ----
// Een uitgever past een kop aan (of zet een stuk opnieuw online) en de feed levert dan een nieuw
// bericht: andere kop en link, zelfde stuk. Dezelfde bron met dezelfde artikel-id in de link
// (de Volkskrant eindigt op "~b782895d"), of dezelfde bron met een identieke intro binnen een paar
// uur, is één stuk. Het nieuwste exemplaar blijft (de laatste kop, dan het laatst gezien);
// `formerIds` bewaart de id's van de rest, zodat gelezen en Bewaard op het blijvende bericht staan.
// Daarbovenop dezelfde link of kop over de bronnen heen (zusterkranten), zoals shared/dedupe.mjs.
// Gedeeld door de website; iOS doet hetzelfde in HootStore.swift (tests/fixtures/stroom-dubbels.json).
// "Nieuwste": de minuut van publishedAt (de uitgever zet seconden verschillend), dan firstSeenAt.
export const INTRO_WINDOW_MS = 6 * 3600 * 1000
export const MIN_INTRO = 60

export function articleId(url) {
  const m = /~([0-9a-f]{6,})\/?$/i.exec(String(url || '').replace(/[?#].*$/, ''))
  return m ? m[1].toLowerCase() : null
}

const time = (s) => {
  const t = Date.parse(s || '')
  return Number.isNaN(t) ? null : t
}
const minute = (s) => Math.floor((time(s) ?? 0) / 60000)
const newer = (a, b) => minute(a.publishedAt) - minute(b.publishedAt) || (time(a.firstSeenAt) ?? 0) - (time(b.firstSeenAt) ?? 0)

export function withoutRepeats(list = []) {
  const parent = list.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const join = (a, b) => { parent[Math.max(find(a), find(b))] = Math.min(find(a), find(b)) }
  const first = new Map()
  const intros = new Map()
  list.forEach((it, i) => {
    const title = titleKey(it.title)
    const id = articleId(it.url)
    const keys = [it.url ? 'u|' + it.url : null, title ? 't|' + title : null, id ? 'a|' + it.source + '|' + id : null].filter(Boolean)
    for (const k of keys) first.has(k) ? join(i, first.get(k)) : first.set(k, i)
    const intro = it.kind === 'post' ? '' : titleKey(it.summary)
    const at = time(it.publishedAt)
    if (intro.length >= MIN_INTRO && at != null) {
      const k = it.source + '|' + intro
      const seen = intros.get(k) || []
      for (const j of seen) if (Math.abs(time(list[j].publishedAt) - at) <= INTRO_WINDOW_MS) join(i, j)
      seen.push(i)
      intros.set(k, seen)
    }
  })
  const groups = new Map()
  list.forEach((_, i) => { const r = find(i); groups.set(r, [...(groups.get(r) || []), i]) })
  const out = []
  list.forEach((it, i) => {
    const members = groups.get(find(i))
    if (members[0] !== i) return
    if (members.length === 1) return out.push(it)
    const win = members.reduce((best, j) => (newer(list[j], list[best]) > 0 ? j : best), members[0])
    out.push({ ...list[win], formerIds: members.filter((j) => j !== win).map((j) => list[j].id) })
  })
  return out
}

// Is dit bericht (of een exemplaar dat erin is opgegaan) gelezen?
export const isReadItem = (read, it) => read.has(it.id) || (it.formerIds || []).some((id) => read.has(id))
