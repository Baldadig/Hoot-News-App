// Pariteit web en iOS (bouwspec §9): de rekenkern geeft uit de vaste invoer van vier lezers byte voor
// byte de vastgelegde uitvoer, ook als kale bundel zonder node eromheen (zoals JavaScriptCore op de
// iPhone hem draait). De ingecheckte bundel moet bij zijn, en het samenstelpad houdt zich aan de
// rekenregels voor bit-gelijkheid.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { compose, composeEdition, basisOf, editionBasis, historyOf, nextHistory, mergePrevious, previousFrom, HISTORY_SIZE } from '../src/lib/editionCore.js'
import { buildCore, readCore, hashOf } from '../scripts/build-edition-core.mjs'

const golden = JSON.parse(readFileSync(new URL('./fixtures/edition-golden.json', import.meta.url), 'utf8'))
const byName = Object.fromEntries(golden.map((g) => [g.name, g]))
const names = ['nieuw', 'klimaat', 'vs', 'vs-zonder-topics']

test('de golden fixture heeft de vier lezers, elk met een volle Editie en een waarom per plek', () => {
  assert.deepEqual(golden.map((g) => g.name), names)
  for (const g of golden) {
    assert.equal(g.output.entries.length, 10, g.name)
    assert.ok(g.output.entries.every((e) => e.why?.text && Array.isArray(e.itemIds) && 'title' in e), `${g.name}: why, itemIds en title op elke plek`)
    assert.equal(g.output.owner, 'anon')
    assert.equal(typeof g.output.basis, 'string')
  }
})

for (const name of names) {
  test(`${name}: compose geeft precies de vastgelegde uitvoer`, () => {
    const { input, output } = byName[name]
    assert.deepEqual(compose(input), output)
    assert.equal(composeEdition(JSON.stringify(input)), JSON.stringify(output), 'ook als tekst, byte voor byte')
  })
}

test('de ingecheckte bundel is een verse build van src/lib/editionCore.js (hash)', async () => {
  const fresh = await buildCore()
  assert.equal(hashOf(readCore()), hashOf(fresh), 'ios/Hoot/Resources/edition-core.js loopt achter: npm run build:core')
})

test('de bundel draait kaal (zonder node, window of localStorage) en geeft dezelfde bytes', () => {
  const sandbox = createContext({})
  runInContext(readCore(), sandbox)
  const core = runInContext('globalThis.HootCore', sandbox)
  assert.equal(typeof core.composeEdition, 'function')
  for (const { name, input, output } of golden) {
    assert.equal(core.composeEdition(JSON.stringify(input)), JSON.stringify(output), name)
  }
  assert.equal(core.basisOf(byName.vs.input.followed, byName.vs.input.interests, byName.vs.input.topics, byName.vs.input.favorites), byName.vs.output.basis)
})

test('§9 rekenregels: geen log/pow/exp/random/localeCompare en geen browser- of node-afhankelijkheid in de bundel', () => {
  const text = readCore()
  for (const bad of ['Math.log(', 'Math.pow(', 'Math.exp(', 'Math.random(', 'localeCompare(', 'Intl.', 'localStorage', 'window.', 'document.', 'process.env', 'require(']) {
    assert.ok(!text.includes(bad), `bundel bevat ${bad}`)
  }
})

test('G5: editionBasis web == bundel, ook met lege topics en lege favorites', () => {
  const vs = byName.vs.input
  assert.equal(byName.vs.output.basis, editionBasis(vs.followed, vs.interests, vs.topics, vs.favorites))
  const zonder = byName['vs-zonder-topics'].input
  assert.equal(byName['vs-zonder-topics'].output.basis, editionBasis(zonder.followed, zonder.interests, [], zonder.favorites))
  assert.notEqual(byName.vs.output.basis, byName['vs-zonder-topics'].output.basis, 'subonderwerpen tellen mee in de afdruk')
  const nieuw = byName.nieuw.input
  assert.equal(byName.nieuw.output.basis, editionBasis(nieuw.followed, [], [], []))
  assert.equal(basisOf(nieuw.followed), byName.nieuw.output.basis)
  assert.equal(basisOf([...nieuw.followed].reverse()), byName.nieuw.output.basis, 'volgorde van bronnen doet er niet toe')
})

test('history (H5): de samenvatting van een Editie heeft alleen arrays, en previous is uit Edities en history-regels gelijk', () => {
  const { input, output } = byName.klimaat
  const row = historyOf(output)
  assert.deepEqual(Object.keys(row), ['id', 'builtAt', 'storyIds', 'itemIds', 'leadIds', 'titles'])
  assert.equal(row.id, output.id)
  assert.ok(row.itemIds.length >= output.entries.length, 'alle stukken van de verhalen van toen')
  assert.ok(row.titles.length > 0)
  const fromEdition = mergePrevious([output])
  const fromRow = mergePrevious([row])
  for (const k of ['storyIds', 'itemIds', 'leadIds', 'titles']) assert.deepEqual([...fromRow[k]].sort(), [...fromEdition[k]].sort(), k)
  assert.equal(fromRow.at, fromEdition.at)
  assert.deepEqual([...fromRow.atOf.entries()].sort(), [...fromEdition.atOf.entries()].sort())
  // Dezelfde vorige Editie als Editie of als history-regel geeft dezelfde volgende Editie.
  const next = { ...input.global, id: 'volgend-dagdeel', builtAt: new Date(input.now + 6 * 36e5).toISOString() }
  const a = compose({ ...input, global: next, now: input.now + 6 * 36e5, previous: [output] })
  const b = compose({ ...input, global: next, now: input.now + 6 * 36e5, previous: [row] })
  const c = compose({ ...input, global: next, now: input.now + 6 * 36e5, previous: { ...row, builtAt: undefined, at: Date.parse(row.builtAt) } })
  assert.deepEqual(a, b)
  assert.deepEqual(a, c, 'ook de platte vorm met `at`, zoals POST /api/edition hem krijgt')
  assert.equal(previousFrom(null), null)
  // De geschiedenis houdt de laatste drie, deze voorop, elk dagdeel één keer.
  const hist = nextHistory([{ ...row, id: 'x' }, { ...row, id: 'y' }, { ...row, id: 'z' }], output)
  assert.equal(hist.length, HISTORY_SIZE)
  assert.equal(hist[0].id, output.id)
  assert.equal(nextHistory(hist, output).length, HISTORY_SIZE)
  assert.equal(nextHistory(hist, output).filter((h) => h.id === output.id).length, 1)
})
