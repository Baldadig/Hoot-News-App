import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as G from '../shared/editor.mjs'
import { INTERESTS } from '../src/lib/topics.js'

const SOURCES = [{ id: 'carbon', cat: 'wetenschap' }, { id: 'nos', cat: 'nl' }, { id: 'verge', cat: 'tech' }]
const prof = (o = {}) => G.profileOf({ sources: SOURCES, ...o })
const TECH = INTERESTS.find((f) => f.id === 'tech').topics

// ---------- §11.1 Profiel ----------

test('profiel: volledige lijst onderwerpen is geërfd (0,6), scherp kiezen geeft 1 en laat de rest weg', () => {
  const all = prof({ interests: ['tech'], topics: TECH })
  assert.equal(all.topicP.games, G.W_INHERITED)
  assert.equal(all.topicP.ai, 0.6)
  assert.equal(all.family.tech, 0.6)
  const none = prof({ interests: ['tech'], topics: [] }) // niets gekozen: ook geërfd
  assert.equal(none.topicP.games, 0.6)
  const sharp = prof({ interests: ['tech'], topics: ['ai'] })
  assert.equal(sharp.topicP.ai, 1)
  assert.equal(sharp.topicP.games, undefined)
  assert.equal(sharp.origin.ai, 'gekozen')
  assert.equal(sharp.family.tech, 1)
})

test('profiel: onderwerpen uit een gebied dat je niet koos tellen niet mee', () => {
  const p = prof({ interests: ['tech'], topics: ['ai', 'klimaat'] })
  assert.equal(p.topicP.klimaat, undefined)
  assert.equal(p.family.wetenschap, undefined)
})

test('profiel: de lift — lezen telt als je vaker leest dan je bronnen erover schrijven, nooit zwaarder dan 0,8', () => {
  const affinity = { n: 30, topics: { klimaat: 10, voetbal: 1 }, sources: { x: 11 } }
  const p = prof({ affinity, supply: { klimaat: 0.05, voetbal: 0.3 } })
  assert.ok(Math.abs(p.topicP.klimaat - 0.8) < 0.011, `klimaat ${p.topicP.klimaat}`)
  assert.equal(p.topicP.voetbal, undefined) // lift < 1: L = 0
  assert.equal(p.origin.klimaat, 'geleerd')
  assert.equal(p.family.wetenschap, p.topicP.klimaat)
  // Hoe vaak je ook leest: nooit zwaarder dan zelf kiezen.
  const veel = prof({ affinity: { n: 500, topics: { klimaat: 400 }, sources: { x: 400 } }, supply: {} })
  assert.ok(veel.topicP.klimaat <= G.W_READ)
  // Zelf gekozen wint van gelezen.
  const beide = prof({ interests: ['wetenschap'], topics: ['klimaat'], affinity, supply: { klimaat: 0.05 } })
  assert.equal(beide.topicP.klimaat, 1)
  assert.equal(beide.origin.klimaat, 'gekozen')
})

test('profiel: bij n = 5 leert het profiel niets', () => {
  const p = prof({ affinity: { n: 5, topics: { klimaat: 10 }, sources: { x: 10 } }, supply: { klimaat: 0.05 } })
  assert.deepEqual(p.topicP, {})
  assert.deepEqual(p.sourceP, {})
  assert.deepEqual(p.shareOf, {})
})

test('profiel: lezen precies volgens het aanbod (a = A·supply) geeft L ≈ 0', () => {
  const p = prof({ affinity: { n: 40, topics: { 'vs-politiek': 6 }, sources: { nos: 20 } }, supply: { 'vs-politiek': 0.3 } })
  assert.equal(p.topicP['vs-politiek'], undefined)
  assert.equal(p.shareOf['vs-politiek'], 1) // wel een groot deel van je lezen (voor "buiten je profiel")
})

test('profiel: ingroeien — onder de 30 handelingen telt lezen naar rato', () => {
  const affinity = { n: 15, topics: { klimaat: 10 }, sources: { x: 11 } }
  const p = prof({ affinity, supply: { klimaat: 0.05 } })
  assert.equal(p.topicP.klimaat, 0.4) // 0,8 × 1 × 15/30
})

