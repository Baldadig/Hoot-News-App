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
