// Eén toets voor "nieuw feit" (redacteur-2026-11-13-nieuw-feit; Hoot-design/redacteur-herhaling/DIAGNOSE.md en ADVIES.md).
// Een verhaal uit je vorige Editie (developedSince) of dat je las (personalParts, ctx.newFacts) komt alleen terug met een
// nieuw feit: een naam of begrip dat nieuwe stukken van minstens twee uitgevers noemen, dat er eerder niet in stond, en
// waarvan er minstens twee samen in één nieuw stuk staan (geen losse woorden). Geteld over het hele verhaal, niet alleen
// over je eigen bronnen. Zonder nieuw feit: gelezen verdwijnt, alleen gezien (groot verhaal) zakt één keer.
// Verzonnen namen: de regel kent geen namen of onderwerpen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newFact, newFactIn, developedSince, previousOf, signatures, selectForReader } from '../netlify/lib/stories.mjs'
import { personalParts, profileOf, P } from '../shared/editor.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { serverFirst, servedLocal, SERVER_KEY } from '../src/lib/editionSync.js'

const OCHTEND = Date.parse('2026-10-30T05:00:00Z')
const NOW = Date.parse('2026-10-30T11:00:00Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
const art = (id, source, title, iso, summary = title + '.') => ({ id, kind: 'article', source, sourceName: source, title, summary, publishedAt: iso, image: 'https://x/y.jpg' })

// Toen (vóór de Ochtend): een topman onder vuur.
const old = [
  art('o1', 'nos', 'Topman Ruben Kalverda van chipmaker Orbix onder vuur na affaire', new Date(OCHTEND - 3 * 36e5).toISOString()),
  art('o2', 'nrc', 'Orbix-bestuur beraadt zich over Ruben Kalverda', new Date(OCHTEND - 2 * 36e5).toISOString()),
]
// Sindsdien: alleen beschouwingen, met losse woorden die elk twee uitgevers noemen maar nooit samen (ruis).
const noise = [
  art('z1', 'guardian', 'Orbix shares slide in Lisbon trading as Kalverda scandal deepens', at(4)),
  art('z2', 'bbc', 'Kalverda affair: what Orbix investors in Lisbon are asking', at(3.5)),
  art('z3', 'economist', 'Orbix and the CFO question', at(3), 'The finance chief of Orbix faces questions from investors.'),
  art('z4', 'atlantic', 'Why the Orbix CFO matters now', at(2.5), 'Kalverda leaves a vacuum.'),
]
// Het echte nieuws: een opvolger, door twee redacties gemeld.
const fact = [
  art('n1', 'volkskrant', 'Marlies Verhoeven volgt Ruben Kalverda op als topman van Orbix', at(2)),
  art('n2', 'trouw', 'Orbix benoemt Marlies Verhoeven tot interim-topman na vertrek Kalverda', at(1.5)),
]
const all = [...old, ...noise, ...fact]
const sig = signatures(all)
const keysOf = (i) => { const s = sig.get(i.id); return s ? [...s.strong, ...s.concepts] : [] }
const thenOf = (xs) => new Set(xs.flatMap(keysOf))
const ochtend = { builtAt: new Date(OCHTEND).toISOString(), entries: [{ kind: 'story', id: 'st-orbix', leadId: 'o1', desk: 'tech', itemIds: old.map((i) => i.id), title: old[0].title }] }
const story = (xs) => ({ id: 'st-orbix', itemIds: xs.map((i) => i.id), sourceCount: xs.length, latestAt: xs[xs.length - 1].publishedAt, desk: 'tech' })

test('newFact: losse woorden die elk twee uitgevers noemen, maar nooit samen in één stuk, zijn geen nieuw feit', () => {
  assert.equal(newFact(noise, thenOf(old), keysOf), null)
})
test('newFact: een nieuwe naam die twee uitgevers noemen is een nieuw feit; één uitgever niet', () => {
  const f = newFact([...noise, ...fact], thenOf(old), keysOf)
  assert.ok(f, 'de opvolger is nieuw')
  assert.ok(['marlies', 'verhoeven'].every((k) => f.keys.includes(k)), `feiten: ${f.keys}`)
  assert.ok(f.carriers.every((i) => fact.includes(i)))
  assert.equal(newFact([...noise, fact[0]], thenOf(old), keysOf), null, 'één redactie is geen nieuw feit')
  // Wat er toen al stond, is nooit nieuw.
  assert.equal(newFact(fact, thenOf([...old, ...fact]), keysOf), null)
})

test('developedSince: meer stukken zonder nieuw feit is geen ontwikkeling; met nieuw feit wel, met een kop die het noemt', () => {
  const previous = previousOf(ochtend)
  assert.equal(developedSince(story([...old, ...noise]), [...old, ...noise], previous, sig), null)
  const dev = developedSince(story(all), all, previous, sig, { mainIds: new Set(all.map((i) => i.source)), now: NOW })
  assert.ok(dev, 'ontwikkeld')
  assert.ok(fact.includes(dev.lead), `de kop noemt het nieuwe feit (${dev.lead?.id})`)
  assert.ok(dev.heads.every((i) => fact.includes(i)))
  assert.equal(dev.fresh.length, 6, 'vervolg telt je nieuwe stukken')
})
test('developedSince telt over het hele verhaal (known), de kop komt uit je eigen bronnen', () => {
  const previous = previousOf(ochtend)
  const mine = [...old, noise[0]] // je volgt alleen NOS, NRC en de Guardian
  const known = new Map(all.map((i) => [i.id, i]))
  assert.equal(developedSince(story(all), mine, previous, sig), null, 'met alleen je eigen bronnen geen nieuw feit')
  const dev = developedSince(story(all), mine, previous, sig, { known, now: NOW })
  assert.ok(dev, 'het hele verhaal heeft het nieuwe feit')
  assert.deepEqual(dev.heads.map((i) => i.id), ['z1'], 'de kop is je eigen nieuwe stuk')
  // Geen nieuw stuk uit je eigen bronnen: niets om als kop te tonen.
  assert.equal(developedSince(story(all), old, previous, sig, { known, now: NOW }), null)
})

const newFacts = (fresh, before, own) => newFactIn(fresh, before, sig, own)
const prof = profileOf({ interests: [], topics: [], affinity: null, taste: null, favorites: [], followed: new Set(all.map((i) => i.source)), sources: [], supply: {} })
test('personalParts: gelezen en er kwamen alleen stukken bij: geen vervolg (+10), maar gezien', () => {
  const p = personalParts([...old, ...noise], prof, { readIds: new Set(['o1', 'o2']), newFacts }, { whole: [...old, ...noise] })
  assert.ok(p.seen && !p.followUp)
  // Zonder de toets (oude aanroepen): zoals vroeger een vervolg bij ≥ 2 nieuwe stukken.
  assert.ok(personalParts([...old, ...noise], prof, { readIds: new Set(['o1', 'o2']) }).followUp)
})
test('personalParts: gelezen en er is een nieuw feit: vervolg, met de kop uit een stuk dat het noemt', () => {
  const p = personalParts(all, prof, { readIds: new Set(['o1', 'o2']), newFacts }, { whole: all })
  assert.equal(p.followUp?.pts, P.FOLLOW_UP)
  assert.ok(p.followUp.heads.length && p.followUp.heads.every((id) => ['n1', 'n2'].includes(id)))
})
test('personalParts: het nieuwe feit telt over het hele verhaal, ook als je eigen bronnen het niet noemen', () => {
  const mine = [...old, noise[0]]
  const p = personalParts(mine, prof, { readIds: new Set(['o1']), newFacts }, { whole: all })
  assert.ok(p.followUp, 'vervolg op het hele verhaal')
  assert.deepEqual(p.followUp.heads, ['z1'])
  assert.ok(personalParts(mine, prof, { readIds: new Set(['o1']), newFacts }, { whole: mine }).seen, 'zonder de rest van het verhaal: gezien')
})

// Een groot verhaal (twaalf uitgevers) uit je vorige Editie, met één nieuw stuk maar geen nieuw feit, naast verse verhalen.
const SOURCES = ['nos', 'nrc', 'volkskrant', 'trouw', 'parool', 'rtl', 'nu', 'ad', 'fd', 'telegraaf', 'nd', 'tweakers'].map((id) => ({ id, cat: 'nl', lang: 'nl' }))
const FOLLOWED = new Set(SOURCES.map((s) => s.id))
const big = SOURCES.map((s, k) => art('b' + k, s.id, 'Kabinet en oppositie botsen over begroting van Defensie', new Date(OCHTEND - 36e5 * (1 + k * 0.1)).toISOString()))
const bigNew = art('b-nieuw', 'nos', 'Wat staat er op het spel bij de begroting van Defensie?', at(1))
const stBig = { id: 'st-big', itemIds: [...big.map((i) => i.id), bigNew.id], sourceCount: 12, publisherCount: 12, latestAt: bigNew.publishedAt, desk: 'binnenland' }
const TOWNS = ['Utrecht', 'Groningen', 'Breda', 'Zwolle', 'Leiden', 'Delft', 'Haarlem', 'Almere', 'Tilburg', 'Arnhem']
const small = TOWNS.map((t, k) => {
  const its = [art(`s${k}a`, SOURCES[k % 12].id, `Gemeente ${t} sluit zwembad om tekort op begroting`, at(1 + k * 0.1)), art(`s${k}b`, SOURCES[(k + 5) % 12].id, `Zwembad in ${t} dicht door bezuinigingen gemeente`, at(1.2 + k * 0.1))]
  return { st: { id: 'st-s' + k, itemIds: its.map((i) => i.id), sourceCount: 2, publisherCount: 2, latestAt: its[0].publishedAt, desk: 'binnenland' }, its }
})
const pool = [...big, bigNew, ...small.flatMap((s) => s.its)]
const stories = [stBig, ...small.map((s) => s.st)]
const vorige = { id: '2026-10-30-ochtend', builtAt: new Date(OCHTEND).toISOString(), entries: [{ kind: 'story', id: 'st-big', leadId: 'b0', desk: 'binnenland', itemIds: big.map((i) => i.id), title: big[0].title }] }
const global = { id: '2026-10-30-middag', slot: 'middag', date: '2026-10-30', builtAt: new Date(NOW).toISOString(), entries: [{ kind: 'story', id: 'st-s0', leadId: 's0a', desk: 'binnenland' }], items: [small[0].its[0]], bubble: [] }
const compose = (opts) => composePersonal({ global, stories, items: pool, sources: SOURCES, followed: FOLLOWED, interests: ['binnenland'], now: NOW, ...opts })

test('persoonlijke Editie: alleen in je vorige Editie, niet gelezen, geen nieuw feit: het grote verhaal zakt onder de top 5', () => {
  const zonder = compose({ previous: null })
  assert.equal(zonder.entries[0].id, 'st-big', 'zonder vorige Editie opent het grote verhaal')
  const mine = compose({ previous: previousOf(vorige) })
  const k = mine.entries.findIndex((e) => e.id === 'st-big')
  assert.ok(k >= 5, `het grote verhaal staat op ${k + 1}`)
  assert.equal(mine.entries[k].held, true)
  assert.equal(mine.entries[k].leadId, 'b-nieuw', 'met het nieuwe stuk als kop')
  // Eén keer: de volgende Editie (met deze als vorige) laat het weg.
  const next = compose({ previous: previousOf([{ ...mine, id: '2026-10-30-middag', builtAt: new Date(NOW).toISOString() }, vorige]) })
  assert.ok(!next.entries.some((e) => e.id === 'st-big'), 'twee keer gezakt')
})
test('persoonlijke Editie: gelezen en geen nieuw feit: het verhaal verdwijnt, met of zonder vorige Editie', () => {
  for (const previous of [null, previousOf(vorige)]) {
    const mine = compose({ previous, readIds: new Set(['b0', 'b1']) })
    assert.ok(!mine.entries.some((e) => e.id === 'st-big'), `terug ${previous ? 'met' : 'zonder'} vorige Editie`)
  }
})
test('selectForReader: een gezakt verhaal is geen voorpagina en geen vervolg', () => {
  const p = profileOf({ interests: ['binnenland'], topics: [], affinity: null, taste: null, favorites: [], followed: FOLLOWED, sources: SOURCES, supply: {} })
  const sel = selectForReader(stories, pool, { mainIds: FOLLOWED, now: NOW, prof: p, ctx: {}, seed: 't', previous: previousOf(vorige) })
  const e = sel.find((x) => x.id === 'st-big')
  assert.ok(e && e.held && !e.front && !e.vervolg)
})

// Web-vangnet: na een dagdeelwissel neemt het vangnet de laatste Editie van de server op dit toestel als vorige Editie mee.
test('web-vangnet: na een dagdeelwissel telt de Editie van het vorige dagdeel als previous', async () => {
  const owner = 'anon'
  const local = { id: '2026-10-30-ochtend', builtAt: new Date(OCHTEND).toISOString(), owner, basis: 'b1', entries: vorige.entries, history: [] }
  assert.equal(servedLocal(local, `2026-10-30-ochtend|${owner}|b1`, owner), true)
  assert.equal(servedLocal(local, '', owner), false, 'zonder sleutel: niet van de server')
  assert.equal(servedLocal(local, `2026-10-30-ochtend|${owner}|b1`, 'iemand'), false, 'van een andere lezer')
  assert.equal(typeof SERVER_KEY, 'string')
  let seen = null
  const run = (localServed) => serverFirst({ global, owner, basis: 'b1', local, localFromServer: false, localServed, online: false, ready: true, compose: ({ previous }) => { seen = previous; return null } })
  await run(false)
  assert.equal(seen, null, 'vroeger: geen vorige Editie')
  await run(true)
  assert.ok(seen?.storyIds?.has('st-big'), 'nu: de Editie van de Ochtend is de vorige')
})
