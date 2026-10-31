import { kvGet, kvSet } from './kv.mjs'
import { safeHttpUrl } from '../../shared/util.mjs'
const KEY = 'share-records-v1'
const MAX_AGE = 90 * 864e5
// Alleen de al openbare kop, rubriek, bron en bronlink; nooit artikelinhoud.
export async function rememberShareRecords(items, stories, sources, now) {
  const old = await kvGet(KEY) || {}
  const bySource = new Map(sources.map(s => [s.id, s]))
  const labels = { binnenland: 'Binnenland', buitenland: 'Wereld', wereld: 'Wereld', economie: 'Economie', tech: 'Tech', wetenschap: 'Wetenschap', cultuur: 'Cultuur', sport: 'Sport', politiek: 'Politiek', music: 'Cultuur' }
  const records = Object.fromEntries(Object.entries(old).filter(([, r]) => now - r.at < MAX_AGE))
  for (const item of items) {
    if (item.kind !== 'article' || !safeHttpUrl(item.url)) continue
    const source = bySource.get(item.source)
    records[item.id] = { id: item.id, title: item.title, source: item.source, sourceName: item.sourceName, url: item.url, section: item.section || labels[source?.cat] || 'Nieuws', at: now }
  }
  for (const story of stories) if (records[story.leadId]) records[story.id] = { ...records[story.leadId], id: story.id }
  const latest = Object.entries(records).sort((a, b) => b[1].at - a[1].at).slice(0, 12000)
  await kvSet(KEY, Object.fromEntries(latest))
}
export async function shareRecord(id) {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9:._-]{0,159}$/i.test(id)) return null
  return (await kvGet(KEY))?.[id] || null
}
