// De feed opnieuw samenstellen en bewaren als kant-en-klare antwoorden: een kern, per bron een
// deel, en de oude vorm voor apps die nog niet zijn bijgewerkt.
import { buildFeed } from './build.mjs'
import { readDoc, writeDoc, KEYS } from './kv.mjs'
import { MAIN_IDS, MUSIC_IDS } from './sources.mjs'
import { hash } from '../../shared/util.mjs'

let running = null // binnen één functie-instantie nooit twee keer tegelijk

export function refresh() {
  running ||= (async () => {
    try {
      const now = Date.now()
      const builtAt = new Date(now).toISOString()
      const { parts, items, ...rest } = await buildFeed({ now })
      const before = JSON.parse((await readDoc(KEYS.core))?.body || '{}').meta?.parts || {}

      // Per bron een deel; alleen wat veranderde opnieuw wegschrijven.
      const tags = {}
      const writes = []
      for (const [id, list] of Object.entries(parts)) {
        const body = JSON.stringify({ items: list })
        tags[id] = hash(body)
        if (before[id] !== tags[id]) writes.push(writeDoc(KEYS.part(id), { body, builtAt, etag: tags[id] }))
      }
      await Promise.all(writes)

      const core = JSON.stringify({ ...rest, items: [], meta: { ...rest.meta, parts: tags } })
      // Vanaf 1.27: de kern zonder de vergelijkingsdata (83% van de kern); die komt apart, pas als
      // je een verhaal opent. Met versie, zodat hij net als een bron-deel lang bewaard mag worden.
      const { related, ...lean } = rest
      const relatedBody = JSON.stringify({ related })
      const relatedTag = hash(relatedBody)
      const start = JSON.stringify({ ...lean, items: [], meta: { ...rest.meta, parts: tags, related: relatedTag } })
      const base = new Set([...MAIN_IDS, ...MUSIC_IDS])
      const legacy = JSON.stringify({ ...rest, items: items.filter((i) => base.has(i.source) || i.kind === 'post') })
      const coreDoc = { body: core, builtAt, etag: hash(core) }
      await Promise.all([
        writeDoc(KEYS.core, coreDoc),
        writeDoc(KEYS.start, { body: start, builtAt, etag: hash(start) }),
        writeDoc(KEYS.related, { body: relatedBody, builtAt, etag: relatedTag }),
        writeDoc(KEYS.legacy, { body: legacy, builtAt, etag: hash(legacy) }),
      ])
      return coreDoc
    } finally {
      running = null
    }
  })()
  return running
}
