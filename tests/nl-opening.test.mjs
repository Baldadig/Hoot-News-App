// Regel V3 (13 november 2026, KABINET.md in Hoot-design/redacteur-herhaling): volg je minstens drie Nederlandse
// nieuwsbronnen (categorie `nl`) en koos je geen Binnenland, dan opent je persoonlijke Editie met het Nederlandse
// voorpaginaverhaal. Alleen als het al op de voorpagina staat (genoeg uitgevers of groot nieuws, niet gezakt), een
// verhaal is (geen los stuk) en een interesse van je raakt. Geen terugval, geen vrijgehouden plek.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectForReader, nlOpener, NL_OPEN_MIN } from '../netlify/lib/stories.mjs'
import * as G from '../shared/editor.mjs'

const NOW = Date.parse('2026-11-12T07:00:00Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
const SOURCES = [{ id: 'nos', cat: 'nl' }, { id: 'nrc', cat: 'nl' }, { id: 'vk', cat: 'nl' }, { id: 'verge', cat: 'tech' }, { id: 'wired', cat: 'tech' }, { id: 'bbc', cat: 'int' }, { id: 'nyt', cat: 'int' }]
const DRIE = new Set(['nos', 'nrc', 'vk', 'verge', 'wired', 'bbc', 'nyt'])
const TWEE = new Set(['nos', 'nrc', 'verge', 'wired', 'bbc', 'nyt'])
const TP = { interests: ['politiek', 'tech'] }
let n = 0
const art = (source, title, o = {}) => ({ id: `i${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(2), topics: [], ...o })
const story = (id, items, count, o = {}) => ({ id, itemIds: items.map((i) => i.id), sourceCount: count, ownCount: 0, latestAt: items[0].publishedAt, desk: null, ...o })

// Een groot buitenlands techverhaal (zwaarder) en een Nederlands politiek verhaal dat al op de voorpagina staat.
function world({ kabCount = 7, kabTopics = ['nederland'] } = {}) {
  n = 0
  const chip = [art('verge', 'Nvidia chief Huang resigns after board inquiry', { topics: ['tech', 'bedrijven'] }), art('wired', 'Nvidia CEO Jensen Huang steps down', { topics: ['tech'] }), art('nyt', 'Nvidia chief executive Jensen Huang resigns', { topics: ['tech'] }), art('bbc', 'Nvidia boss Huang quits amid inquiry', { topics: ['tech'] })]
  const kab = [art('nos', 'Belastingplan splijt kabinet-Jetten, VVD dreigt met breuk', { topics: kabTopics }), art('nrc', 'Kabinet-Jetten verdeeld over belastingplan, VVD twijfelt', { topics: kabTopics }), art('vk', 'VVD zet kabinet-Jetten onder druk om belastingplan', { topics: kabTopics })]
  const ai = [art('verge', 'Anthropic unveils Claude model for spreadsheets', { topics: ['ai'] }), art('wired', 'Claude learns spreadsheets in new Anthropic release', { topics: ['ai'] })]
  const stories = [story('s-chip', chip, 20, { desk: 'buitenland' }), story('s-kab', kab, kabCount, { desk: 'binnenland', nlCount: kabCount }), story('s-ai', ai, 3)]
  return { stories, pool: [...chip, ...kab, ...ai] }
}
const prof = (o = {}, followed = DRIE) => G.profileOf({ sources: SOURCES, followed, ...o })
const run = (w, p = prof(TP), opts = {}) => selectForReader(w.stories, w.pool, { mainIds: p.followed, now: NOW, size: 6, prof: p, seed: 'zaad', ...opts })

test('nl-opening: de telling van Nederlandse nieuwsbronnen', () => {
  assert.equal(NL_OPEN_MIN, 3)
  assert.equal(nlOpener(prof(TP)), true)
  assert.equal(nlOpener(prof(TP, TWEE)), false)
  assert.equal(nlOpener(prof({ interests: ['binnenland', 'tech'] })), false)
  assert.equal(nlOpener(prof(TP), true), false) // de algemene Editie nooit
})

test('nl-opening: zonder de regel opent het zwaardere buitenlandse verhaal (uitgangspunt)', () => {
  assert.equal(run(world(), prof(TP, TWEE))[0].id, 's-chip')
})

test('nl-opening: drie Nederlandse bronnen, een interesse en op de voorpagina: het Nederlandse verhaal opent', () => {
  const sel = run(world())
  assert.equal(sel[0].id, 's-kab', sel.map((e) => e.id).join())
  assert.ok(sel[0].front && sel[0].kind === 'story')
  assert.equal(sel[1].id, 's-chip') // het grote verhaal blijft, alleen een plek lager
})

test('nl-opening: niet bij twee Nederlandse bronnen', () => {
  assert.equal(run(world(), prof(TP, TWEE))[0].id, 's-chip')
})

test('nl-opening: wie Binnenland koos, houdt de bestaande regel (ook onder FRONT_MIN, met terugval)', () => {
  const p = prof({ interests: ['binnenland', 'politiek', 'tech'] })
  assert.equal(nlOpener(p), false)
  assert.equal(run(world(), p)[0].id, 's-kab')
  assert.equal(run(world({ kabCount: 4 }), p)[0].id, 's-kab') // terugval: het zwaarste Nederlandse verhaal
})

test('nl-opening: niet zonder voorpagina (onder FRONT_MIN, geen groot nieuws): geen terugval', () => {
  const sel = run(world({ kabCount: G.FRONT_MIN - 2 }))
  assert.equal(sel[0].id, 's-chip', sel.map((e) => e.id).join())
  assert.ok(sel.some((e) => e.id === 's-kab' && !e.front)) // het verhaal staat er wel, alleen niet bovenaan
})

test('nl-opening: niet zonder interesse', () => {
  const sel = run(world({ kabTopics: [] }))
  assert.equal(sel[0].id, 's-chip', sel.map((e) => e.id).join())
  assert.ok(sel.some((e) => e.id === 's-kab' && e.front && !e.parts.interest)) // op de voorpagina, zonder interesse
})

test('nl-opening: niet voor een los stuk (zonder verhaal), ook niet als het een interesse raakt', () => {
  const w = world()
  w.stories = w.stories.filter((s) => s.id !== 's-kab') // de Nederlandse stukken staan los in de pool
  const sel = run(w)
  assert.equal(sel[0].id, 's-chip', sel.map((e) => e.id).join())
  assert.ok(!sel.some((e) => e.kind === 'item' && e.front))
})

test('nl-opening: niet voor een gezakt verhaal (in je vorige Editie, geen nieuw feit)', async () => {
  const { previousOf } = await import('../netlify/lib/stories.mjs')
  // Groot (HOLD_PUBS uitgevers of meer): dan blijft het één Editie langer, gezakt, in plaats van te verdwijnen.
  const w = world({ kabCount: 12 })
  const kab = w.stories.find((s) => s.id === 's-kab')
  kab.publisherCount = 12
  const old = [...kab.itemIds]
  // Na de vorige Editie kwam er een stuk bij, maar zonder nieuw feit: het verhaal zakt één keer.
  const extra = art('nos', 'Wat staat er op het spel bij het belastingplan van kabinet-Jetten?', { topics: ['nederland'], publishedAt: at(0.5) })
  w.pool.push(extra)
  kab.itemIds.push(extra.id)
  kab.latestAt = extra.publishedAt
  const vorige = { id: '2026-11-11-avond', builtAt: new Date(NOW - 36e5).toISOString(), entries: [{ kind: 'story', id: 's-kab', leadId: old[0], desk: 'binnenland', itemIds: old, title: w.pool.find((i) => i.id === old[0]).title }] }
  const sel = run(w, prof(TP), { previous: previousOf(vorige) })
  const e = sel.find((x) => x.id === 's-kab')
  assert.ok(e && e.held && !e.front, sel.map((x) => `${x.id}:${!!x.held}`).join())
  assert.equal(sel[0].id, 's-chip', sel.map((x) => x.id).join())
})
