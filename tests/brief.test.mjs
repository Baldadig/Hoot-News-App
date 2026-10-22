import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBrief, briefRows, parseBrief, briefSections, BRIEF_MODEL } from '../netlify/lib/brief.mjs'

const fake = (reply) => ({ messages: { create: async (req) => { fake.last = req; return reply } } })

test('het overzicht gaat alleen over wat in de editie staat en komt terug met tijd en model', async () => {
  const client = fake({ model: BRIEF_MODEL, stop_reason: 'end_turn', content: [{ type: 'text', text: '## Nobelprijs\nPillay krijgt de Nobelprijs.\n\n## Den Haag\nIn Den Haag …' }] })
  const rows = [{ sourceName: 'NOS', title: 'Pillay wint Nobelprijs', summary: 'De Zuid-Afrikaanse rechter.' }]
  const b = await createBrief(client, rows, { now: 0 })
  assert.deepEqual(b.sections.map((s) => s.head), ['Nobelprijs', 'Den Haag'])
  assert.equal(b.sections[0].text, 'Pillay krijgt de Nobelprijs.')
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

test('het overzicht komt in blokken met een tussenkop', () => {
  const s = parseBrief('## Tesla en SpaceX\nMusk onderzoekt een fusie.\nDe commissies zijn er.\n\n## Oekraïne:\nWitkoff reist af.')
  assert.deepEqual(s, [
    { head: 'Tesla en SpaceX', text: 'Musk onderzoekt een fusie. De commissies zijn er.' },
    { head: 'Oekraïne', text: 'Witkoff reist af.' },
  ])
})

test('een oud overzicht zonder koppen blijft leesbaar: één blok per alinea', () => {
  assert.deepEqual(briefSections({ text: 'Een.\n\nTwee.' }), [{ head: null, text: 'Een.' }, { head: null, text: 'Twee.' }])
  assert.deepEqual(briefSections(null), [])
  assert.deepEqual(parseBrief('## Kop\n\nAlinea.'), [{ head: 'Kop', text: 'Alinea.' }])
})

test('controle: een zin die in geen bronregel staat, gaat eruit', async () => {
  const replies = [
    { stop_reason: 'end_turn', content: [{ type: 'text', text: '## Meta\nMeta krijgt een boete van de EU. Het bedrijf eigent zich Facebook, WhatsApp en Instagram toe.\n\n## Oekraïne\nWitkoff boekt weinig succes bij Poetin.' }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ zinnen: [{ zin: 1, bronnen: [1] }, { zin: 2, bronnen: [] }, { zin: 3, bronnen: [2] }] }) }] },
  ]
  const calls = []
  const client = { messages: { create: async (req) => (calls.push(req), replies.shift()) } }
  const rows = [{ sourceName: 'NOS', title: 'EU geeft Meta een boete' }, { sourceName: 'de Volkskrant', title: 'Witkoff boekt weinig succes bij Poetin' }]
  const b = await createBrief(client, rows, { now: 0 })
  assert.equal(b.checked, true)
  assert.deepEqual(b.sections.map((s) => s.text), ['Meta krijgt een boete van de EU.', 'Witkoff boekt weinig succes bij Poetin.'])
  assert.equal(calls[1].output_config.format.type, 'json_schema')
  assert.match(calls[1].messages[0].content, /2\. Het bedrijf eigent zich/)
  assert.equal(calls[0].temperature, undefined) // Haiku 5.5 weigert afwijkende sampling
})

test('lukt de controle niet, dan blijft het overzicht staan', async () => {
  const replies = [{ stop_reason: 'end_turn', content: [{ type: 'text', text: '## Kop\nEen zin.' }] }]
  const client = { messages: { create: async () => { if (!replies.length) throw new Error('overbelast'); return replies.shift() } } }
  const b = await createBrief(client, [{ sourceName: 'NOS', title: 'Een zin' }], { now: 0 })
  assert.equal(b.checked, false)
  assert.equal(b.sections[0].text, 'Een zin.')
})
