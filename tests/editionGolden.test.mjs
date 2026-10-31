// Pariteit web en iOS (bouwspec §9): de rekenkern geeft uit de vaste invoer van vier lezers byte voor
// byte de vastgelegde uitvoer, ook als kale bundel zonder node eromheen (zoals JavaScriptCore op de
// iPhone hem draait). De ingecheckte bundel moet bij zijn, en het samenstelpad houdt zich aan de
// rekenregels voor bit-gelijkheid.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import { compose, composeEdition, basisOf, editionBasis, historyOf, nextHistory, mergePrevious, previousFrom, earlierEditions, earlierEditionsJSON, recentEditions, profileSummaryOf, HISTORY_SIZE } from '../src/lib/editionCore.js'
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
  // De geschiedenis: de Edities ervóór, nieuwste eerst, de laatste drie — nooit de Editie zelf (de vorm van het web).
  const eerder = (id, h) => ({ ...row, id, builtAt: new Date(Date.parse(row.builtAt) - h * 36e5).toISOString() })
  const hist = nextHistory([eerder('z', 18), eerder('x', 6), eerder('w', 24), eerder('y', 12), { ...row, id: output.id }], output)
  assert.equal(hist.length, HISTORY_SIZE)
  assert.deepEqual(hist.map((h) => h.id), ['x', 'y', 'z'], 'nieuwste eerst, de vierde valt af, de Editie zelf nooit')
  assert.deepEqual(nextHistory(hist, output), hist, 'regels die al samenvattingen zijn, komen ongewijzigd terug')
  assert.deepEqual(nextHistory([output], output), [], 'alleen zichzelf: een lege geschiedenis')
})

// Drie dagdelen van dezelfde lezer, en een vierde en vijfde; `previous` plat en gesorteerd om twee
// uitkomsten met deepEqual te vergelijken; de ids van een lijst.
const O = ['d1-ochtend', '2026-10-31T05:00:00.000Z'], M = ['d1-middag', '2026-10-31T11:00:00.000Z'], A = ['d1-avond', '2026-10-31T16:00:00.000Z'], N = ['d2-ochtend', '2026-11-01T05:00:00.000Z']
const ids = (list) => list.map((r) => r.id)
const flat = (p) => p && JSON.parse(JSON.stringify({ ...p, storyIds: [...p.storyIds].sort(), itemIds: [...p.itemIds].sort(), leadIds: [...p.leadIds].sort(), titles: [...p.titles].sort(), leadStoryIds: [...p.leadStoryIds], atOf: Object.fromEntries(p.atOf), keysOf: Object.fromEntries([...p.keysOf].map(([k, v]) => [k, [...v].sort()])) }))

// Vastgelegde Edities zoals het toestel (loadPersonal → keep) en het web (usePersonalEdition) ze bewaren:
// dezelfde Editie op een ander dagdeel, van lezer `owner`, met de `history` die bij het vastleggen
// meegaat — nextHistory over earlierEditions, dus de Edities ervóór, nooit zichzelf.
function scenario() {
  const { output } = byName.klimaat
  const dagdeel = ([id, builtAt], owner = 'u1') => ({ ...output, id, builtAt, owner })
  const vastgelegd = (e, { local = null, account = null } = {}) => ({ ...e, history: nextHistory(earlierEditions({ local, account, id: e.id, owner: e.owner }), e) })
  return { output, dagdeel, vastgelegd }
}

