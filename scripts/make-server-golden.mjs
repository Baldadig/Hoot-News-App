// Maakt tests/fixtures/edition-server-golden.json: één opgenomen antwoord van POST /api/edition (v2) voor een lid,
// op de vaste momentopname. Web (tests/edition-server-golden.test.mjs) en iPhone (ios/HootTests/EditionServerTests.swift)
// moeten dit antwoord letterlijk opslaan en tonen: zelfde account en dagdeel, één antwoord, twee gelijke opslagen.
// Bewust opnieuw maken (na een wijziging aan het antwoord, niet aan De Redacteur): node scripts/make-server-golden.mjs
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { handle } from '../netlify/functions/edition.mjs'
import { fakePostgrest } from '../tests/helpers/pgrest.mjs'
import { loadSnapshot, PERSONAS, setupFor } from '../tests/helpers/snapshot.mjs'
import { ROOT } from './build-edition-core.mjs'

export const SERVER_GOLDEN = 'tests/fixtures/edition-server-golden.json'
export const UID = '00000000-0000-4000-8000-0000000000aa'

export async function recordServerGolden() {
  const snap = loadSnapshot()
  const start = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: {} }
  const setup = setupFor(PERSONAS.find((p) => p.id === 'nieuw'), snap.sources)
  const request = { v: 2, followed: [...setup.followed], interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, readIds: [] }
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const deps = {
    start: async () => start,
    items: async (_s, followed) => snap.items.filter((i) => followed.includes(i.source)),
    verify: async () => UID,
    clientFor: () => pg.client,
    kv: { get: async () => null, set: async () => {}, take: async () => 1 },
  }
  const res = await handle(new Request('http://hoot.test/api/edition', { method: 'POST', headers: { Authorization: 'Bearer golden' }, body: JSON.stringify(request) }), deps)
  return { uid: UID, global: { id: snap.edition.id, builtAt: snap.edition.builtAt }, request, status: res.status, response: await res.json() }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const g = await recordServerGolden()
  writeFileSync(resolve(ROOT, SERVER_GOLDEN), JSON.stringify(g, null, 1) + '\n')
  console.log(`${SERVER_GOLDEN}: ${g.response.source}, ${g.response.edition.entries.length} plekken, basis ${g.response.edition.basis}`)
}
