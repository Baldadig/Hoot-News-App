// De voorraad van de vakbronnen bijwerken en, als er een nieuwe week is, de Vakweek samenstellen.
import { kvGet, kvSet, readDoc, writeDoc, KEYS } from './kv.mjs'
import { loadVakItems, mergePool, composeVak, vakWeek } from './vak.mjs'
import { hash } from '../../shared/util.mjs'

let running = null // binnen één functie-instantie nooit twee keer tegelijk

// `force`: ook binnen dezelfde week opnieuw samenstellen (bijvoorbeeld na een wijziging in de bronnen).
export function refreshVak({ now = Date.now(), force = false } = {}) {
  running ||= (async () => {
    try {
      const { items } = await loadVakItems()
      const pool = mergePool((await kvGet(KEYS.vakPool)) || [], items, now)
      await kvSet(KEYS.vakPool, pool)
      // Sinds wanneer we verzamelen: tot er een volle week is, elk uur een voorproefje.
      let since = await kvGet(KEYS.vakSince)
      if (!since) {
        since = new Date(now).toISOString()
        await kvSet(KEYS.vakSince, since)
      }
      const current = await readDoc(KEYS.vak)
      if (current && current.week === vakWeek(now).id && !current.preview && !force) return current
      const digest = composeVak(pool, { now, since })
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