test('H3/H5: drie dagdelen achter elkaar op het toestel — history in de vorm van het web (de Edities ervóór, nooit zichzelf), drie diep, en de Avond kent de Ochtend', () => {
  const { output, dagdeel, vastgelegd } = scenario()
  const ochtend = vastgelegd(dagdeel(O))
  assert.deepEqual(ochtend.history, [], 'de eerste Editie: niets ervóór')
  // Middag: earlierEditions geeft de Ochtend voluit (haar history is leeg).
  let prior = earlierEditions({ local: ochtend, account: null, id: M[0], owner: 'u1' })
  assert.deepEqual(ids(prior), ['d1-ochtend'])
  assert.ok(prior[0].entries, 'de volle Editie, niet een regel')
  const middag = vastgelegd(dagdeel(M), { local: ochtend })
  assert.deepEqual(ids(middag.history), ['d1-ochtend'], 'de Editie ervóór, samengevat; de Middag zelf niet')
  assert.ok(middag.history.every((h) => Array.isArray(h.storyIds) && !h.entries), 'alleen regels in de geschiedenis')
  assert.deepEqual(Object.keys(middag.history[0]), HISTORY_KEYS)
  assert.deepEqual(middag.history, prior.map(historyOf), 'precies earlier.map(historyOf), zoals usePersonalEdition schrijft')
  // Avond: de Middag voluit, de Ochtend als regel; de volle Editie wint van haar eigen regel (de eerste vermelding).
  prior = earlierEditions({ local: middag, account: null, id: A[0], owner: 'u1' })
  assert.deepEqual(ids(prior), ['d1-middag', 'd1-ochtend'])
  assert.ok(prior[0].entries && Array.isArray(prior[1].storyIds))
  const avond = vastgelegd(dagdeel(A), { local: middag })
  assert.deepEqual(ids(avond.history), ['d1-middag', 'd1-ochtend'])
  // `previous` kent de Ochtend nog (atOf op haar builtAt); at en leadStoryId zijn van de nieuwste.
  const previous = mergePrevious(prior)
  const storyId = output.entries.find((e) => e.kind === 'story').id
  assert.equal(previous.atOf.get(storyId), Date.parse(middag.builtAt), 'at per verhaal: de laatste Editie waarin het stond')
  assert.equal(mergePrevious(prior.filter((r) => r.id === 'd1-ochtend')).atOf.get(storyId), Date.parse(ochtend.builtAt), 'de Ochtend staat er nog in')
  assert.equal(previous.at, Date.parse(middag.builtAt))
  assert.deepEqual(mergePrevious([...prior].reverse()), previous, 'volgorde van de invoer doet er niet toe')
  const gemengd = [{ ...historyOf(ochtend), leadStoryId: 'oud' }, { ...historyOf(middag), leadStoryId: 'nieuw' }]
  assert.equal(mergePrevious(gemengd).leadStoryId, 'nieuw')
  assert.equal(mergePrevious([...gemengd].reverse()).leadStoryId, 'nieuw')
  // Een vierde dagdeel: drie diep; een vijfde: de Ochtend valt af.
  const nacht = vastgelegd(dagdeel(N), { local: avond })
  assert.deepEqual(ids(nacht.history), ['d1-avond', 'd1-middag', 'd1-ochtend'])
  assert.equal(nacht.history.length, HISTORY_SIZE)
  const later = vastgelegd(dagdeel(['d2-middag', '2026-11-01T11:00:00.000Z']), { local: nacht })
  assert.deepEqual(ids(later.history), ['d2-ochtend', 'd1-avond', 'd1-middag'])
  // recentEditions: een regel zonder builtAt telt niet, zoals op het web.
  assert.deepEqual(ids(recentEditions([{ ...historyOf(ochtend), id: 'kaal', builtAt: undefined }, ochtend])), ['d1-ochtend'])
})

test('P8-1/H5: Middag overgeslagen op het toestel, het web schreef de Middag met history [Ochtend] — de Avond op iOS kent [Middag, Ochtend], gelijk aan het web', () => {
  const { output, dagdeel, vastgelegd } = scenario()
  const ochtend = vastgelegd(dagdeel(O)) // op het toestel én in het account
  // Het web stelde de Middag samen (met de Ochtend uit het account) en schreef haar in user_state.
  const webMiddag = vastgelegd(dagdeel(M), { local: null, account: ochtend })
  assert.deepEqual(ids(webMiddag.history), ['d1-ochtend'])
  // Het toestel sloeg de Middag over: lokaal nog de Ochtend, in het account de Middag van het web.
  const prior = earlierEditions({ local: ochtend, account: webMiddag, id: A[0], owner: 'u1' })
  assert.deepEqual(ids(prior), ['d1-middag', 'd1-ochtend'], 'de volle Editie uit het account telt mee als zij van een ander dagdeel is')
  assert.ok(prior[0].entries, 'de Middag voluit')
  const previous = mergePrevious(prior)
  const storyId = output.entries.find((e) => e.kind === 'story').id
  assert.equal(previous.at, Date.parse(webMiddag.builtAt), 'previous kent de Middag')
  assert.equal(previous.atOf.get(storyId), Date.parse(webMiddag.builtAt))
  // Een toestel met niets lokaal (het web na het wissen van zijn opslag) rekent uit het account hetzelfde.
  assert.deepEqual(flat(previous), flat(mergePrevious(earlierEditions({ local: null, account: webMiddag, id: A[0], owner: 'u1' }))))
  const avond = vastgelegd(dagdeel(A), { local: ochtend, account: webMiddag })
  assert.deepEqual(ids(avond.history), ['d1-middag', 'd1-ochtend'])
  assert.deepEqual(avond.history[0], historyOf(webMiddag))
})

