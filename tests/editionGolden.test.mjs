// Pariteit web en iOS (bouwspec §9): de rekenkern geeft uit de vaste invoer van vier lezers byte voor
// byte de vastgelegde uitvoer, ook als kale bundel zonder node eromheen (zoals JavaScriptCore op de
// iPhone hem draait). De ingecheckte bundel moet bij zijn, en het samenstelpad houdt zich aan de
// rekenregels voor bit-gelijkheid.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { compose, composeEdition, basisOf, editionBasis, historyOf, nextHistory, mergePrevious, previousFrom, profileSummaryOf, HISTORY_SIZE } from '../src/lib/editionCore.js'
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

// De sleutels van een history-regel zoals historyOf in netlify/lib/stories.mjs (Hoot-herhaling, H5) hem
// schrijft, in die volgorde: web en app moeten dezelfde regel schrijven en lezen, zonder vertaling.
const HISTORY_KEYS = ['id', 'builtAt', 'storyIds', 'itemIds', 'leadIds', 'leadStoryId', 'titles', 'shown', 'keys']

test('history (H5): de samenvatting van een Editie heeft precies de sleutels van Hoot-herhaling, en previous is uit Edities en history-regels gelijk', () => {
  const { input, output } = byName.klimaat
  const row = historyOf(output)
  assert.deepEqual(Object.keys(row), HISTORY_KEYS)
  assert.equal(typeof row.keys, 'object')
  assert.equal(row.id, output.id)
  assert.ok(row.itemIds.length >= output.entries.length, 'alle stukken van de verhalen van toen')
  assert.ok(row.titles.length > 0)
  assert.equal(row.leadStoryId, output.entries[0].kind === 'story' ? output.entries[0].id : null, 'het hoofdverhaal gaat mee (wasLead)')
  assert.ok(Array.isArray(row.shown) && row.shown.length > 0 && row.shown.every((s) => typeof s.title === 'string' && 'publishedAt' in s), 'de getoonde berichten gaan mee (sameSubject)')
  assert.equal(historyOf(row), row, 'een regel die al een samenvatting is, blijft zoals hij is')
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(row))), JSON.stringify(row), 'platte JSON, zonder Set of Map')
  const fromEdition = mergePrevious([output])
  const fromRow = mergePrevious([row])
  assert.deepEqual(fromRow, fromEdition, 'uit de regel precies hetzelfde previous als uit de volle Editie, ook leadStoryId en shown')
  assert.equal(fromRow.leadStoryId, row.leadStoryId)
  assert.deepEqual([...fromRow.leadStoryIds], [row.leadStoryId].filter(Boolean))
  assert.equal(fromRow.at, fromEdition.at)
  assert.ok(fromRow.keysOf instanceof Map && fromEdition.keysOf instanceof Map, 'keysOf is een Map, zoals selectForReader hem leest')
  assert.deepEqual([...fromRow.atOf.entries()].sort(), [...fromEdition.atOf.entries()].sort())
  // Een regel van het web met een hoofdverhaal verliest dat niet bij het lezen.
  const web = { ...row, leadStoryId: 'abc' }
  assert.equal(mergePrevious([web]).leadStoryId, 'abc')
  assert.deepEqual([...mergePrevious([web]).leadStoryIds], ['abc'])
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

// De laatste drie dagdelen uit wat het toestel en het account vastlegden, zoals HootStore.recentHistory:
// elk dagdeel één keer (de eerste vermelding wint), nieuw naar oud, zonder het dagdeel van nu.
function recentHistory(rows, except, size = 3) {
  const seen = new Set()
  const unique = rows.filter((r) => r?.id && r.id !== except && !seen.has(r.id) && seen.add(r.id))
  return unique.map((r, i) => [r, i]).sort((a, b) => (Date.parse(b[0].builtAt) || 0) - (Date.parse(a[0].builtAt) || 0) || a[1] - b[1]).map(([r]) => r).slice(0, size)
}

