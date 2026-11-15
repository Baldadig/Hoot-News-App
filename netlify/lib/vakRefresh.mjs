// De voorraad van de vakbronnen bijwerken en, als er een nieuwe week is, de Vakweek samenstellen. Op maandag tot de
// middag elk uur opnieuw, met wat al in de top stond op zijn plek (Selectie-review 14 november, punt 10).
import { kvGet, kvSet, readDoc, writeDoc, KEYS } from './kv.mjs'
import { loadVakItems, mergePool, composeVak, vakWeek, vakRange, editieSlotIds, addOgImages, updateHealth, sourcesToLoad, oneLine, recomposing, beforeNextBundle, nextBundleAt, topIds, topSources } from './vak.mjs'
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
      // digest zou staan; in het weekend voor de komende bundel (Selectie-review, punt 10).
      const ids = (d) => new Set(d.fields.flatMap((f) => [...f.top, ...f.more].map((e) => e.id)))
      const shown = beforeNextBundle(now) ? ids(composeVak(pool, { now: nextBundleAt(now), since })) : ids(composeVak(pool, { now, since, editie }))
      await addOgImages(pool, { first: shown, max: 30, deadline: start + OG_MS })
      await kvSet(KEYS.vakPool, pool)
      const current = await readDoc(KEYS.vak)
      // De bundel van deze week staat er al: alleen op maandag tot de middag opnieuw samenstellen, met wat al in de top
      // stond op zijn plek (keep). Verandert er niets, dan blijft hij staan zoals hij was.
      const same = current && current.week === vakWeek(now).id && !current.preview
      if (same && !force && !recomposing(now)) return current
      const before = same ? JSON.parse(current.body) : null
      // Rouleren (keuzeregel, 15 november): de bronnen uit de top van vorige week wijken bij gelijke stand. Bij een nieuwe
      // week is dat de bundel die er nu staat (apart bewaard, niet in /api/vak); binnen de week blijft het wat bij het
      // verschijnen werd bewaard. Lukt lezen niet, dan zonder.
      let previous = {}
      if (same) previous = (await kvGet(KEYS.vakPrevious).catch(() => null)) || {}
      else if (current && !current.preview) {
        previous = topSources(JSON.parse(current.body))
        await kvSet(KEYS.vakPrevious, previous).catch(() => {})
      }
      const digest = composeVak(pool, { now, since, editie, keep: before && !force ? topIds(before) : {}, previous })
      if (before && !force && JSON.stringify(digest.fields) === JSON.stringify(before.fields)) return current
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
