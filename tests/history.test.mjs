// De Edities van toen, zoals usePersonalEdition.js ze bij elkaar legt (aanvulling-pariteit-herhaling.md
// H3, H5): wat op dit toestel ligt plus wat in je account staat, ontdubbeld, de laatste drie; en de
// `history` die elke vastgelegde Editie meekrijgt.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { earlierEditions } from '../src/lib/personal.js'
import { historyOf, previousOf, HISTORY_MAX } from '../netlify/lib/stories.mjs'

const T0 = Date.parse('2026-10-29T16:00:00Z')
const at = (h) => new Date(T0 + h * 36e5).toISOString()
// Een vastgelegde Editie met één plek, en de history van wat ervóór kwam.
const ed = (id, h, owner = 'u1', history = []) => ({ id, builtAt: at(h), owner, basis: 'b', entries: [{ kind: 'story', id: 'st-' + id, leadId: 'i-' + id, itemIds: ['i-' + id, 'j-' + id], title: 'Kop ' + id }], history })
const gisteravond = ed('2026-10-29-avond', 0)
const ochtend = ed('2026-10-30-ochtend', 13, 'u1', [historyOf(gisteravond)])
const middag = ed('2026-10-30-middag', 19, 'u1', [historyOf(ochtend), historyOf(gisteravond)])
const ids = (list) => list.map((e) => e.id)

test('earlierEditions: hetzelfde toestel — de laatste lokale Editie met haar history, nieuwste eerst', () => {
  const out = earlierEditions({ local: middag, account: null, id: '2026-10-30-avond', owner: 'u1' })
  assert.deepEqual(ids(out), ['2026-10-30-middag', '2026-10-30-ochtend', '2026-10-29-avond'])
  assert.equal(out[0], middag, 'de Editie zelf, niet haar samenvatting')
  assert.ok(out.length <= HISTORY_MAX)
  // Zonder iets van toen: leeg, en previousOf daarvan is null.
  assert.deepEqual(earlierEditions({ local: null, account: null, id: 'x', owner: 'u1' }), [])
  assert.equal(previousOf(earlierEditions({})), null)
})

test('earlierEditions: de Editie van dit dagdeel telt niet mee, haar history wel', () => {
  // Opnieuw samenstellen voor hetzelfde dagdeel (andere basis): de Middag zelf is geen "toen".
  const out = earlierEditions({ local: middag, account: null, id: '2026-10-30-middag', owner: 'u1' })
  assert.deepEqual(ids(out), ['2026-10-30-ochtend', '2026-10-29-avond'])
})

test('earlierEditions: wat lokaal van een andere lezer is, telt niet; de rij uit het account altijd', () => {
  const anon = ed('2026-10-30-middag', 19, 'anon', [historyOf(ochtend)])
  assert.deepEqual(earlierEditions({ local: anon, account: null, id: '2026-10-30-avond', owner: 'u1' }), [])
  // Het account kent geen owner-toets: de rij is van deze lezer.
  const theirs = { ...middag, owner: undefined }
  assert.deepEqual(ids(earlierEditions({ local: anon, account: theirs, id: '2026-10-30-avond', owner: 'u1' })), ['2026-10-30-middag', '2026-10-30-ochtend', '2026-10-29-avond'])
})

test('earlierEditions: ander toestel — lokaal de Ochtend, in het account de Middag van het andere toestel: samen, ontdubbeld', () => {
  // Dit toestel sloeg de Middag over; het andere toestel legde haar vast (met de Ochtend als history).
  const out = earlierEditions({ local: ochtend, account: middag, id: '2026-10-30-avond', owner: 'u1' })
  assert.deepEqual(ids(out), ['2026-10-30-middag', '2026-10-30-ochtend', '2026-10-29-avond'])
  assert.equal(out[1], ochtend, 'bij een dubbele id wint wat lokaal ligt (de volledige Editie)')
  // Andersom (lokaal de Middag, in het account nog de Ochtend): dezelfde drie.
  assert.deepEqual(ids(earlierEditions({ local: middag, account: ochtend, id: '2026-10-30-avond', owner: 'u1' })), ['2026-10-30-middag', '2026-10-30-ochtend', '2026-10-29-avond'])
})

test('earlierEditions: hooguit drie, en previous erover kent alle drie', () => {
  const eergisteren = ed('2026-10-28-avond', -24)
  const local = { ...middag, history: [historyOf(ochtend), historyOf(gisteravond), historyOf(eergisteren)] }
  const out = earlierEditions({ local, account: null, id: '2026-10-30-avond', owner: 'u1' })
  assert.deepEqual(ids(out), ['2026-10-30-middag', '2026-10-30-ochtend', '2026-10-29-avond'])
  const p = previousOf(out)
  assert.ok(p.storyIds.has('st-2026-10-30-middag') && p.storyIds.has('st-2026-10-30-ochtend') && p.storyIds.has('st-2026-10-29-avond'))
  assert.ok(!p.storyIds.has('st-2026-10-28-avond'), 'ouder dan drie Edities telt niet meer')
  assert.equal(p.atOf.get('st-2026-10-30-ochtend'), Date.parse(ochtend.builtAt))
  assert.equal(p.at, Date.parse(middag.builtAt))
  // De history voor de nieuwe Editie: platte samenvattingen, in dezelfde volgorde.
  const history = out.map(historyOf)
  assert.deepEqual(ids(history), ids(out))
  assert.ok(history.every((h) => Array.isArray(h.storyIds) && Array.isArray(h.itemIds) && !h.entries))
})