test('profiel: minder hiervan maakt een onderwerp negatief, gedrag nooit', () => {
  const p = prof({ taste: { topics: { voetbal: -12 }, sources: {} } })
  assert.equal(p.topicP.voetbal, -0.75)
  assert.equal(p.family.sport, undefined)
  // Gelezen met een lage lift is 0, nooit negatief.
  const q = prof({ affinity: { n: 30, topics: { voetbal: 1 }, sources: { x: 30 } }, supply: { voetbal: 0.9 } })
  assert.ok(!Object.values(q.topicP).some((v) => v < 0))
  // Meer hiervan telt op bij een keuze, tot 1.
  const r = prof({ interests: ['sport'], topics: [], taste: { topics: { voetbal: 4 }, sources: {} } })
  assert.equal(r.topicP.voetbal, 0.85)
  assert.equal(prof({ interests: ['sport'], topics: ['voetbal'], taste: { topics: { voetbal: 12 } } }).topicP.voetbal, 1)
})

test('profiel: bronnen die je veel leest, als aandeel (een vijfde telt vol)', () => {
  const p = prof({ affinity: { n: 30, topics: {}, sources: { nos: 10, carbon: 2, verge: 38 } } })
  assert.equal(p.sourceP.verge, 1)
  assert.equal(p.sourceP.carbon, 0.2)
  assert.equal(p.sourceP.nos, 1)
})

test('aanbod: aandeel artikelen uit je eigen bronnen per onderwerp', () => {
  const items = [
    { id: 'a', kind: 'article', source: 'nos', topics: ['klimaat'] },
    { id: 'b', kind: 'article', source: 'nos', topics: ['klimaat', 'europa'] },
    { id: 'c', kind: 'article', source: 'nos', topics: [] },
    { id: 'd', kind: 'article', source: 'nos' },
    { id: 'e', kind: 'post', source: 'nos', topics: ['klimaat'] },
    { id: 'f', kind: 'article', source: 'nrc', topics: ['klimaat'] },
  ]
  const s = G.supplyOf(items, new Set(['nos']))
  assert.deepEqual(s, { klimaat: 0.5, europa: 0.25 })
  assert.deepEqual(G.supplyOf([], new Set(['nos'])), {})
  assert.equal(G.supplyOf(items).klimaat, 0.6) // zonder filter: alle artikelen
})

