// Opslag in Netlify Blobs, met een terugval op geheugen (lokaal, of als Blobs ontbreekt).
import { getStore } from '@netlify/blobs'
import { gzipSync, gunzipSync } from 'node:zlib'

const mem = new Map()
let mode = 'memory'
const store = () => getStore('hoot')
// Sterke consistentie (Netlify Blobs): elke regio leest meteen de laatste stand. Trager, dus alleen voor
// tellers waar een oude stand het plafond zou omzeilen (het quotum van /api/brief).
const strongStore = () => getStore({ name: 'hoot', consistency: 'strong' })

export const storageMode = () => mode // 'blobs' = blijvend; 'memory' = alleen deze functie-instantie

// Een terugval op geheugen is lokaal normaal (geen Blobs-omgeving: MissingBlobsEnvironmentError). Op
// Netlify is het een storing: dan loggen we hem zichtbaar (review B3), één keer per handeling en sleutel
// per functie-instantie, zodat een storing opvalt zonder de logs te overspoelen.
const logged = new Set()
export function fellBack(op, key, e) {
  if (e?.name === 'MissingBlobsEnvironmentError') return false
  const k = op + ':' + key
  if (logged.has(k)) return true
  logged.add(k)
  // Sleutels van de persoonlijke Editie (`pe-…`) bevatten een afdruk van je account of profiel: nooit in de log.
  const shown = String(key).startsWith('pe') ? String(key).split(':')[0] + ':…' : key
  console.error(`[kv] Netlify Blobs ${op} mislukte voor "${shown}"; terugval op het geheugen van deze functie-instantie: ${e?.message || e}`)
  return true
}

export async function kvGet(key, { strong = false } = {}) {
  try {
    const v = await (strong ? strongStore() : store()).get(key, { type: 'json' })
    mode = 'blobs'
    return v
  } catch (e) {
    fellBack('lezen', key, e)
    return mem.get(key) ?? null
  }
}

export async function kvSet(key, value, { strong = false } = {}) {
  try {
    await (strong ? strongStore() : store()).setJSON(key, value)
    mode = 'blobs'
  } catch (e) {
    fellBack('schrijven', key, e)
    mem.set(key, value)
  }
}

// Een teller atomair één omhoog, alleen als hij onder `limit` blijft (het quotum van /api/brief, review
// B1). Op Netlify met een voorwaardelijke schrijfactie (onlyIfNew / onlyIfMatch op de ETag) en een paar
// nieuwe pogingen: twee gelijktijdige verzoeken kunnen nooit allebei dezelfde stand ophogen. Geeft de
// nieuwe stand, of null als het plafond bereikt is (of het bij drukte niet lukt: dan liever nee dan te veel).
// Zonder Blobs (lokaal, of bij een storing) in het geheugen, zonder await tussen lezen en schrijven.
export async function kvTake(key, limit, { tries = 8 } = {}) {
  let s
  try {
    s = strongStore()
  } catch (e) {
    fellBack('tellen', key, e)
    return memStep(key, 1, limit)
  }
  for (let i = 0; i < tries; i++) {
    try {
      const cur = await s.getWithMetadata(key, { type: 'json' })
      const n = Number(cur?.data) || 0
      if (n >= limit) return null
      const r = await s.setJSON(key, n + 1, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true })
      mode = 'blobs'
      if (r?.modified !== false) return n + 1
    } catch (e) {
      fellBack('tellen', key, e)
      return memStep(key, 1, limit)
    }
  }
  return null
}

// Het omgekeerde (een mislukte samenvatting telt niet mee): atomair één omlaag, nooit onder nul.
export async function kvGive(key, { tries = 8 } = {}) {
  let s
  try {
    s = strongStore()
  } catch (e) {
    fellBack('tellen', key, e)
    return memStep(key, -1)
  }
  for (let i = 0; i < tries; i++) {
    try {
      const cur = await s.getWithMetadata(key, { type: 'json' })
      const n = Number(cur?.data) || 0
      if (!cur || n <= 0) return 0
      const r = await s.setJSON(key, n - 1, { onlyIfMatch: cur.etag })
      if (r?.modified !== false) return n - 1
    } catch (e) {
      fellBack('tellen', key, e)
      return memStep(key, -1)
    }
  }
  return null
}

// Geheugen: lezen en schrijven in één synchrone stap, dus ook gelijktijdig in één instantie atomair.
function memStep(key, d, limit = Infinity) {
  const n = Number(mem.get(key)) || 0
  if (d > 0 && n >= limit) return null
  const next = Math.max(0, n + d)
  mem.set(key, next)
  return next
}

// Onthoudt een duur antwoord `maxAge` ms. Een leeg antwoord (alles mislukt) bewaren we niet.
export async function remember(key, maxAge, compute, { now = Date.now(), valid = (v) => v != null } = {}) {
  const hit = await kvGet(key)
  if (hit && now - hit.at < maxAge) return hit.value
  const value = await compute()
  if (valid(value)) await kvSet(key, { at: now, value })
  return valid(value) ? value : (hit?.value ?? value)
}

// ---- Kant-en-klare antwoorden: één tekst per sleutel, met tijd en versie (etag) erbij ----
export async function readDoc(key) {
  try {
    const r = await store().getWithMetadata(key, { type: 'text' })
    return r?.data ? { body: r.data, ...r.metadata } : null
  } catch (e) {
    fellBack('lezen', key, e)
    return mem.get(key) ?? null
  }
}

export async function writeDoc(key, doc) {
  const { body, ...metadata } = doc
  try {
    await store().set(key, body, { metadata })
  } catch (e) {
    fellBack('schrijven', key, e)
    mem.set(key, doc)
  }
}

// Het archief (frisse ogen · 2): een groot JSON-document gecomprimeerd bewaard (gzip, als base64-tekst).
export async function writeArchive(key, value, meta = {}) {
  await writeDoc(key, { body: gzipSync(JSON.stringify(value)).toString('base64'), encoding: 'gzip-base64', ...meta })
}
export async function readArchive(key) {
  const d = await readDoc(key)
  if (!d?.body) return null
  return JSON.parse(gunzipSync(Buffer.from(d.body, 'base64')).toString('utf8'))
}

export const KEYS = {
  start: 'feed-start-v1', // kern zonder vergelijkingsdata (de app vanaf 1.27)
  voorpagina: 'voorpagina-pool-v1', // kleine kandidatenpool voor /api/voorpagina (lib/voorpagina-pool.mjs)
  related: 'feed-related-v1', // alle publicaties per verhaal, pas geladen als je vergelijkt
  core: 'feed-core-v1', // bronnen, verhalen, editie (de app 1.22–1.26)
  legacy: 'feed-snapshot-v1', // alles in één (de app tot en met 1.21)
  part: (id) => 'feed-part-' + id, // de berichten van één bron
  vakPool: 'vak-pool-v1', // alle stukken van de vakbronnen, de laatste 16 dagen
  vak: 'vak-digest-v1', // de Vakweek die nu geldt
  vakSince: 'vak-since-v1', // sinds wanneer we de vakbronnen verzamelen
  vakHealth: 'vak-health-v1', // per vakbron: wanneer hij het laatst werkte en zijn nieuwste stuk
}
