// Opslag in het geheugen voor de toetsen van volgzaken (volgen 1.5, blok 1): dezelfde handelingen als kv.mjs (get, set,
// update, take, give, readDoc, readArchive, writeArchive), met een logboek van elke handeling en sleutel.
export function memIo(init = {}) {
  const kv = new Map(Object.entries(init))
  const docs = new Map()
  const arch = new Map()
  const log = []
  const kopie = (v) => (v == null ? null : structuredClone(v))
  return {
    kv, docs, arch, log,
    sleutels: () => [...new Set(log.filter(([op]) => ['set', 'update', 'take', 'give', 'schrijfArchief'].includes(op)).map(([, k]) => k))],
    get: async (k) => (log.push(['get', k]), kopie(kv.get(k))),
    set: async (k, v) => (log.push(['set', k]), kv.set(k, kopie(v))),
    update: async (k, fn) => {
      log.push(['update', k])
      const n = fn(kopie(kv.get(k)))
      if (n === undefined) return kopie(kv.get(k))
      kv.set(k, kopie(n))
      return n
    },
    take: async (k, limit) => {
      log.push(['take', k])
      const n = Number(kv.get(k)) || 0
      if (n >= limit) return null
      kv.set(k, n + 1)
      return n + 1
    },
    give: async (k) => {
      log.push(['give', k])
      const n = Number(kv.get(k)) || 0
      kv.set(k, Math.max(0, n - 1))
      return Math.max(0, n - 1)
    },
    lees: async (k) => (log.push(['lees', k]), docs.get(k) || null),
    leesArchief: async (k) => (log.push(['leesArchief', k]), kopie(arch.get(k))),
    schrijfArchief: async (k, v) => (log.push(['schrijfArchief', k]), arch.set(k, kopie(v))),
  }
}

// Een feed zoals refresh.mjs hem wegschrijft: KEYS.start met de verhalen en de etag per deel, en per bron een deel.
export function zetFeed(io, { stories = [], parts = {}, builtAt = '2026-11-20T09:50:00.000Z', tags = null } = {}) {
  const t = tags || Object.fromEntries(Object.entries(parts).map(([id, items]) => [id, 'e-' + id + '-' + JSON.stringify(items).length]))
  io.docs.set('feed-start-v1', { body: JSON.stringify({ stories, items: [], meta: { parts: t } }), builtAt, etag: 'x' })
  for (const [id, items] of Object.entries(parts)) io.docs.set('feed-part-' + id, { body: JSON.stringify({ items }), builtAt, etag: t[id] })
  return t
}

// Een nep-model voor duiden en oordelen: `antwoord(req)` geeft het JSON-antwoord, of gooit. Telt de aanroepen.
export function nepModel(antwoord, { usage = { input_tokens: 1000, output_tokens: 60 } } = {}) {
  const calls = []
  return {
    calls,
    messages: {
      create: async (req) => {
        calls.push(req)
        const a = await antwoord(req)
        if (a === '__hangt__') return new Promise(() => {})
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(a) }], usage }
      },
    },
  }
}
export const gooiModel = () => nepModel(() => { throw new Error('geen model in deze toets') })

// Een goede duiding zoals het model hem geeft (DUIDING_SCHEMA).
export const GOED = { uitkomst: 'volgzaak', bestaand: '', naam: 'GTA 6', regel: 'De nieuwe Grand Theft Auto van Rockstar', soort: 'product', mijlpaal: 'de release', namen_nl: ['GTA 6'], namen_en: ['Grand Theft Auto VI'], aliassen: ['GTA VI'], context: ['Rockstar'], uitsluitingen: ['oudere GTA-delen'], algemeen: ['GTA'], rubriek: 'cultuur', keuzes: [], binnen: [] }
