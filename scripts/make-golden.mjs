// Maakt tests/fixtures/edition-golden.json: vaste invoer en uitvoer van de rekenkern voor vier lezers
// uit de momentopname (bouwspec §9). Node (tests/editionGolden.test.mjs) en de app
// (ios/HootTests/EditionParityTests.swift) moeten uit `input` byte voor byte `output` maken.
//
// De invoer is ingekort tot de berichten uit de gevolgde bronnen, die van de algemene Editie en alle
// stukken van de verhalen: precies genoeg om dezelfde Editie te geven als de volledige momentopname
// (dat controleert dit script). `vs-zonder-topics` is dezelfde lezer zonder subonderwerpen: op de
// iPhone komen die in een parallelle ronde, en tot die tijd geeft de app `[]` mee.
//
//   node scripts/make-golden.mjs
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSnapshot, nowOf, PERSONAS, setupFor, readIdsOf, composeFor } from '../tests/helpers/snapshot.mjs'
import { compose } from '../src/lib/editionCore.js'
import { ROOT } from './build-edition-core.mjs'

export const GOLDEN = 'tests/fixtures/edition-golden.json'
export const CASES = [
  { name: 'nieuw', persona: 'nieuw' },
  { name: 'klimaat', persona: 'klimaat' },
  { name: 'vs', persona: 'vs' },
  { name: 'vs-zonder-topics', persona: 'vs', tweak: { topics: [] } },
]

// De invoer van één lezer, als JSON-vormen (arrays, geen Sets): zo krijgt de app hem ook.
export function inputFor(snap, { persona, tweak = {} }) {
  const p = PERSONAS.find((x) => x.id === persona)
  const setup = { ...setupFor(p, snap.sources, 'echt'), ...tweak }
  const readIds = p.interests.length + p.topics.length ? readIdsOf(snap, p, setup.followed) : new Set()
  const keep = new Set((snap.edition.items || []).map((i) => i.id))
  const items = snap.items.filter((i) => setup.followed.has(i.source) || keep.has(i.id) || i.storyId)
  return {
    input: {
      global: snap.edition,
      stories: snap.stories,
      items,
      sources: snap.sources,
      followed: [...setup.followed],
      interests: setup.interests,
      topics: setup.topics,
      favorites: setup.favorites,
      affinity: setup.affinity,
      taste: setup.taste,
      readIds: [...readIds],
      previous: null,
      now: nowOf(snap),
      builtAt: snap.meta.updatedAt,
      owner: 'anon',
    },
    full: composeFor(snap, { ...setup, readIds }),
  }
}

export function makeGolden(snap = loadSnapshot()) {
  return CASES.map((c) => {
    const { input, full } = inputFor(snap, c)
    const output = compose(input)
    // De ingekorte invoer moet dezelfde plekken geven als de hele momentopname. Vergeleken op wat de
    // plek is (verhaal, hoofdbericht, rubriek, waarom); itemIds, title en keys komen uit het verhaal
    // zelf en staan sinds P5b/H2 al in de uitvoer van composePersonal, dus aan beide kanten.
    const plek = ({ _parts, _front, itemIds, title, keys, ...e }) => e
    const same = JSON.stringify(full.entries.map(plek)) === JSON.stringify(output.entries.map(plek))
    if (!same) throw new Error(`${c.name}: de ingekorte invoer geeft een andere Editie dan de momentopname`)
    return { name: c.name, input, output }
  })
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const golden = makeGolden()
  const text = JSON.stringify(golden)
  writeFileSync(resolve(ROOT, GOLDEN), text + '\n')
  for (const g of golden) console.log(`${g.name}: ${g.input.items.length} berichten in, ${g.output.entries.length} plekken uit, basis ${g.output.basis}`)
  console.log(`${GOLDEN}: ${(text.length / 1024).toFixed(0)} kB`)
}
