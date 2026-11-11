// Maakt tests/fixtures/leesprofiel-golden.json: per leesprofiel de samenvatting die mee gaat naar POST /api/edition
// (readingSummary, src/lib/affinity.js; besluit Alex 11 november 2026: "Leesprofiel meesturen"). Het web
// (tests/leesprofiel.test.mjs) en de iPhone (ios/HootTests/EditionServerTests.swift) moeten voor elk profiel precies
// deze samenvatting sturen. De twaalf persona's van de momentopname, plus randgevallen.
// Bewust opnieuw maken (na een wijziging aan readingSummary): node scripts/make-reading-golden.mjs
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readingSummary } from '../src/lib/affinity.js'
import { serverRequest } from '../src/lib/editionSync.js'
import { loadSnapshot, PERSONAS, setupFor } from '../tests/helpers/snapshot.mjs'
import { ROOT } from './build-edition-core.mjs'

export const READING_GOLDEN = 'tests/fixtures/leesprofiel-golden.json'

// Randgevallen: te weinig gelezen, een hoge teller, rommel (rare sleutels, negatief, geen getal), te veel onderwerpen,
// gelijke gewichten in een andere volgorde.
const many = Object.fromEntries(Array.from({ length: 50 }, (_, k) => [`onderwerp-${String(k).padStart(2, '0')}`, Math.round((50 - k) * 0.37 * 100) / 100]))
export const EDGES = [
  { name: 'te-weinig', affinity: { n: 7, topics: { ai: 3 }, sources: { nos: 3 } } },
  { name: 'hoge-teller', affinity: { n: 412, topics: { ai: 12.5, tech: 3.21 }, sources: { nos: 9.87 } } },
  { name: 'rommel', affinity: { n: 12, topics: { 'met spatie': 4, 'ai': 2.345, klimaat: -1, x: 0, geopolitiek: 0.004, 'a/b': 1 }, sources: { nos: 1e9, nrc: 0.05 } } },
  { name: 'te-veel', affinity: { n: 30, topics: many, sources: { nos: 1, nrc: 1, vk: 1 } } },
  { name: 'gelijk', affinity: { n: 9, topics: { zorg: 2, ai: 2, wonen: 2 }, sources: { vk: 1, nos: 1 } } },
]

export function readingGolden() {
  const snap = loadSnapshot()
  const cases = []
  for (const p of PERSONAS) {
    const affinity = setupFor(p, snap.sources).affinity || null
    cases.push({ name: p.id, affinity, summary: readingSummary(affinity) })
  }
  for (const e of EDGES) cases.push({ ...e, summary: readingSummary(e.affinity) })
  // Eén volledige vraag (v2) zoals het web hem stelt, voor een lezer met leesprofiel.
  const setup = setupFor(PERSONAS.find((p) => p.id === 'klimaat'), snap.sources)
  const profile = { followed: [...setup.followed], interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, readIds: [] }
  return { cases, request: { profile, affinity: setup.affinity, body: serverRequest({ ...profile, reading: readingSummary(setup.affinity) }) } }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const g = readingGolden()
  writeFileSync(resolve(ROOT, READING_GOLDEN), JSON.stringify(g, null, 1) + '\n')
  console.log(`${READING_GOLDEN}: ${g.cases.length} profielen, ${g.cases.filter((c) => c.summary).length} met samenvatting`)
}
