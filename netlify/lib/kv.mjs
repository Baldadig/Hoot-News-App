// Opslag in Netlify Blobs, met een terugval op geheugen (lokaal, of als Blobs ontbreekt).
import { getStore } from '@netlify/blobs'

const mem = new Map()
let mode = 'memory'
const store = () => getStore('hoot')

export const storageMode = () => mode // 'blobs' = blijvend; 'memory' = alleen deze functie-instantie

export async function kvGet(key) {
  try {
    const v = await store().get(key, { type: 'json' })
    mode = 'blobs'
    return v
  } catch {
    return mem.get(key) ?? null
  }
}

export async function kvSet(key, value) {
  try {
    await store().setJSON(key, value)
    mode = 'blobs'
  } catch {
    mem.set(key, value)
  }
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
  } catch {
    return mem.get(key) ?? null
  }
}

export async function writeDoc(key, doc) {
  const { body, ...metadata } = doc
  try {
    await store().set(key, body, { metadata })
  } catch {
    mem.set(key, doc)
  }
}

export const KEYS = {
  start: 'feed-start-v1', // kern zonder vergelijkingsdata (de app vanaf 1.27)
  related: 'feed-related-v1', // alle publicaties per verhaal, pas geladen als je vergelijkt
  core: 'feed-core-v1', // bronnen, verhalen, editie (de app 1.22–1.26)
  legacy: 'feed-snapshot-v1', // alles in één (de app tot en met 1.21)
  part: (id) => 'feed-part-' + id, // de berichten van één bron
  vakPool: 'vak-pool-v1', // alle stukken van de vakbronnen, de laatste 16 dagen
  vak: 'vak-digest-v1', // de Vakweek die nu geldt
  vakSince: 'vak-since-v1', // sinds wanneer we de vakbronnen verzamelen
  vakHealth: 'vak-health-v1', // per vakbron: wanneer hij het laatst werkte en zijn nieuwste stuk
}