test('H3/H5: drie dagdelen achter elkaar op het toestel — de geschiedenis wordt drie diep en de Avond kent de Ochtend', () => {
  const { output } = byName.klimaat
  const dagdeel = (id, builtAt) => ({ ...output, id, builtAt })
  // Ochtend: vastgelegd zoals keep() hem bewaart (met de eigen regel voorop).
  const ochtend = dagdeel('d1-ochtend', '2026-10-31T05:00:00.000Z')
  ochtend.history = nextHistory([], ochtend)
  assert.deepEqual(ochtend.history.map((h) => h.id), ['d1-ochtend'])
  // Middag: `prior` zoals loadPersonal hem bouwt — de hele vorige Editie voorop, dan haar history.
  let prior = recentHistory([ochtend, ...ochtend.history], 'd1-middag')
  assert.ok(!Array.isArray(prior[0].storyIds), 'de volle Editie wint van haar eigen regel, zoals op het web')
  const middag = dagdeel('d1-middag', '2026-10-31T11:00:00.000Z')
  middag.history = nextHistory(prior, middag)
  assert.deepEqual(middag.history.map((h) => h.id), ['d1-middag', 'd1-ochtend'], 'de volle Editie wordt samengevat, niet weggegooid')
  assert.ok(middag.history.every((h) => Array.isArray(h.storyIds) && !h.entries), 'alleen regels in de geschiedenis')
  assert.deepEqual(Object.keys(middag.history[1]), HISTORY_KEYS)
  // Avond: drie diep, en `previous` kent de Ochtend nog (atOf op haar builtAt).
  prior = recentHistory([middag, ...middag.history], 'd1-avond')
  const avond = dagdeel('d1-avond', '2026-10-31T16:00:00.000Z')
  avond.history = nextHistory(prior, avond)
  assert.equal(avond.history.length, 3)
  assert.deepEqual(avond.history.map((h) => h.id), ['d1-avond', 'd1-middag', 'd1-ochtend'])
  const previous = mergePrevious(prior)
  const storyId = output.entries.find((e) => e.kind === 'story').id
  assert.equal(previous.atOf.get(storyId), Date.parse(middag.builtAt), 'at per verhaal: de laatste Editie waarin het stond')
  const alleenOchtend = mergePrevious(prior.filter((r) => r.id === 'd1-ochtend'))
  assert.equal(alleenOchtend.atOf.get(storyId), Date.parse(ochtend.builtAt), 'de Ochtend staat er nog in')
  // leadStoryId en at zijn van de nieuwste Editie, hoe de lijst ook aangeleverd wordt (iOS: nieuw → oud).
  assert.equal(previous.at, Date.parse(middag.builtAt))
  assert.deepEqual(mergePrevious([...prior].reverse()), previous, 'volgorde van de invoer doet er niet toe')
  const gemengd = [{ ...historyOf(ochtend), leadStoryId: 'oud' }, { ...historyOf(middag), leadStoryId: 'nieuw' }]
  assert.equal(mergePrevious(gemengd).leadStoryId, 'nieuw')
  assert.equal(mergePrevious([...gemengd].reverse()).leadStoryId, 'nieuw')
  // Een vierde dagdeel: de Ochtend valt af.
  const nacht = dagdeel('d2-ochtend', '2026-11-01T05:00:00.000Z')
  nacht.history = nextHistory(recentHistory([avond, ...avond.history], 'd2-ochtend'), nacht)
  assert.deepEqual(nacht.history.map((h) => h.id), ['d2-ochtend', 'd1-avond', 'd1-middag'])
})

test('H2/H5: de kenmerken van toen (`keys` per plek) gaan als `keys` mee in de history-regel en komen als keysOf terug', () => {
  const { output } = byName.klimaat
  const stories = output.entries.filter((e) => e.kind === 'story')
  const withKeys = { ...output, entries: output.entries.map((e) => (e.kind === 'story' ? { ...e, keys: ['stewart', 'picard', e.id] } : e)) }
  const row = historyOf(withKeys)
  assert.deepEqual(Object.keys(row.keys).sort(), stories.flatMap((e) => [e.id, e.formerId].filter(Boolean)).sort())
  assert.deepEqual(row.keys[stories[0].id], ['stewart', 'picard', stories[0].id])
  const merged = mergePrevious([row, withKeys])
  assert.deepEqual([...merged.keysOf.get(stories[0].id)].sort(), ['picard', 'stewart', stories[0].id].sort())
  // Zonder `keys` (een oudere Editie) is het object leeg, en blijft previous verder gelijk.
  assert.deepEqual(historyOf(output).keys, {})
  assert.equal(mergePrevious([historyOf(output)]).keysOf.size, 0)
  // Ook de platte vorm van POST /api/edition (`keysOf` als Map) wordt begrepen.
  const flat = { ...row, keysOf: new Map([[stories[0].id, ['x']]]) }
  assert.deepEqual([...mergePrevious([flat]).keysOf.get(stories[0].id)], ['x'])
})

test('§8 Wat Hoot van je leerde: profileSummary uit de bundel geeft gekozen, geleerd en minder', () => {
  const { input } = byName.klimaat
  const base = { interests: input.interests, topics: input.topics, favorites: input.favorites, followed: input.followed, sources: input.sources, items: input.items.map(({ kind, source, topics }) => ({ kind, source, topics })) }
  const s = profileSummaryOf({ ...base, affinity: null, taste: null })
  assert.ok(s.chosen.includes('klimaat'), 'klimaat is gekozen')
  assert.deepEqual(s.learned, [])
  assert.deepEqual(s.less, [])
  const t = profileSummaryOf({ ...base, taste: { topics: { voetbal: -12 }, sources: {} } })
  assert.deepEqual(t.less, ['voetbal'])
  const l = profileSummaryOf({ ...base, affinity: { n: 40, topics: { ruimte: 30 }, sources: { nos: 40 } } })
  assert.ok(l.learned.includes('ruimte') || l.chosen.includes('ruimte'), 'veel over ruimte lezen telt mee')
  assert.deepEqual(profileSummaryOf(null), { chosen: [], learned: [], less: [] })
  // Dezelfde uitkomst als tekst (zoals Swift hem vraagt).
  const sandbox = createContext({})
  runInContext(readCore(), sandbox)
  const core = runInContext('globalThis.HootCore', sandbox)
  assert.equal(core.profileSummaryJSON(JSON.stringify({ ...base, taste: { topics: { voetbal: -12 }, sources: {} } })), JSON.stringify(t))
})
