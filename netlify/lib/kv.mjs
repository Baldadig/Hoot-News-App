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

// ---- De kant-en-klare feed: één tekstblob plus wanneer en welke versie ----
const SNAPSHOT = 'feed-snapshot-v1'

export async function readSnapshot() {
  try {
    const r = await store().getWithMetadata(SNAPSHOT, { type: 'text' })
    return r?.data ? { body: r.data, ...r.metadata } : null
  } catch {
    return mem.get(SNAPSHOT) ?? null
  }
}

export async function writeSnapshot(snap) {
  const { body, ...metadata } = snap
  try {
    await store().set(SNAPSHOT, body, { metadata })
  } catch {
    mem.set(SNAPSHOT, snap)
  }
}
