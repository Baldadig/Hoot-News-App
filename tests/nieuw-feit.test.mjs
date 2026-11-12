// Eén toets voor "nieuw feit" (redacteur-2026-11-13-nieuw-feit; Hoot-design/redacteur-herhaling/DIAGNOSE.md en ADVIES.md).
// Een verhaal uit je vorige Editie (developedSince) of dat je las (personalParts, ctx.newFacts) komt alleen terug met een
// nieuw feit: een naam of begrip dat nieuwe stukken van minstens twee uitgevers noemen, dat er eerder niet in stond, en
// waarvan er minstens twee samen in één nieuw stuk staan (geen losse woorden). Geteld over het hele verhaal, niet alleen
// over je eigen bronnen. Zonder nieuw feit: gelezen verdwijnt, alleen gezien (groot verhaal) zakt één keer.
// Verzonnen namen: de regel kent geen namen of onderwerpen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newFact, newFactIn, developedSince, previousOf, signatures, selectForReader, storyKeyAt, buildStories } from '../netlify/lib/stories.mjs'
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

const newFacts = (fresh, before, own, whole) => newFactIn(fresh, before, sig, own, whole)
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

// Keuring 1, bevinding 1: wie weinig bronnen volgt, kent van de nieuwe stukken maar één uitgever. De server geeft per verhaal
// de kenmerken van het hele verhaal mee (`keyAt`: eerste moment en aantal uitgevers), zodat de toets toch over alle uitgevers
// telt. Zonder die gegevens (een oudere kern, het vangnet in de app) telt een kenmerk dat twee nieuwe stukken noemen, als het
// toestel minder dan twee uitgevers van de nieuwe stukken kent en het verhaal er wel twee of meer heeft.
const keyAt = storyKeyAt(all, sig)
const stAll = { ...story(all), publisherCount: new Set(all.map((i) => i.source)).size, keyAt }
test('storyKeyAt: per kenmerk met minstens twee uitgevers het eerste moment en het aantal uitgevers', () => {
  assert.deepEqual(keyAt.marlies, [Date.parse(fact[0].publishedAt), 2])
  assert.equal(keyAt.kalverda[0], Date.parse(old[0].publishedAt), 'stond er al in de Ochtend')
  assert.ok(Object.values(keyAt).every(([, n]) => n >= 2), 'alleen kenmerken van twee of meer uitgevers')
  assert.deepEqual(Object.keys(keyAt), [...Object.keys(keyAt)].sort(), 'op volgorde: de kern blijft byte-gelijk')
  // buildStories met kenmerken geeft het mee, net als `keys`.
  const [b] = buildStories(all, {}, { keys: true })
  assert.ok(b && b.keyAt && typeof b.keyAt === 'object')
})
test('developedSince met keyAt: één eigen uitgever met het nieuwe feit is genoeg als het hele verhaal het bij twee heeft', () => {
  const previous = previousOf(ochtend)
  const mine = [...old, fact[0]] // je volgt alleen NOS, NRC en de Volkskrant
  const known = new Map(mine.map((i) => [i.id, i]))
  assert.equal(developedSince(story(all), mine, previous, sig, { known, now: NOW }), null, 'zonder de gegevens van het hele verhaal: geen nieuw feit')
  const dev = developedSince(stAll, mine, previous, sig, { known, now: NOW })
  assert.ok(dev, 'met keyAt telt de tweede uitgever mee')
  assert.deepEqual(dev.heads.map((i) => i.id), ['n1'])
  // Wat het hele verhaal al vóór de vorige Editie had, is nooit nieuw, ook als het toestel die stukken niet kent.
  const early = { ...stAll, keyAt: { ...keyAt, marlies: [OCHTEND - 36e5, 2], verhoeven: [OCHTEND - 36e5, 2] } }
  assert.equal(developedSince(early, mine, previous, sig, { known, now: NOW }), null)
})
test('personalParts met keyAt: gelezen, je eigen bron brengt het nieuwe feit, het hele verhaal bij twee uitgevers: vervolg', () => {
  const mine = [old[0], fact[0]]
  assert.ok(personalParts(mine, prof, { readIds: new Set(['o1']), newFacts }, { whole: mine }).seen, 'alleen wat het toestel kent: gezien')
  const p = personalParts(mine, prof, { readIds: new Set(['o1']), newFacts }, { whole: mine, keyAt, pubs: stAll.publisherCount })
  assert.equal(p.followUp?.pts, P.FOLLOW_UP)
  assert.deepEqual(p.followUp.heads, ['n1'])
})
test('terugval zonder keyAt: kent het toestel maar één uitgever van de nieuwe stukken, dan tellen twee nieuwe stukken', () => {
  const twice = [art('m1', 'volkskrant', 'Marlies Verhoeven volgt Kalverda op bij Orbix', at(2)), art('m2', 'volkskrant', 'Wie is Marlies Verhoeven, de nieuwe topman van Orbix?', at(1.5))]
  const xs = [...old, ...twice]
  const sg = signatures(xs)
  const ko = (i) => { const s = sg.get(i.id); return s ? [...s.strong, ...s.concepts] : [] }
  const then = new Set(old.flatMap(ko))
  assert.equal(newFact(twice, then, ko), null, 'zonder kennis van het verhaal: één uitgever is geen nieuw feit')
  assert.equal(newFact(twice, then, ko, { pubs: 1 }), null, 'een verhaal van één uitgever: geen terugval')
  assert.ok(newFact(twice, then, ko, { pubs: 5 }), 'het verhaal heeft meer uitgevers dan het toestel kent: twee stukken tellen')
  assert.equal(newFact(twice, then, ko, { pubs: 5, keyAt: { marlies: [Date.parse(twice[0].publishedAt), 1] } }), null, 'met keyAt geldt het hele verhaal, geen terugval')
})
test('persoonlijke Editie, alleen NOS gevolgd: echt nieuws komt terug als je het las of als het in je vorige Editie stond', () => {
  const T0 = new Date(OCHTEND - 3 * 36e5).toISOString(), T1 = new Date(OCHTEND - 2 * 36e5).toISOString()
  const kOld = [art('d1', 'nos', 'Kabinet botst met Tweede Kamer over visserijwet', T0), art('d2', 'nrc', 'Visserijwet: kabinet en Kamer lijnrecht tegenover elkaar', T1), art('d3', 'volkskrant', 'Kamer dreigt visserijwet weg te stemmen', T1)]
  const kNew = [art('d4', 'nos', 'Minister Sanne Oldenkamp treedt af na stemming over visserijwet', at(2)), art('d5', 'nos', 'Wie is Sanne Oldenkamp, de minister die opstapte?', at(1.8)), art('d6', 'nrc', 'Sanne Oldenkamp stapt op na verloren stemming visserijwet', at(1.5)), art('d7', 'volkskrant', 'Aftreden Sanne Oldenkamp schudt kabinet op', at(1.2))]
  // Met storyId, zoals in de kern: dan kan een stuk niet los terugkomen als het verhaal wegvalt.
  const xs = [...kOld, ...kNew].map((i) => ({ ...i, storyId: 'st-x' }))
  const stX = { id: 'st-x', itemIds: xs.map((i) => i.id), sourceCount: 4, publisherCount: 3, latestAt: kNew.at(-1).publishedAt, desk: 'binnenland', keyAt: storyKeyAt(xs, signatures(xs)) }
  const nos = new Set(['nos'])
  // Vijf andere verhalen, zodat er plaats is: de toets gaat over terugkomen, niet over de rangorde.
  const fillers = small.slice(0, 5).map((x) => ({ ...x, its: x.its.map((i) => ({ ...i, source: 'nos', sourceName: 'nos' })) }))
  const run = (opts) => composePersonal({ global: { ...global, items: [fillers[0].its[0]] }, stories: [stX, ...fillers.map((f) => f.st)], items: [...xs.filter((i) => nos.has(i.source)), ...fillers.flatMap((f) => f.its)], sources: SOURCES, followed: nos, interests: ['binnenland'], now: NOW, ...opts })
  const prev = previousOf({ id: '2026-10-30-ochtend', builtAt: new Date(OCHTEND).toISOString(), entries: [{ kind: 'story', id: 'st-x', leadId: 'd1', desk: 'binnenland', itemIds: kOld.map((i) => i.id), title: kOld[0].title }] })
  const place = (ed) => ed.entries.findIndex((e) => e.id === 'st-x')
  assert.equal(place(run({ readIds: new Set(['d1']) })), 0, 'gelezen, met keyAt: 01')
  assert.ok(place(run({ previous: prev })) >= 0, 'in je vorige Editie, met keyAt: terug')
  const zonder = { ...stX }
  delete zonder.keyAt
  const run2 = (opts) => composePersonal({ global: { ...global, items: [fillers[0].its[0]] }, stories: [zonder, ...fillers.map((f) => f.st)], items: [...xs.filter((i) => nos.has(i.source)), ...fillers.flatMap((f) => f.its)], sources: SOURCES, followed: nos, interests: ['binnenland'], now: NOW, ...opts })
  assert.equal(place(run2({ readIds: new Set(['d1']) })), 0, 'gelezen, zonder keyAt (terugval, twee NOS-stukken): 01')
  assert.ok(place(run2({ previous: prev })) >= 0, 'in je vorige Editie, zonder keyAt (terugval): terug')
})
