import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBrief, briefRows, BRIEF_MODEL } from '../netlify/lib/brief.mjs'

const fake = (reply) => ({ messages: { create: async (req) => { fake.last = req; return reply } } })

test('het overzicht gaat alleen over wat in de editie staat en komt terug met tijd en model', async () => {
  const client = fake({ model: BRIEF_MODEL, stop_reason: 'end_turn', content: [{ type: 'text', text: 'Pillay krijgt de Nobelprijs.\n\nIn Den Haag …' }] })
  const rows = [{ sourceName: 'NOS', title: 'Pillay wint Nobelprijs', summary: 'De Zuid-Afrikaanse rechter.' }]
  const b = await createBrief(client, rows, { now: 0 })
  assert.equal(b.text.startsWith('Pillay'), true)
  assert.equal(b.model, BRIEF_MODEL)
  assert.equal(b.at, '1970-01-01T00:00:00.000Z')
  assert.match(fake.last.messages[0].content, /\[NOS\] Pillay wint Nobelprijs — De Zuid-Afrikaanse rechter\./)
  assert.equal(fake.last.model, BRIEF_MODEL)
})

test('geen verhalen of een weigering geeft geen overzicht', async () => {
  assert.equal(await createBrief(fake({}), []), null)
  assert.equal(await createBrief(fake({ stop_reason: 'refusal', content: [] }), [{ sourceName: 'x', title: 'y' }]), null)
})

test('rijen volgen de editie: het gekozen hoofdbericht per verhaal, anders het losse bericht', () => {
  const items = new Map([['a', { sourceName: 'NOS', title: 'A', summary: 'a' }], ['b', { sourceName: 'NYT', title: 'B' }], ['c', { sourceName: 'NRC', title: 'C' }]])
  const stories = new Map([['s1', { id: 's1', leadId: 'b', itemIds: ['a', 'b'] }]])
  const rows = briefRows([{ kind: 'story', id: 's1', leadId: 'a' }, { kind: 'item', id: 'c' }], stories, items)
  assert.deepEqual(rows.map((r) => r.title), ['A', 'C'])
})
