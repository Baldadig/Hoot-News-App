// Een lid met de echte verifyToken en clientForToken (geen geïnjecteerde `verify` of `clientFor`): alleen `fetch` is nep.
// /auth/v1/user geeft het lid terug, de rest gaat naar de nep-PostgREST (tests/helpers/pgrest.mjs). Gedeeld door
// tests/editie-node.test.mjs en tests/helpers/lid-zonder-websocket.mjs (het proces zonder WebSocket).
import { fakePostgrest } from './pgrest.mjs'
import { loadSnapshot, PERSONAS, setupFor } from './snapshot.mjs'

export const LID = '00000000-0000-4000-8000-0000000000aa'
const snap = loadSnapshot()
export const start = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: {} }
const setup = setupFor(PERSONAS.find((p) => p.id === 'klimaat'), snap.sources)
export const body = { v: 2, followed: [...setup.followed], interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, readIds: [] }

export function lidDeps(rows = [{ user_id: LID, edition: null }]) {
  const pg = fakePostgrest(rows)
  const calls = []
  const fetch = async (url, init = {}) => {
    const u = new URL(url)
    calls.push(`${init.method || 'GET'} ${u.pathname}`)
    if (u.pathname === '/auth/v1/user') return Response.json({ id: LID })
    return pg.fetch(url, init)
  }
  const m = new Map()
  const kv = { get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v), take: async () => 1 }
  const items = async (_s, followed) => {
    const on = new Set(followed)
    return snap.items.filter((i) => on.has(i.source))
  }
  return { pg, calls, deps: { start: async () => start, items, kv, fetch } }
}
export const lidPost = (b = body, token = 'lid-token') => new Request('http://hoot.test/api/edition', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(b) })