test('H5: web en app wisselen van geschiedenis — door het web geschreven en door iOS gelezen en omgekeerd geeft hetzelfde previous, en overnemen herschrijft niets', () => {
  const { dagdeel, vastgelegd } = scenario()
  const ochtend = vastgelegd(dagdeel(O))
  // iOS → web: iOS schreef de Middag (history [Ochtend]); het web leest voor de Avond alleen uit het account.
  const iosMiddag = vastgelegd(dagdeel(M), { local: ochtend })
  const webEarlier = earlierEditions({ local: null, account: iosMiddag, id: A[0], owner: 'u1' })
  const iosEarlier = earlierEditions({ local: iosMiddag, account: iosMiddag, id: A[0], owner: 'u1' })
  assert.deepEqual(ids(webEarlier), ['d1-middag', 'd1-ochtend'])
  assert.deepEqual(flat(mergePrevious(webEarlier)), flat(mergePrevious(iosEarlier)))
  assert.deepEqual(nextHistory(webEarlier, dagdeel(A)), nextHistory(iosEarlier, dagdeel(A)), 'beide schrijven dezelfde history voor de Avond')
  // web → iOS: het web schreef de Middag; iOS leest voor de Avond met lokaal de Ochtend.
  const webMiddag = vastgelegd(dagdeel(M), { local: null, account: ochtend })
  const iosEarlier2 = earlierEditions({ local: ochtend, account: webMiddag, id: A[0], owner: 'u1' })
  const webEarlier2 = earlierEditions({ local: webMiddag, account: webMiddag, id: A[0], owner: 'u1' })
  assert.deepEqual(flat(mergePrevious(iosEarlier2)), flat(mergePrevious(webEarlier2)))
  assert.deepEqual(nextHistory(iosEarlier2, dagdeel(A)), nextHistory(webEarlier2, dagdeel(A)))
  // Overnemen (adopt): een door het web geschreven Editie krijgt haar history ongewijzigd terug, ook als
  // het toestel een oudere Editie van deze lezer heeft.
  for (const local of [null, ochtend, { ...ochtend, history: [] }]) {
    const adopted = nextHistory(earlierEditions({ local, account: webMiddag, id: webMiddag.id, owner: 'u1' }), webMiddag)
    assert.deepEqual(adopted, webMiddag.history, 'adopt herschrijft een web-geschreven geschiedenis niet')
  }
  // En andersom: het web neemt een iOS-Middag over en houdt haar history.
  assert.deepEqual(earlierEditions({ local: ochtend, account: iosMiddag, id: iosMiddag.id, owner: 'u1' }).map(historyOf), iosMiddag.history)
})

test('eigenaarsfilter: wat lokaal van een andere lezer is, telt niet — anon bij lid u1 geeft niets, en na uitloggen rekent anon niet met de geschiedenis van het lid', () => {
  const { dagdeel, vastgelegd } = scenario()
  const anon = vastgelegd(dagdeel(O, 'anon'))
  const lid = vastgelegd(dagdeel(M), { local: null, account: vastgelegd(dagdeel(O)) })
  assert.deepEqual(earlierEditions({ local: anon, account: null, id: M[0], owner: 'u1' }), [], 'anon-lokaal bij lid u1: prior leeg')
  assert.equal(previousFrom(earlierEditions({ local: anon, account: null, id: M[0], owner: 'u1' })), null)
  assert.deepEqual(earlierEditions({ local: lid, account: null, id: A[0], owner: 'anon' }), [], 'na uitloggen: de Middag en haar history van het lid tellen niet')
  assert.deepEqual(ids(earlierEditions({ local: lid, account: null, id: A[0], owner: 'u1' })), ['d1-middag', 'd1-ochtend'], 'dezelfde lezer wél')
  assert.deepEqual(ids(earlierEditions({ local: anon, account: null, id: M[0], owner: 'anon' })), ['d1-ochtend'])
  assert.deepEqual(ids(earlierEditions({ local: anon, account: null, id: M[0], owner: null })), ['d1-ochtend'], 'zonder eigenaar geen filter')
  // De rij uit het account is altijd van deze lezer en telt mee, ook naast anon-lokaal.
  assert.deepEqual(ids(earlierEditions({ local: anon, account: lid, id: A[0], owner: 'u1' })), ['d1-middag', 'd1-ochtend'])
  // De JSON-ingang die Swift aanroept: "null" voor niets.
  assert.equal(earlierEditionsJSON('null', 'null', 'x', 'u1'), '[]')
  assert.deepEqual(JSON.parse(earlierEditionsJSON(JSON.stringify(anon), 'null', M[0], 'u1')), [])
  assert.deepEqual(ids(JSON.parse(earlierEditionsJSON(JSON.stringify(anon), JSON.stringify(lid), A[0], 'u1'))), ['d1-middag', 'd1-ochtend'])
})

