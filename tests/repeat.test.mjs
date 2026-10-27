import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectEdition, previousSlotId, previousOf, repeatPenalty, REPEAT_PENALTY, DEVELOPING_PENALTY } from '../netlify/lib/stories.mjs'
import { composePersonal } from '../src/lib/personal.js'

const NOW = Date.parse('2026-10-26T16:30:00Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
const art = (id, source, title, h, extra = {}) => ({ id, kind: 'article', source, sourceName: source, title, summary: title + '.', publishedAt: at(h), ...extra })
// Een groot verhaal (veel bronnen) en een kleiner verhaal van nu.
const big = Array.from({ length: 12 }, (_, i) => art('b' + i, 'src' + i, 'Lula wint verkiezingen in Brazilië', 8 + i * 0.1))
const small = Array.from({ length: 4 }, (_, i) => art('s' + i, 'srcs' + i, 'Kabinet presenteert plan voor woningbouw', 1 + i * 0.1))
const stories = [
  { id: 'st-big', itemIds: big.map((i) => i.id), sourceCount: 12, ownCount: 1, latestAt: big[0].publishedAt },
  { id: 'st-small', itemIds: small.map((i) => i.id), sourceCount: 4, ownCount: 1, latestAt: small[0].publishedAt },
]
const pool = [...big, ...small]
const main = new Set([...pool.map((i) => i.source)])

test('zonder vorige editie wint het grote verhaal', () => {
  const e = selectEdition(stories, pool, { mainIds: main, now: NOW })
  assert.equal(e[0].id, 'st-big')
})

test('een verhaal uit de vorige editie zonder nieuws zakt achter het verhaal van nu', () => {
  const previous = { storyIds: new Set(['st-big']), itemIds: new Set(big.map((i) => i.id)), leadIds: new Set(['b0']), leadStoryId: 'st-big', at: NOW - 6 * 36e5 }
  const e = selectEdition(stories, pool, { mainIds: main, now: NOW, previous })
  assert.equal(e[0].id, 'st-small')
  assert.ok(e.some((x) => x.id === 'st-big'), 'het mag er nog wel in, lager')
})

test('een verhaal dat zich echt ontwikkelt krijgt een kleinere straf', () => {
  const previous = { storyIds: new Set(['st-big']), itemIds: new Set(big.slice(0, 6).map((i) => i.id)), leadIds: new Set(), at: Date.parse(big[11].publishedAt) + 1 }
  // Zes van de twaalf berichten kwamen er na de vorige editie bij.
  const items = big.map((i, n) => (n < 6 ? i : { ...i, publishedAt: at(1) }))
  assert.equal(repeatPenalty(stories[0], items, previous), DEVELOPING_PENALTY)
  assert.equal(repeatPenalty(stories[0], big, { ...previous, itemIds: new Set(big.map((i) => i.id)) }), REPEAT_PENALTY)
})

test('een los bericht uit de vorige editie komt niet terug', () => {
  const solo = art('solo', 'nrc', 'Rudi Fuchs overleden', 2, { image: 'https://x/y.jpg' })
  const e1 = selectEdition([], [solo], { mainIds: new Set(['nrc']), now: NOW })
  assert.equal(e1.length, 1)
  const e2 = selectEdition([], [solo], { mainIds: new Set(['nrc']), now: NOW, previous: { itemIds: new Set(['solo']), at: NOW - 36e5 } })
  assert.equal(e2.length, 0)
})

test('vorige dagdeel: avond → middag → ochtend → gisteravond', () => {
  assert.equal(previousSlotId({ id: '2026-10-26-avond', slot: 'avond', date: '2026-10-26' }), '2026-10-26-middag')
  assert.equal(previousSlotId({ id: '2026-10-26-middag', slot: 'middag', date: '2026-10-26' }), '2026-10-26-ochtend')
  assert.equal(previousSlotId({ id: '2026-11-01-ochtend', slot: 'ochtend', date: '2026-11-01' }), '2026-10-31-avond')
})

test('previousOf leest verhalen, berichten en het hoofdverhaal uit een editie', () => {
  const p = previousOf({ builtAt: at(6), entries: [{ kind: 'story', id: 'st-big', leadId: 'b0', itemIds: ['b0', 'b1'] }, { kind: 'item', id: 'solo' }] })
  assert.ok(p.storyIds.has('st-big') && p.itemIds.has('b1') && p.itemIds.has('solo'))
  assert.equal(p.leadStoryId, 'st-big')
})

test('Buiten je bubbel gaat niet over iets wat al in je eigen editie staat', () => {
  // Jouw editie: Servië (Nederlands); de bubbel van de server: een Engels liveblog over Servië.
  const serbia = Array.from({ length: 3 }, (_, i) => art('rs' + i, ['nos', 'volkskrant', 'nrc'][i], 'Serviërs vieren verkiezingswinst Studentenlijst, Vučić erkent nederlaag', 2 + i * 0.2, { summary: 'Oud-president Aleksandar Vučić erkent zijn nederlaag bij de verkiezingen in Servië.' }))
  const live = art('gl', 'guardian', 'Serbia wakes up to new reality after student-led movement ousts Vučić – Europe live', 1, { summary: 'Aleksandar Vučić concedes defeat in the Serbian election.' })
  const other = art('ot', 'guardian', 'Heatwave grips southern Spain as wildfires spread near Valencia', 1, { summary: 'Firefighters battle blazes near Valencia.' })
  const st = [{ id: 'st-rs', itemIds: serbia.map((i) => i.id), sourceCount: 3, ownCount: 3, latestAt: serbia[0].publishedAt }]
  const global = { id: 'e', entries: [{ kind: 'story', id: 'st-rs', leadId: 'rs0', desk: 'buitenland' }, { kind: 'item', id: 'gl', desk: 'bubbel', terms: [] }], items: [...serbia, live, other], bubble: [{ id: 'ot', terms: [] }] }
  const mine = composePersonal({ global, stories: st, items: [...serbia, live, other], sources: ['nos', 'volkskrant', 'nrc'].map((id) => ({ id, cat: 'nl' })), followed: new Set(['nos', 'volkskrant', 'nrc']), now: NOW })
  const bubble = mine.entries.find((e) => e.desk === 'bubbel')
  assert.equal(bubble?.id, 'ot')
})

test('één verkiezingsdag krijgt één plek, ook zonder gedeelde bundel', async () => {
  const { signatures, sameSubject } = await import('../netlify/lib/stories.mjs')
  const a = art('il1', 'nyt', 'Israel’s High-Stakes Election: What to Know', 2, { summary: 'Israelis vote on Tuesday as Benjamin Netanyahu seeks another term.' })
  const b = art('il2', 'volkskrant', 'Netanyahu waarschuwt dat Arabisch-Israëlische kiezers de verkiezingen beslissen', 2, { summary: 'Premier Netanyahu riep zijn achterban op naar de stembus te gaan.' })
  const c = art('us1', 'nyt', 'Election Officials Fear Trump Administration’s Interference', 2, { summary: 'State officials worry about federal pressure before the midterms.' })
  const sig = signatures([a, b, c])
  assert.equal(sameSubject(sig.get('il1'), sig.get('il2')), true)
  assert.equal(sameSubject(sig.get('il1'), sig.get('us1')), false)
})
