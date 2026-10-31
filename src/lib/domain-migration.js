import { SYNCED_PREFS } from './sync.js'

// Eerste-partij verhuizing: alleen Hoot-instellingen en leesgegevens, nooit inlogtokens.
export const MOVE_KEYS = ['hoot:prefs', 'hoot:theme', 'hoot:read', 'hoot:saved-v2', 'hoot:saved-items', 'hoot:stories-seen', 'hoot:affinity', 'hoot:my-edition', 'hoot:less']
export const LEGACY_ORIGINS = new Set(['https://hootnews.nl', 'https://www.hootnews.nl'])
const LIMIT = 2 * 1024 * 1024
const accountOwner = storage => { const owner = storage.getItem('hoot:owner') || storage.getItem('hoot:synced-user'); return owner && owner !== 'anon' }
const validateValue = (key, value) => {
  if (key === 'hoot:theme') { if (!['system', 'light', 'dark'].includes(value)) throw new Error('Ongeldig thema'); return value }
  return JSON.parse(value)
}
export function movePayload(storage, route = '#/editie') {
  const values = {}
  const account = accountOwner(storage)
  for (const key of MOVE_KEYS) {
    if (account && key !== 'hoot:prefs' && key !== 'hoot:theme') continue
    const value = storage.getItem(key)
    if (value == null) continue
    try {
      const parsed = validateValue(key, value)
      values[key] = account && key === 'hoot:prefs'
        ? JSON.stringify({ ...Object.fromEntries(Object.entries(parsed).filter(([k]) => !SYNCED_PREFS.includes(k))), onboarded: true })
        : value
    } catch {}
  }
  return { version: 1, values, route: /^#\/(editie|stroom|digest|bluesky|bewaard|bronnen|zoek|instellingen|privacy|over)(?:[?]|$)/.test(route) ? route : '#/editie' }
}
async function bounded(stream) {
  const reader = stream.getReader(), chunks = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > LIMIT) throw new Error('Verhuisbestand te groot')
      chunks.push(value)
    }
    const out = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length }
    return out
  } finally { await reader.cancel().catch(() => {}) }
}
export async function encodeMove(payload) {
  const input = new TextEncoder().encode(JSON.stringify(payload))
  if (input.length > LIMIT) throw new Error('Verhuisbestand te groot')
  const output = await bounded(new Blob([input]).stream().pipeThrough(new CompressionStream('gzip')))
  let binary = ''
  for (let i = 0; i < output.length; i += 8192) binary += String.fromCharCode(...output.subarray(i, i + 8192))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
export async function decodeMove(encoded) {
  if (encoded.length > LIMIT || !/^[\w-]+$/.test(encoded)) throw new Error('Ongeldig verhuisbestand')
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'))
  const data = Uint8Array.from(binary, c => c.charCodeAt(0))
  const output = await bounded(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')))
  return JSON.parse(new TextDecoder().decode(output))
}
export function applyMove(storage, payload, origin) {
  if (!LEGACY_ORIGINS.has(origin) || payload?.version !== 1 || !payload.values || typeof payload.values !== 'object') throw new Error('Ongeldige herkomst')
  if (accountOwner(storage)) return
  const written = []
  try {
    for (const [key, value] of Object.entries(payload.values)) {
      if (!MOVE_KEYS.includes(key) || typeof value !== 'string' || value.length > LIMIT) throw new Error('Ongeldig verhuisveld')
      validateValue(key, value)
      // Een al gebruikte nieuwe Hoot blijft leidend. Op de oude origin wordt niets gewist.
      if (storage.getItem(key) == null) { storage.setItem(key, value); written.push(key) }
    }
  } catch (error) {
    for (const key of written) storage.removeItem(key)
    throw error
  }
}
export async function receiveMove() {
  if (!location.hash.startsWith('#verhuis=')) return
  const payload = await decodeMove(location.hash.slice(9))
  let origin = ''
  try { origin = new URL(document.referrer).origin } catch {}
  applyMove(localStorage, payload, origin)
  const route = movePayload({ getItem: () => null }, payload.route).route
  history.replaceState(null, '', location.pathname + route)
}
