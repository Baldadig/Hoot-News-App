// De feed opnieuw samenstellen en bewaren als kant-en-klare antwoorden: een kern, per bron een
// deel, en de oude vorm voor apps die nog niet zijn bijgewerkt.
import { buildFeed } from './build.mjs'
import { ARCHIVE_FEED_KEY } from './scorekaart.mjs'
import { readDoc, writeDoc, writeArchive, KEYS } from './kv.mjs'
import { MAIN_IDS, MUSIC_IDS } from './sources.mjs'
import { hash } from '../../shared/util.mjs'
import { withoutCopies } from '../../shared/dedupe.mjs'
import { voorpaginaPool } from './voorpagina-pool.mjs'

let running = null // binnen één functie-instantie nooit twee keer tegelijk

export function refresh() {
  running ||= (async () => {
    try {
      const now = Date.now()
      const builtAt = new Date(now).toISOString()
      const { parts, items, archive, ...rest } = await buildFeed({ now })
      const before = JSON.parse((await readDoc(KEYS.core))?.body || '{}').meta?.parts || {}

      // Per bron een deel, met al zijn eigen berichten (ook wat een zusterkrant ook bracht; de app
      // ontdubbelt over de bronnen die je volgt). Alleen wat veranderde opnieuw wegschrijven.
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
      // Oude apps ontdubbelen niet zelf: voor hen nog over de bronnen heen.
      const legacy = JSON.stringify({ ...rest, items: withoutCopies(items.filter((i) => base.has(i.source) || i.kind === 'post')) })
      // KEYS.start draagt geen berichten: de voorpagina krijgt een eigen kleine pool.
      const voorpagina = JSON.stringify(voorpaginaPool(items, rest.sources, now))
      const coreDoc = { body: core, builtAt, etag: hash(core) }
      await Promise.all([
        writeDoc(KEYS.core, coreDoc),
        writeDoc(KEYS.start, { body: start, builtAt, etag: hash(start) }),
        writeDoc(KEYS.related, { body: relatedBody, builtAt, etag: relatedTag }),
        writeDoc(KEYS.legacy, { body: legacy, builtAt, etag: hash(legacy) }),
        writeDoc(KEYS.voorpagina, { body: voorpagina, builtAt, etag: hash(voorpagina) }),
      ])
      // Het archief (frisse ogen · 2): legde deze ronde de Editie van een dagdeel vast (of zijn bubbelplek), dan ook de
      // feed van dit moment, in de vorm van /api/feed met alle berichten. Daarop draait scripts/scorekaart.mjs.
      if (archive) await writeArchive(ARCHIVE_FEED_KEY(rest.edition.id), { ...rest, items }, { builtAt }).catch((e) => console.error('archief-feed', String(e?.message || e)))
      return coreDoc
    } finally {
      running = null
    }
  })()
  return running
}
