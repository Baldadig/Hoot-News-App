// De feed opnieuw samenstellen en bewaren als kant-en-klare antwoorden: een kern, per bron een
// deel, en de oude vorm voor apps die nog niet zijn bijgewerkt.
import { buildFeed } from './build.mjs'
import { ARCHIVE_FEED_KEY } from './scorekaart.mjs'
import { readDoc, writeDoc, writeArchive, KEYS } from './kv.mjs'
import { MAIN_IDS, MUSIC_IDS } from './sources.mjs'
import { hash } from '../../shared/util.mjs'
import { withoutCopies } from '../../shared/dedupe.mjs'
import { voorpaginaPool } from './voorpagina-pool.mjs'
import { volgendKey } from './dagdeel-kern.mjs'

const running = new Map() // binnen één functie-instantie nooit twee keer tegelijk (per soort ronde)

// `build`, `read` en `write`: alleen voor toetsen.
// `slot` (vooraf, besluit Alex 16 november 2026): de ronde vlak vóór de ochtend (shared/slot-times.mjs, ochtendVooraf).
// Dan legt ze de Editie van dat komende dagdeel vast en schrijft ze de kern, start en alles-in-één onder de sleutel
// `volgend` (netlify/lib/dagdeel-kern.mjs): niemand ziet ze tot het dagdeel begint. De delen per bron, de verhalen en de
// voorpaginapool gaan gewoon naar hun eigen sleutel (ze dragen geen Editie). Elk kerndocument draagt het id van zijn
// Editie (`slot`): zo weten /api/feed en de CDN-cache bij de wissel welk dagdeel ze in handen hebben.
export function refresh({ build = buildFeed, read = readDoc, write = writeDoc, slot = null } = {}) {
  const soort = slot?.id || 'nu'
  if (running.has(soort)) return running.get(soort)
  const run = (async () => {
    try {
      const now = Date.now()
      const builtAt = new Date(now).toISOString()
      const { parts, items, archive, late, ...rest } = await build(slot ? { now, slot } : { now })
      const kern = (key) => (slot ? volgendKey(key) : key)
      const id = rest.edition?.id || null
      // Wat een trage bron intussen bracht (build.mjs fetchSources) loopt naast het wegschrijven, nooit ervoor: zo
      // blijft de ronde binnen de 15 s van de planner, ook als die bron niet antwoordt.
      const lateRun = Promise.resolve().then(() => late?.()).catch(() => 0)
      const before = JSON.parse((await read(KEYS.core))?.body || '{}').meta?.parts || {}

      // Per bron een deel, met al zijn eigen berichten (ook wat een zusterkrant ook bracht; de app
      // ontdubbelt over de bronnen die je volgt). Alleen wat veranderde opnieuw wegschrijven.
      const tags = {}
      const writes = []
      for (const [id, list] of Object.entries(parts)) {
        const body = JSON.stringify({ items: list })
        tags[id] = hash(body)
        if (before[id] !== tags[id]) writes.push(write(KEYS.part(id), { body, builtAt, etag: tags[id] }))
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
      const coreDoc = { body: core, builtAt, etag: hash(core), slot: id }
      await Promise.all([
        write(kern(KEYS.core), coreDoc),
        write(kern(KEYS.start), { body: start, builtAt, etag: hash(start), slot: id }),
        write(KEYS.related, { body: relatedBody, builtAt, etag: relatedTag }),
        write(kern(KEYS.legacy), { body: legacy, builtAt, etag: hash(legacy), slot: id }),
        write(KEYS.voorpagina, { body: voorpagina, builtAt, etag: hash(voorpagina) }),
      ])
      // Het archief (frisse ogen · 2): legde deze ronde de Editie van een dagdeel vast (of zijn bubbelplek), dan ook de
      // feed van dit moment, in de vorm van /api/feed met alle berichten. Daarop draait scripts/scorekaart.mjs.
      if (archive) await writeArchive(ARCHIVE_FEED_KEY(rest.edition.id), { ...rest, items }, { builtAt }).catch((e) => console.error('archief-feed', String(e?.message || e)))
      await lateRun
      return coreDoc
    } finally {
      running.delete(soort)
    }
  })()
  running.set(soort, run)
  return run
}
