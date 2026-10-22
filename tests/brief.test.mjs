import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBrief, briefRows, parseBrief, briefSections, numbersSupported, BRIEF_MODEL } from '../netlify/lib/brief.mjs'

const fake = (reply) => ({ messages: { create: async (req) => { fake.last = req; return reply } } })

// Nep-client: eerst het overzicht, dan de controle (per zin de bronregels).
const pair = (text, zinnen) => {
  const replies = [
    { model: BRIEF_MODEL, stop_reason: 'end_turn', content: [{ type: 'text', text }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ zinnen }) }] },
  ]
  const calls = []
  return { calls, messages: { create: async (req) => (calls.push(req), replies.shift()) } }
}

test('het overzicht gaat alleen over wat in de editie staat en komt terug met tijd, model en verwijzingen', async () => {
  const client = pair('## Nobelprijs\nPillay krijgt de Nobelprijs.\n\n## Den Haag\nIn Den Haag wordt vergaderd.', [{ zin: 1, bronnen: [1] }, { zin: 2, bronnen: [2] }])
  const rows = [{ entry: 0, sourceName: 'NOS', title: 'Pillay wint Nobelprijs', summary: 'De Zuid-Afrikaanse rechter.' }, { entry: 3, sourceName: 'NRC', title: 'Vergadering in Den Haag', summary: 'In Den Haag wordt vergaderd.' }]
  const b = await createBrief(client, rows, { now: 0 })
  assert.deepEqual(b.sections.map((s) => s.head), ['Nobelprijs', 'Den Haag'])
  assert.equal(b.sections[0].text, 'Pillay krijgt de Nobelprijs.')
  assert.deepEqual(b.sections.map((s) => s.refs), [[0], [3]]) // naar de plek in de editie
  assert.equal(b.model, BRIEF_MODEL)
  assert.equal(b.at, '1970-01-01T00:00:00.000Z')
  assert.match(client.calls[0].messages[0].content, /\[NOS\] Pillay wint Nobelprijs — De Zuid-Afrikaanse rechter\./)
  assert.equal(client.calls[0].model, BRIEF_MODEL)
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

test('lukt de controle niet, dan geen overzicht (veilig terugvallen; later opnieuw)', async () => {
  const replies = [{ stop_reason: 'end_turn', content: [{ type: 'text', text: '## Kop\nEen zin.' }] }]
  const client = { messages: { create: async () => { if (!replies.length) throw new Error('overbelast'); return replies.shift() } } }
  assert.equal(await createBrief(client, [{ sourceName: 'NOS', title: 'Een zin' }], { now: 0 }), null)
})

// Regressie: fouten uit de audit van 22-10 (v1.25.0).
test('Meta: "eigenaar van" mag geen "eigent zich toe" worden; de controle schrapt zo\'n zin', async () => {
  const rows = [{ entry: 4, sourceName: 'de Volkskrant', title: 'Meta krijgt boete van 25 miljard dollar voor misleiding van Facebook-gebruikers', summary: 'Meta, eigenaar van Facebook, WhatsApp en Instagram, moet 25 miljard dollar betalen.' }]
  const client = pair('## Meta\nMeta krijgt een boete van 25 miljard dollar. Het bedrijf eigent zich Facebook, WhatsApp en Instagram toe.', [{ zin: 1, bronnen: [1] }, { zin: 2, bronnen: [] }])
  const b = await createBrief(client, rows, { now: 0 })
  assert.deepEqual(b.sections[0].text, 'Meta krijgt een boete van 25 miljard dollar.')
  // De controle krijgt de regel over eigendom en toeschrijving mee.
  assert.match(client.calls[1].system, /eigenaar van/)
  assert.match(client.calls[0].system, /eigendom/)
})

test('een veranderd bedrag valt eruit, ook als de controle de zin goedkeurt', async () => {
  const rows = [{ entry: 0, sourceName: 'NOS', title: 'Meta krijgt boete van 25 miljard dollar', summary: '' }]
  const client = pair('## Meta\nMeta krijgt een boete van 30 miljard dollar.', [{ zin: 1, bronnen: [1] }])
  assert.equal(await createBrief(client, rows, { now: 0 }), null)
  assert.equal(numbersSupported('In 2026 kostte het 1,6 miljoen.', 'kosten 1,6 miljoen in 2026'), true)
  assert.equal(numbersSupported('Het kostte 2 miljoen.', 'kosten 1,6 miljoen'), false)
})

test('Kyiv: een kop zonder intro is gemarkeerd; afleiden mag niet, letterlijk citeren wel', async () => {
  const rows = [{ entry: 1, sourceName: 'Al Jazeera', title: 'Russian strikes hit Kyiv after Witkoff meets Putin', summary: '' }]
  const client = pair('## Oekraïne\n"Russian strikes hit Kyiv after Witkoff meets Putin," meldt Al Jazeera. Witkoff gaf Rusland toestemming voor de aanval.', [{ zin: 1, bronnen: [1] }, { zin: 2, bronnen: [] }])
  const b = await createBrief(client, rows, { now: 0 })
  assert.equal(b.sections[0].text, '"Russian strikes hit Kyiv after Witkoff meets Putin," meldt Al Jazeera.')
  assert.match(client.calls[0].messages[0].content, /Putin \[alleen kop\]$/)
  assert.match(client.calls[0].system, /\[alleen kop\]/)
})