test('profiel: deterministisch en zonder verboden rekenwerk', () => {
  const o = { interests: ['tech', 'wetenschap'], topics: ['ai'], affinity: { n: 22, topics: { klimaat: 4.3, ai: 2.1 }, sources: { nos: 6.4 } }, taste: { topics: { games: -4 } }, supply: { klimaat: 0.04, ai: 0.1 } }
  assert.deepEqual(prof(o), prof(o))
  const src = readFileSync(new URL('../shared/editor.mjs', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')
  for (const bad of ['Math.log', 'Math.pow', 'Math.exp', 'localeCompare', '**']) assert.ok(!src.includes(bad), bad)
})

// ---------- §11.2 Punten, waarom en zaad ----------

const T0 = Date.parse('2026-10-30T10:00:00Z')
const at = (h) => new Date(T0 + h * 36e5).toISOString()
const it = (id, source, topics, extra = {}) => ({ id, kind: 'article', source, topics, publishedAt: at(0), ...extra })

test('punten: minder hiervan is −12 bij p = −0,75', () => {
  const p = prof({ taste: { topics: { voetbal: -12 }, sources: {} } })
  const parts = G.personalParts([it('a', 'nos', ['voetbal'])], p)
  assert.equal(parts.less.pts, -12)
  assert.equal(parts.less.t, 'voetbal')
  assert.equal(parts.interest, undefined)
})

test('punten: interesse naar sterkte en dekking', () => {
  const p = prof({ interests: ['tech'], topics: ['ai'] })
  assert.equal(G.personalParts([it('a', 'nos', ['ai'])], p).interest.pts, 18)
  // De helft van de eigen berichten raakt: 18 × 1 × 0,75.
  assert.equal(G.personalParts([it('a', 'nos', ['ai']), it('b', 'nos', ['europa'])], p).interest.pts, 14)
  // Geërfd (0,6) en volledig gedekt: 18 × 0,6 = 10,8.
  assert.equal(G.personalParts([it('a', 'nos', ['games'])], prof({ interests: ['tech'] })).interest.pts, 11)
})

test('punten: snijvlak — AI en muziek, met Tech en Cultuur gekozen, raakt beide gebieden', () => {
  const p = prof({ interests: ['tech', 'cultuur'], topics: ['ai', 'muziek'] })
  const parts = G.personalParts([it('a', 'nos', ['ai', 'muziek'])], p)
  assert.equal(parts.interest.pts, G.P.INTEREST)
  assert.equal(parts.cross.pts, G.P.CROSS)
  assert.deepEqual([...parts.cross.f].sort(), ['cultuur', 'tech'])
  assert.equal(G.whyOf({}, { parts }).text, 'Raakt Tech én Cultuur')
  // Twee onderwerpen uit hetzelfde gebied zijn geen snijvlak.
  assert.equal(G.personalParts([it('a', 'nos', ['ai', 'gadgets'])], prof({ interests: ['tech'], topics: ['ai', 'gadgets'] })).cross, undefined)
})

test('punten: een vakbron telt alleen voor berichten zonder onderwerp', () => {
  const p = prof({ interests: ['wetenschap'], topics: ['klimaat'] })
  const zonder = G.personalParts([it('a', 'carbon', [])], p)
  assert.equal(zonder.interest.t, 'bron:wetenschap')
  assert.equal(zonder.interest.pts, 11) // 18 × 0,6 × 1
  assert.equal(G.whyOf({}, { parts: zonder }).code, 'vak')
  assert.equal(G.whyOf({}, { parts: zonder }).text, 'Omdat je Wetenschap volgt')
  assert.equal(G.personalParts([it('b', 'carbon', ['europa'])], p).interest, undefined)
  // Zonder interesse in dat gebied telt de vakbron niet.
  assert.equal(G.personalParts([it('c', 'carbon', [])], prof()).interest, undefined)
})

test('punten: voorkeursbron, veel gelezen bron en meerdere eigen bronnen', () => {
  const p = prof({ favorites: ['verge'], affinity: { n: 30, topics: {}, sources: { verge: 10, nos: 30 } } })
  const parts = G.personalParts([it('a', 'verge', []), it('b', 'nos', []), it('c', 'carbon', [])], p)
  assert.deepEqual(parts.favorite, { pts: 8, source: 'verge' })
  assert.equal(parts.sourceRead.pts, 4) // nos: 5 × 30/40 → 1
  assert.deepEqual(parts.mine, { pts: 6, n: 3 })
  assert.equal(G.personalParts([it('a', 'nos', []), it('b', 'nos', [])], p).mine, undefined) // één bron
  const vijf = ['a', 'b', 'c', 'd', 'e'].map((s) => it(s, s, []))
  assert.equal(G.personalParts(vijf, prof()).mine.pts, 9) // hooguit 3 × 3
})

test('punten: al gelezen zonder nieuws valt af; met twee nieuwe stukken is het een vervolg', () => {
  const p = prof()
  const its = [it('r', 'nos', [], { publishedAt: at(-2) }), it('n1', 'nrc', [], { publishedAt: at(2) }), it('n2', 'nos', [], { publishedAt: at(3) })]
  const readIds = new Set(['r'])
  const seen = G.personalParts(its.slice(0, 2), p, { readIds })
  assert.ok(seen.seen)
  assert.equal(seen.followUp, undefined)
  assert.equal(G.sumParts(seen), G.sumParts({ mine: seen.mine })) // geen punt, een filter
  const fu = G.personalParts(its, p, { readIds })
  assert.deepEqual(fu.followUp, { pts: 10, n: 2 })
  assert.equal(fu.seen, undefined)
  assert.equal(G.whyOf({}, { parts: fu }).text, 'Vervolg op wat je las · 2 nieuwe stukken')
  // Binnen het uur na wat je las telt niet als nieuw.
  const kort = [its[0], it('k1', 'nos', [], { publishedAt: at(-1.5) }), it('k2', 'nos', [], { publishedAt: at(-1.2) })]
  assert.ok(G.personalParts(kort, p, { readIds }).seen)
  // Niets gelezen: geen van beide.
  const niets = G.personalParts(its, p, { readIds: new Set() })
  assert.equal(niets.seen, undefined)
  assert.equal(niets.followUp, undefined)
})

test('waarom: alleen een echte reden; gekozen, geleerd en de rubriek', () => {
  const w = G.whyOf({}, { parts: { interest: { pts: 3, t: 'afrika', f: 'wereld', origin: 'gekozen' } }, sourceCount: 2, desk: 'buitenland' })
  assert.deepEqual(w, { code: 'rubriek', text: 'Rubriek Buitenland' })
  assert.deepEqual(G.whyOf({}, { parts: { interest: { pts: 14, t: 'ai', f: 'tech', origin: 'gekozen' } } }), { code: 'interest', text: 'Omdat je AI volgt' })
  assert.deepEqual(G.whyOf({}, { parts: { interest: { pts: 14, t: 'ai', f: 'tech', origin: 'geleerd' } } }), { code: 'learned', text: 'Omdat je vaak over AI leest' })
  assert.equal(G.whyOf({}, { desk: 'vs', plannedDesk: true }).text, 'Jouw rubriek VS')
  assert.equal(G.whyOf({}, { desk: 'tech', plannedDesk: true }).text, 'Jouw rubriek Tech')
  assert.equal(G.whyOf({}, {}).text, 'Het nieuws van nu')
  assert.deepEqual(G.whyOf({}, { sourceCount: 7, desk: 'binnenland' }), { code: 'rubriek', text: 'Rubriek Binnenland' })
  assert.deepEqual(G.whyOf({}, { sourceCount: 8, desk: 'binnenland' }), { code: 'groot', text: 'Groot nieuws · 8 bronnen' })
  assert.deepEqual(G.whyOf({ front: true, big: true }, { sourceCount: 5 }), { code: 'groot', text: 'Groot nieuws · 5 bronnen' })
})

test('waarom: een geleerd onderwerp uit het profiel geeft "vaak over … leest"', () => {
  const p = prof({ affinity: { n: 30, topics: { ai: 10 }, sources: { nos: 11 } }, supply: { ai: 0.05 } })
  const parts = G.personalParts([it('a', 'nos', ['ai'])], p)
  assert.equal(parts.interest.origin, 'geleerd')
  assert.equal(parts.interest.pts, 14) // 18 × 0,8
  assert.equal(G.whyOf({}, { parts }).text, 'Omdat je vaak over AI leest')
})

test('waarom: het label komt van de treffer die het verhaal het best dekt', () => {
  const p = prof({ interests: ['politiek', 'wereld'], topics: ['vs-politiek', 'middenoosten'], taste: { topics: { middenoosten: -2 } } })
  // vs-politiek (1) in één van drie stukken, Midden-Oosten (0,88) in alle drie.
  const its = [it('a', 'nos', ['vs-politiek', 'middenoosten'], { title: 'Witte Huis stuurt gezant naar Gaza' }), it('b', 'nrc', ['middenoosten']), it('c', 'verge', ['middenoosten'])]
  const parts = G.personalParts(its, p)
  assert.equal(parts.interest.t, 'middenoosten')
  assert.equal(parts.interest.pts, 18) // sterkte van het beste onderwerp, dekking van alles
  // Geen snijvlak: Politiek raakt maar één van de drie stukken (elk gebied moet meer dan de helft raken).
  assert.equal(parts.cross, undefined)
  assert.equal(G.whyOf({}, { parts }).text, 'Omdat je Midden-Oosten volgt')
  const metCross = G.personalParts([its[0], it('d', 'nrc', ['vs-politiek', 'middenoosten'], { title: 'Trump en het Witte Huis over Gaza' }), its[1]], p)
  assert.equal(G.whyOf({}, { parts: metCross }).text, 'Raakt Politiek én Wereld')
})

test('waarom: vaste plekken, voorkeursbron, eigen bronnen en de volgorde bij gelijke stand', () => {
  assert.deepEqual(G.whyOf({ desk: 'extern' }, {}), { code: 'extern', text: 'Buiten je bronnen' })
  assert.deepEqual(G.whyOf({ desk: 'bubbel' }, {}), { code: 'bubbel', text: 'Buiten je bubbel · via Google Trends' })
  assert.deepEqual(G.whyOf({ desk: 'bubbel', near: 'sport' }, {}), { code: 'buur', text: 'Naast je bubbel · grenst aan Sport' })
  assert.deepEqual(G.whyOf({ desk: 'breed' }, { sourceCount: 9 }), { code: 'breed', text: 'Waar iedereen over schrijft · 9 bronnen' })
  assert.deepEqual(G.whyOf({ front: true, desk: 'vs' }, { sourceCount: 12, parts: { interest: { pts: 18, t: 'ai', f: 'tech' } } }), { code: 'groot', text: 'Groot nieuws · 12 bronnen' })
  assert.equal(G.whyOf({}, { parts: { favorite: { pts: 8, source: 'atl' } }, sourceName: () => 'The Atlantic' }).text, 'Uit je voorkeursbron The Atlantic')
  assert.equal(G.whyOf({}, { parts: { mine: { pts: 6, n: 3 } } }).text, '3 van je bronnen schrijven erover')
  assert.equal(G.whyOf({}, { parts: { sourceRead: { pts: 5 } } }).code, 'sourceRead')
  // Gelijke stand (8 en 8): de volgorde van de tabel, interesse gaat voor de voorkeursbron.
  assert.equal(G.whyOf({}, { parts: { favorite: { pts: 8, source: 's' }, interest: { pts: 8, t: 'ai', f: 'tech' } } }).code, 'interest')
  // Huisregels: geen kloktijden in de teksten.
  const texts = [G.whyOf({}, {}).text, G.whyOf({ desk: 'bubbel' }, {}).text]
  for (const t of texts) assert.ok(!/\b(ochtend|middag|avond|\d{1,2}:\d{2})\b/.test(t), t)
})

test('sumParts blijft binnen [−30, 40]', () => {
  assert.equal(G.sumParts({ interest: { pts: 18 }, cross: { pts: 8 }, favorite: { pts: 8 }, mine: { pts: 9 }, followUp: { pts: 10 } }), G.SUM_MAX)
  assert.equal(G.sumParts({ less: { pts: -16 }, x: { pts: -20 } }), G.SUM_MIN)
  assert.equal(G.sumParts({ interest: { pts: 11 }, less: { pts: -4 } }), 7)
  assert.equal(G.sumParts({}), 0)
})

test('zaad: jitter ligt in [0, 1), is stabiel en hangt af van zaad en id', () => {
  const seeds = ['basis|2026-10-30-avond', 'ander|2026-10-30-avond']
  const vals = new Set()
  for (const s of seeds) for (const id of ['a', 'b', 'sxyz', 'verhaal-1234567890']) {
    const j = G.jitter(s, id)
    assert.ok(j >= 0 && j < 1)
    assert.equal(j, G.jitter(s, id))
    vals.add(j)
  }
  assert.ok(vals.size > 4)
  // djb2 met ×33, vastgelegd zodat web en iOS hetzelfde rekenen.
  assert.equal(G.jitter('', ''), (((((5381 * 33) ^ 124) >>> 0) % 1000) / 1000))
})

test('tempo: een uurbron krijgt 14 uur, een bron die elke 30 uur publiceert 72', () => {
  const series = (source, every, n) => Array.from({ length: n }, (_, k) => it(`${source}${k}`, source, [], { publishedAt: at(-k * every) }))
  const w = G.tempoWindows([...series('uur', 1, 20), ...series('traag', 30, 6), ...series('dag', 8, 5), it('los', 'een', [])])
  assert.equal(w.get('uur'), 14)
  assert.equal(w.get('traag'), 72)
  assert.equal(w.get('dag'), 24) // 3 × 8
  assert.equal(w.get('een'), 72) // geen tussentijd: 3 × 24
  // Alleen artikelen met een datum tellen; posts niet.
  assert.equal(G.tempoWindows([it('p', 'x', [], { kind: 'post' }), it('q', 'y', [], { publishedAt: null })]).size, 0)
})

test('buiten je profiel: geen onderwerp ≥ 0,3 en geen gebied ≥ 0,5', () => {
  const koers = prof({ interests: ['sport'], topics: ['wielrennen'] })
  assert.equal(G.outsideProfile(['voetbal'], koers), false) // wielerfan: geen voetbal als bubbel
  assert.equal(G.outsideProfile(['film'], koers), true)
  assert.equal(G.outsideProfile([], koers), true)
  const zwak = prof({ affinity: { n: 30, topics: { film: 3 }, sources: { x: 30 } }, supply: { film: 0.02 } })
  assert.ok(zwak.topicP.film < 0.5 && zwak.topicP.film >= 0.3)
  assert.equal(G.outsideProfile(['film'], zwak), false)
  assert.equal(G.outsideProfile(['muziek'], zwak), true) // gebied cultuur < 0,5
})

test('sterkste gebied en buren: gelijke stand op id, zonder localeCompare', () => {
  assert.equal(G.strongestFamily(prof()), null)
  assert.equal(G.strongestFamily(prof({ interests: ['wetenschap', 'tech'], topics: ['ai'] })), 'tech')
  assert.equal(G.strongestFamily(prof({ interests: ['wetenschap', 'tech'] })), 'tech') // 0,6 en 0,6: tech < wetenschap
  assert.equal(G.strongestFamily({ family: { wereld: 0.6, economie: 0.6, sport: 0.5 } }), 'economie')
  for (const f of INTERESTS) assert.ok(G.NEIGHBOURS[f.id]?.length, f.id)
  for (const ns of Object.values(G.NEIGHBOURS)) for (const n of ns) assert.ok(INTERESTS.some((f) => f.id === n), n)
})

test('voorkeursbron weegt zoveel als FAVORITE_BONUS op de server', async () => {
  const { FAVORITE_BONUS } = await import('../netlify/lib/stories.mjs')
  assert.equal(G.P.FAVORITE, FAVORITE_BONUS)
})

// ---------- §11.3 Indeling ----------

test('indeling: een VS-lezer krijgt als eerste zetel VS, en minstens twee', () => {
  const vs = G.deskPlan(prof({ interests: ['politiek'], topics: ['vs-politiek', 'trump'] }), 7)
  assert.equal(vs.order[0], 'vs')
  assert.ok(vs.order.filter((d) => d === 'vs').length >= 2, vs.order.join(','))
  assert.equal(vs.weights.vs, 3.7) // 0,7 (buitenlandse kernrubriek, Wereld niet gekozen) + 3 × 1
  assert.equal(vs.order.length, 7)
})

test('indeling: een techlezer krijgt hooguit drie Tech-zetels en minstens drie kernrubrieken', () => {
  // Zoals het prototype: gemeten bij 8 en 10 zetels. Bij weinig zetels blijft Tech staan.
  for (const seats of [8, 10]) {
    const tech = G.deskPlan(prof({ interests: ['tech'], topics: ['ai'] }), seats).order
    assert.ok(tech.filter((d) => d === 'tech').length <= G.DESK_CAP, `${seats}: ${tech}`)
    assert.ok(new Set(tech.filter((d) => G.KERN.includes(d))).size >= G.KERN_MIN, `${seats}: ${tech}`)
    assert.equal(tech.length, seats)
  }
  for (const seats of [1, 2, 3, 4, 5, 6]) {
    const tech = G.deskPlan(prof({ interests: ['tech'], topics: ['ai'] }), seats).order
    assert.equal(tech[0], 'tech', `${seats}: ${tech}`)
    assert.equal(tech.length, seats)
  }
})

test('indeling: zonder keuzes precies KERN, de gewone krant', () => {
  assert.deepEqual(G.KERN, ['binnenland', 'buitenland', 'vs', 'middenoosten', 'oekraine', 'wetenschap'])
  assert.deepEqual(G.deskPlan(prof(), 6).order, G.KERN)
  assert.deepEqual(G.deskPlan(prof(), 4).order, G.KERN.slice(0, 4))
  // Geen eigen pagina's zonder keuze (gewicht 0), dus na zes zetels weer van voren af aan.
  assert.deepEqual(G.deskPlan(prof(), 8).order, [...G.KERN, 'binnenland', 'buitenland'])
  assert.deepEqual(G.deskPlan(prof({ taste: { topics: { voetbal: -12 } } }), 6).order, G.KERN) // "minder" telt niet voor de indeling
})

test('indeling: bij gelijke stand de vaste volgorde, eerst KERN en dan de eigen pagina\'s', () => {
  // Tech en Economie allebei 0,6 geërfd: gewicht 2,8 en 2,8. Tech staat eerder in de vaste volgorde.
  const p = prof({ interests: ['tech', 'economie'] })
  const plan = G.deskPlan(p, 8)
  assert.equal(plan.weights.tech, plan.weights.economie)
  assert.deepEqual(plan.order.slice(0, 2), ['tech', 'economie'])
  assert.equal(plan.order[2], 'binnenland') // daarna KERN in vaste volgorde
  assert.deepEqual(G.deskPlan(p, 8), plan) // deterministisch
})

test('indeling: te weinig kernrubrieken? De laatste dubbele zetel ruilt voor de zwaarste die ontbreekt', () => {
  // Tech, Economie en Regio zwaar, Binnenland 4. Zonder ruil bij 6 zetels: binnenland, tech, economie,
  // regio, binnenland, wetenschap (twee kernrubrieken). De dubbele Binnenland ruilt voor Buitenland
  // (0,7: Wereld niet gekozen, de eerste in de vaste volgorde).
  const p = prof({ interests: ['tech', 'economie', 'binnenland'], topics: ['ai', 'energie', 'wonen', 'verkeer'] })
  assert.deepEqual(G.deskPlan(p, 6).order, ['binnenland', 'tech', 'economie', 'regio', 'buitenland', 'wetenschap'])
  for (const seats of [6, 8, 10]) {
    const order = G.deskPlan(p, seats).order
    assert.equal(order.length, seats)
    assert.ok(new Set(order.filter((d) => G.KERN.includes(d))).size >= G.KERN_MIN, `${seats}: ${order}`)
    for (const d of new Set(order)) assert.ok(order.filter((x) => x === d).length <= G.DESK_CAP, `${seats}: ${order}`)
  }
})

test('indeling: een eigen pagina die er één keer staat, ruilt nooit weg (alleen dubbele zetels)', () => {
  // Weinig zetels en geen dubbele zetel: dan haalt de indeling de drie kernrubrieken niet alleen;
  // de voorpagina telt mee voor de harde regel. De lezer houdt zijn eigen pagina's.
  const p = prof({ interests: ['tech', 'economie', 'binnenland'], topics: ['ai', 'energie', 'wonen', 'verkeer'] })
  assert.deepEqual(G.deskPlan(p, 3).order, ['binnenland', 'tech', 'economie'])
  assert.deepEqual(G.deskPlan(p, 4).order, ['binnenland', 'tech', 'economie', 'regio'])
  for (const seats of [4, 5, 6]) {
    const order = G.deskPlan(p, seats).order
    for (const d of G.OWN_DESKS) assert.ok(order.includes(d), `${seats}: ${order}`)
  }
  assert.deepEqual(G.deskPlan(prof({ interests: ['tech'], topics: ['ai'] }), 3).order, ['tech', 'binnenland', 'wetenschap'])
})

test('indeling: de voorpagina telt mee voor de kernregel', () => {
  // Brabant: drie zetels. Heeft de voorpagina al Wetenschap (en twee verhalen zonder rubriek), dan
  // is de zetel Wetenschap dubbel en ruilt hij voor de zwaarste ontbrekende kernrubriek.
  const p = prof({ interests: ['binnenland'], topics: ['misdaad'] })
  assert.deepEqual(G.deskPlan(p, 3).order, ['binnenland', 'regio', 'wetenschap'])
  assert.deepEqual(G.deskPlan(p, 3, ['wetenschap', null, null]).order, ['binnenland', 'regio', 'buitenland'])
  // Heeft de voorpagina al drie kernrubrieken, dan hoeft er niets te ruilen.
  assert.deepEqual(G.deskPlan(p, 3, ['binnenland', 'buitenland', 'vs']).order, ['binnenland', 'regio', 'binnenland'])
  assert.deepEqual(G.deskPlan(prof(), 6, ['vs']).order, G.KERN) // zonder keuzes blijft het KERN
})

// Feedback 31 oktober: de eerste Editie van een nieuwe lezer met Binnenland was half buitenland.
test('indeling: wie interesses koos maar Wereld niet, krijgt de buitenlandse kernrubrieken lichter (0,7)', () => {
  const bi = G.deskPlan(prof({ interests: ['binnenland', 'cultuur', 'wetenschap'] }), 6)
  for (const d of ['buitenland', 'vs', 'middenoosten', 'oekraine']) assert.equal(bi.weights[d], G.KERN_INT_W, d)
  assert.equal(bi.weights.binnenland, 4.6) // 1 + 3 × 0,6 (de thema's) + 3 × 0,6 (Nederland, het land)
  // Binnenland krijgt zijn tweede zetel (4,6 / 3 = 1,53) vóór de eerste buitenlandse (0,7).
  assert.ok(bi.order.indexOf('binnenland', 1) < bi.order.indexOf('buitenland'), bi.order.join(','))
  // Zonder keuzes, of met Wereld, blijft het 1.
  assert.equal(G.deskPlan(prof(), 6).weights.buitenland, 1)
  assert.equal(G.deskPlan(prof({ interests: ['wereld', 'binnenland'] }), 6).weights.vs, 1)
})

test('indeling: Regio alleen als je een regiobron volgt', () => {
  const zonder = G.deskPlan(prof({ interests: ['binnenland'], followed: new Set(['nos', 'nu']) }), 4)
  assert.equal(zonder.weights.regio, 0)
  assert.ok(!zonder.order.includes('regio'), zonder.order.join(','))
  const met = G.deskPlan(prof({ interests: ['binnenland'], followed: new Set(['nos', 'bd']), sources: [...SOURCES, { id: 'bd', cat: 'regio' }] }), 4)
  assert.equal(met.weights.regio, 1.8)
  assert.ok(met.order.includes('regio'), met.order.join(','))
})

test('indeling: een rubriek die al een plek heeft (groot nieuws), telt als toegekende zetel', () => {
  const p = prof({ interests: ['binnenland'], topics: ['misdaad'] })
  assert.deepEqual(G.deskPlan(p, 3).order, ['binnenland', 'regio', 'wetenschap'])
  // Binnenland heeft er al een: de volgende Binnenland-zetel komt pas na Regio (4 / 3 < 4).
  assert.deepEqual(G.deskPlan(p, 3, [], ['binnenland']).order, ['regio', 'binnenland', 'wetenschap'])
})

test('rubriek: een eigen pagina als het verhaal echt over dat gebied gaat, anders de hoofdrubriek', () => {
  const tech = prof({ interests: ['tech'], topics: ['ai'] })
  const none = prof()
  const ai = { id: 'a', source: 'nos', topics: ['ai'] }
  assert.ok(G.servesDesks([ai], 'binnenland', tech).has('tech'))
  assert.ok(G.servesDesks([ai], 'binnenland', none).has('tech')) // kan Tech vullen, ook zonder voorkeur
  assert.equal(G.homeDesk([ai], 'binnenland', tech), 'tech') // sterkte 1
  assert.equal(G.homeDesk([ai], 'binnenland', none), 'binnenland') // sterkte 0: de hoofdrubriek
  // Een vakbron zonder onderwerp, zonder hoofdrubriek: de eigen pagina van die bron.
  const verge = { id: 'v', source: 'verge', topics: [] }
  assert.deepEqual([...G.servesDesks([verge], null, none)], ['tech'])
  assert.equal(G.homeDesk([verge], null, none), 'tech')
  assert.equal(G.homeDesk([verge], 'vs', none), 'vs')
  // Regio alleen via de bron, niet via een binnenland-onderwerp.
  const wonen = { id: 'w', source: 'nos', topics: ['wonen'] }
  assert.ok(!G.servesDesks([wonen], 'binnenland', prof({ interests: ['binnenland'] })).has('regio'))
  // Twee eigen pagina's met gelijke sterkte: de vaste volgorde (Tech vóór Economie).
  const both = prof({ interests: ['tech', 'economie'] })
  assert.equal(G.homeDesk([{ id: 'x', source: 'nos', topics: ['ai', 'bedrijven'] }], 'buitenland', both), 'tech')
  assert.equal(G.homeDesk([{ id: 'x', source: 'nos', topics: ['ai', 'bedrijven'] }], 'buitenland', prof({ interests: ['tech', 'economie'], topics: ['bedrijven'] })), 'economie')
})

// ---------- Binnenland is geografie (feedback 31 oktober) ----------
test('Binnenland: een onderwerp van Binnenland telt niet bij buitenlands nieuws', () => {
  const p = prof({ interests: ['binnenland'] })
  const pools = { source: 'nos', title: 'Pools hof oordeelt over onafhankelijkheid rechters', topics: ['misdaad'] }
  assert.equal(G.personalParts([pools], p).interest, undefined)
  // Ook niet als het NOS-stuk geen land noemt, maar het verhaal vooral buitenlandse bronnen heeft.
  const pike = { source: 'nos', title: 'Christa Pike reageert na mislukte executie', topics: ['misdaad'] }
  assert.equal(G.personalParts([pike], p, {}, { foreign: true }).interest, undefined)
  assert.equal(G.personalParts([pike], p, {}, { desk: 'vs' }).interest, undefined)
  // Een Nederlands misdaadbericht wel.
  const nl = { source: 'nos', title: 'Politie Rotterdam pakt drie verdachten op na schietpartij', topics: ['misdaad'] }
  assert.equal(G.personalParts([nl], p).interest.t, 'misdaad')
  // Een Vlaamse bron koos je zelf: daar telt het onderwerp wel (de Vlaamse lezer).
  assert.equal(G.personalParts([{ source: 'standaard', title: 'Brusselse politie pakt verdachten op', topics: ['misdaad'] }], p).interest.t, 'misdaad')
})

test('Binnenland: wie het koos, krijgt Nederlands nieuws ook zonder trefwoord ("Omdat je Binnenland volgt")', () => {
  const p = prof({ interests: ['binnenland', 'cultuur'] })
  const zeehond = { source: 'nu', title: 'Zeehondencentrum Pieterburen voorlopig gered van faillissement', topics: [] }
  const parts = G.personalParts([zeehond], p)
  assert.equal(parts.interest.t, G.GEO_NL)
  assert.equal(G.whyOf({ desk: 'binnenland' }, { parts }).text, 'Omdat je Binnenland volgt')
  assert.equal(G.personalParts([zeehond], prof({ interests: ['cultuur'] })).interest, undefined) // niet gekozen
  assert.equal(G.personalParts([{ source: 'nyt', title: 'Hurricane hits Florida coast', topics: [] }], p).interest, undefined)
  // Hooguit zo sterk als een geërfde interesse.
  assert.ok(parts.interest.pts <= Math.round(G.P.INTEREST * G.W_INHERITED))
})
