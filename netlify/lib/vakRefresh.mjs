// De voorraad van de vakbronnen bijwerken en, als er een nieuwe week is, de Vakweek samenstellen.
import { kvGet, kvSet, readDoc, writeDoc, KEYS } from './kv.mjs'
import { loadVakItems, mergePool, composeVak, vakWeek, vakRange, editieSlotIds, addOgImages, updateHealth, sourcesToLoad, oneLine } from './vak.mjs'
import { findEdition } from './edition-history.mjs'
import { hash } from '../../shared/util.mjs'

// De stukken die in de week van de Selectie in een Editie stonden (Selectie · fase 3): uit de bewaarde algemene Edities
// per dagdeel (welke Redacteur-revisie ook). Alleen wat in die week is samengesteld; wat niet te lezen is, telt niet.
export async function editieItems(wk, get = kvGet) {
  const out = new Map()
  const snaps = await Promise.all(editieSlotIds(wk).map((id) => findEdition(get, id, { legacy: true }).catch(() => null)))
  for (const hit of snaps) {
    const snap = hit?.snapshot
    if (!snap || (snap.builtAt && (snap.builtAt < wk.from || snap.builtAt >= wk.to))) continue
    for (const it of snap.items || []) if (it?.title && !out.has(it.url || it.id)) out.set(it.url || it.id, { title: it.title, url: it.url || null })
  }
  return [...out.values()]
}

let running = null // binnen één functie-instantie nooit twee keer tegelijk

// De tijd van een ronde (B13, nachttest 14 november). De planner van Netlify geeft een geplande functie na 15 seconden
// op; een ronde die dat niet haalt, schrijft niets weg. Daarom: hooguit FETCH_MS voor de feeds en tot OG_MS voor de
// artikelbeelden, gerekend vanaf het begin van de ronde; wat dan niet aan de beurt kwam, komt in een volgende ronde.
export const FETCH_MS = 8000
export const OG_MS = 11000

// Eén logregel met de mislukte bronnen en hun reden, zodat het logboek van Netlify laat zien wie er weigert of hapert.
// Alleen bron-id's en foutmeldingen, niets van gebruikers.
export function failureLine(status = []) {
  const failed = status.filter((r) => !r.skipped && !r.ok)
  const skipped = status.filter((r) => r.skipped).length
  const tried = status.length - skipped
  if (!failed.length && !skipped) return null
  const list = failed.map((r) => `${r.id} (${oneLine(r.error)})`).join('; ')
  return `vak-refresh: ${failed.length} van ${tried} bronnen mislukt${skipped ? `, ${skipped} niet aan de beurt` : ''}${list ? ': ' + list : ''}`
}

// `force`: ook binnen dezelfde week opnieuw samenstellen (bijvoorbeeld na een wijziging in de bronnen).
export function refreshVak({ now = Date.now(), force = false } = {}) {
  running ||= (async () => {
    try {
      // Bronnen op pauze (kapot, geweigerd of al lang stil) slaan we over; elk uur proberen we er een paar opnieuw.
      const start = Date.now()
      const health = (await kvGet(KEYS.vakHealth)) || {}
      const { items, status } = await loadVakItems(sourcesToLoad(health, now), { deadline: start + FETCH_MS })
      const line = failureLine(status)
      if (line) console.log(line)
      await kvSet(KEYS.vakHealth, updateHealth(health, status, now))
      const pool = mergePool((await kvGet(KEYS.vakPool)) || [], items, now)
      // Sinds wanneer we verzamelen: tot er een volle week is, elk uur een voorproefje.
      let since = await kvGet(KEYS.vakSince)
      if (!since) {
        since = new Date(now).toISOString()
        await kvSet(KEYS.vakSince, since)
      }
      // Wat die week al in een Editie stond, komt niet in de top (lukt het lezen niet, dan zonder).
      const editie = await editieItems(vakRange(now, since).wk).catch(() => [])
      // Beeld van het artikel zelf, waar de feed geen (goed) beeld gaf: eerst voor wat nu in de
      // digest zou staan.
      const shown = new Set(composeVak(pool, { now, since, editie }).fields.flatMap((f) => [...f.top, ...f.more].map((e) => e.id)))
      await addOgImages(pool, { first: shown, max: 30, deadline: start + OG_MS })
      await kvSet(KEYS.vakPool, pool)
      const current = await readDoc(KEYS.vak)
      if (current && current.week === vakWeek(now).id && !current.preview && !force) return current
      const digest = composeVak(pool, { now, since, editie })
      const body = JSON.stringify(digest)
      const doc = { body, builtAt: new Date(now).toISOString(), etag: hash(body), week: vakWeek(now).id, preview: digest.preview }
      await writeDoc(KEYS.vak, doc)
      return doc
    } finally {
      running = null
    }
  })()
  return running
}