// Pariteit met de webcode zelf: dezelfde scenario's door src/lib/personal.js (earlierEditions) en
// netlify/lib/stories.mjs (historyOf, previousOf, recentEditions) van het web en door de rekenkern,
// deepEqual. Sinds de samenvoeging importeert de rekenkern die functies; de toets blijft staan als wacht
// (en HOOT_WEB kan naar een andere checkout van de webcode wijzen, bijvoorbeeld een oudere).
const WEB = process.env.HOOT_WEB || fileURLToPath(new URL('..', import.meta.url))
test('pariteit met de webcode: earlierEditions, history en previous van web en app zijn deepEqual in alle scenario’s (iOS→web, web→iOS, overslaan, eigenaar)', { skip: !existsSync(resolve(WEB, 'src/lib/personal.js')) && `geen webcode op ${WEB}` }, async () => {
  const web = await import(pathToFileURL(resolve(WEB, 'netlify/lib/stories.mjs')).href)
  const webPersonal = await import(pathToFileURL(resolve(WEB, 'src/lib/personal.js')).href)
  assert.equal(HISTORY_SIZE, web.HISTORY_MAX)
  const { dagdeel } = scenario()
  const plain = (x) => JSON.parse(JSON.stringify(x))
  // Vastleggen zoals het web het doet, met de webcode.
  const webVast = (e, { local = null, account = null } = {}) => ({ ...e, history: webPersonal.earlierEditions({ local, account, id: e.id, owner: e.owner }).map(web.historyOf).filter(Boolean) })
  const ochtend = webVast(dagdeel(O)), anon = webVast(dagdeel(O, 'anon'))
  const webMiddag = webVast(dagdeel(M), { local: null, account: ochtend })
  const iosMiddag = { ...dagdeel(M), history: nextHistory(earlierEditions({ local: ochtend, account: null, id: M[0], owner: 'u1' }), dagdeel(M)) }
  assert.deepEqual(plain(iosMiddag.history), plain(webMiddag.history), 'iOS en web schrijven dezelfde history voor de Middag')
  const avond = webVast(dagdeel(A), { local: webMiddag, account: webMiddag })
  const cases = [
    { naam: 'eerste dagdeel', local: null, account: null, id: O[0], owner: 'u1' },
    { naam: 'tweede dagdeel', local: ochtend, account: ochtend, id: M[0], owner: 'u1' },
    { naam: 'P8-1: Middag overgeslagen, web schreef haar', local: ochtend, account: webMiddag, id: A[0], owner: 'u1' },
    { naam: 'web leest iOS-Middag', local: null, account: iosMiddag, id: A[0], owner: 'u1' },
    { naam: 'iOS leest eigen Middag plus account', local: iosMiddag, account: webMiddag, id: A[0], owner: 'u1' },
    { naam: 'adopt van de Middag', local: ochtend, account: webMiddag, id: M[0], owner: 'u1' },
    { naam: 'vierde dagdeel', local: avond, account: avond, id: N[0], owner: 'u1' },
    { naam: 'anon-lokaal bij lid', local: anon, account: null, id: M[0], owner: 'u1' },
    { naam: 'na uitloggen', local: avond, account: null, id: N[0], owner: 'anon' },
    { naam: 'zonder eigenaar', local: anon, account: null, id: M[0], owner: null },
  ]
  for (const c of cases) {
    const mine = earlierEditions(c), theirs = webPersonal.earlierEditions(c)
    assert.deepEqual(plain(mine), plain(theirs), `${c.naam}: earlierEditions`)
    assert.deepEqual(plain(nextHistory(mine, { id: c.id })), plain(theirs.map(web.historyOf).filter(Boolean)), `${c.naam}: history`)
    assert.deepEqual(flat(mergePrevious(mine)), flat(web.previousOf(theirs)), `${c.naam}: previous`)
  }
  // De samenvatting zelf, sleutel voor sleutel in dezelfde volgorde; en regels zonder builtAt vallen bij beiden af.
  assert.deepEqual(Object.keys(historyOf(ochtend)), Object.keys(web.historyOf(ochtend)))
  assert.deepEqual(plain(historyOf(ochtend)), plain(web.historyOf(ochtend)))
  const kaal = { ...web.historyOf(ochtend), id: 'kaal', builtAt: undefined }
  assert.deepEqual(ids(recentEditions([kaal, ochtend, webMiddag])), ids(web.recentEditions([kaal, ochtend, webMiddag])))
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
