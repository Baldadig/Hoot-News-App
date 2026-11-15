// Volgen 1.5, bouwplanstap 1.3: POST /api/volgzaak. Alleen POST; met de vlag uit 404 zonder model of KV; proef alleen met
// de telsleutel; acties met kosten alleen voor leden; quotum met teruggave bij een fout; de aliastabel raakt geen model;
// Bedoel je, hele rubriek en weigeren; volgers nooit onder nul; geen slug of opdracht in de log; geen account-id in een
// sleutel met een slug en geen slug in een sleutel met een account-id.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handle, DUIDEN_PER_DAG, UIT_TEKST, GEEN_TEKST } from '../netlify/lib/volgzaak.mjs'
import { memIo, nepModel, gooiModel, GOED } from './helpers/volgzaak-io.mjs'

const NOW = Date.parse('2026-11-20T10:00:00Z')
const UID = 'user-7f3a'
const AAN = { HOOT_VOLGZAKEN: 'aan' }
const lid = async (token) => (token === 'goed' ? UID : null)
const req = (body, { method = 'POST', token = 'goed', headers = {} } = {}) => new Request('https://gethoot.app/api/volgzaak', { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) })
const stille = () => {
  const regels = []
  return { regels, log: (...a) => regels.push(a.join(' ')), error: (...a) => regels.push(a.join(' ')) }
}
const doe = (io, body, { env = AAN, anthropic = null, log = stille(), ...o } = {}) => handle(req(body, o), { anthropic, member: lid, now: NOW, env, io, log })

// Een voorraad met een paar stukken over GTA 6 (twee uitgevers: zeker).
function metVoorraad(io) {
  const t = NOW - 2 * 36e5
  io.arch.set('volgzaak-voorraad:2026-11-20', { meta: { v: 1, dag: '2026-11-20' }, stukken: { a1: [t, 'nos', 'Releasedatum GTA 6 bekend', 'https://nos.nl/a1', 's1', 'nl', 0, 0], a2: [t + 1, 'tweakers', 'Rockstar noemt datum voor GTA 6', 'https://tweakers.net/a2', 's1', 'nl', 0, 0], a3: [t, 'nu', 'Kabinet valt', 'https://nu.nl/a3', 's2', 'nl', 0, 0] }, verhalen: { s1: { f: [], d: 'cultuur', n: 2, lead: 'a1' } } })
  return io
}

test('alleen POST', async () => {
  const r = await handle(req(null, { method: 'GET' }), { member: lid, now: NOW, env: AAN, io: memIo() })
  assert.equal(r.status, 405)
  assert.equal(r.headers.get('allow'), 'POST')
})

test('met de vlag uit: 404 "Nog niet beschikbaar.", zonder model, zonder KV, zonder lid', async () => {
  for (const env of [{}, { HOOT_VOLGZAKEN: 'uit' }, { HOOT_VOLGZAKEN: 'ja' }]) {
    const io = memIo()
    const model = gooiModel()
    let gevraagd = false
    const r = await handle(req({ actie: 'duiden', opdracht: 'gta 6' }), { anthropic: model, member: async () => ((gevraagd = true), UID), now: NOW, env, io })
    assert.equal(r.status, 404)
    assert.equal((await r.json()).error, UIT_TEKST)
    assert.equal(io.log.length, 0)
    assert.equal(model.calls.length, 0)
    assert.equal(gevraagd, false)
  }
  // De functie maakt met de vlag uit geen client.
  assert.match(readFileSync(new URL('../netlify/functions/volgzaak.mjs', import.meta.url), 'utf8'), /volgzakenStand\(\) !== 'uit' \? new Anthropic/)
})

test('proef: alleen met de juiste telsleutel; zonder sleutel in Netlify nooit', async () => {
  const env = { HOOT_VOLGZAKEN: 'proef', TEL_SLEUTEL: 'geheim-voor-toets' }
  const io = memIo()
  assert.equal((await doe(io, { actie: 'overzicht', slugs: [] }, { env })).status, 404)
  assert.equal((await doe(io, { actie: 'overzicht', slugs: [] }, { env, headers: { 'x-tel-sleutel': 'fout' } })).status, 404)
  assert.equal((await doe(io, { actie: 'overzicht', slugs: [] }, { env, headers: { 'x-tel-sleutel': 'geheim-voor-toets' } })).status, 200)
  assert.equal((await doe(io, { actie: 'overzicht', slugs: [] }, { env: { HOOT_VOLGZAKEN: 'proef' }, headers: { 'x-tel-sleutel': '' } })).status, 404)
})

test('acties met kosten of tellers alleen voor leden; lezen kan zonder account', async () => {
  const io = memIo()
  for (const actie of [{ actie: 'duiden', opdracht: 'gta 6' }, { actie: 'volgen', slug: 'gta-6' }, { actie: 'ontvolgen', slug: 'gta-6' }, { actie: 'bijsturen', slug: 'gta-6', scherper: 'pc' }]) {
    const r = await doe(io, actie, { token: 'fout' })
    assert.equal(r.status, 401, actie.actie)
    assert.equal((await r.json()).error, 'Alleen met een account.')
  }
  assert.equal((await doe(io, { actie: 'overzicht', slugs: ['gta-6'] }, { token: null })).status, 200)
  assert.equal((await doe(io, { actie: 'pagina', slug: 'gta-6' }, { token: null })).status, 404)
  assert.equal((await doe(io, { actie: 'iets' })).status, 400)
  assert.equal((await doe(io, '{kapot')).status, 400)
  assert.equal((await doe(io, { actie: 'duiden', opdracht: 'x'.repeat(5000) })).status, 413)
})

test('duiden: een nieuwe volgzaak met def, alias, index, "Er speelde al" en treffers per bron', async () => {
  const io = metVoorraad(memIo())
  const model = nepModel(() => GOED)
  const r = await doe(io, { actie: 'duiden', opdracht: 'De release van GTA 6, zonder geruchten' }, { anthropic: model })
  assert.equal(r.status, 200)
  const b = await r.json()
  assert.equal(b.soort, 'volgzaak')
  assert.deepEqual(b.volgzaak, { slug: 'gta-6', label: 'GTA 6', regel: 'De nieuwe Grand Theft Auto van Rockstar', soort: 'product', mijlpaal: 'de release', rubriek: 'cultuur', loopt: true })
  assert.equal(b.eerder.length, 1)
  assert.equal(b.eerder[0].verhaal, 's1')
  assert.equal(typeof b.eerder[0].betaald, 'boolean', 'met betaald: het toestel kiest per lezer (erSpeeldeAl), nooit een betaalmuur van buiten')
  assert.deepEqual(b.bronnen, { nos: 1, tweakers: 1 })
  assert.equal(model.calls.length, 1)
  const call = model.calls[0]
  assert.equal(call.model, 'claude-sonnet-5-5')
  assert.equal(call.output_config.format.type, 'json_schema')
  assert.match(call.messages[0].content, /Releasedatum GTA 6 bekend/, 'actuele koppen uit de voorraad als gegevens')
  assert.equal(io.kv.get('volgzaak-def:gta-6').status, 'actief')
  assert.equal(io.kv.get('volgzaak-lijst-v1')['gta-6'].volgers, 0)
  assert.equal(io.kv.get(`volgzaak-quota-${UID}-2026-11-20`), 1)
  // Dezelfde opdracht nog eens (ook anders geschreven): uit de aliastabel, geen model, geen quotum.
  const r2 = await doe(io, { actie: 'duiden', opdracht: 'de release van gta-6 zonder geruchten!' }, { anthropic: gooiModel() })
  assert.equal((await r2.json()).volgzaak.slug, 'gta-6')
  assert.equal(io.kv.get(`volgzaak-quota-${UID}-2026-11-20`), 1)
})

test('Bedoel je, hele rubriek en weigeren (privépersoon, geen nieuws); de tweede keer gratis', async () => {
  const keuzes = [{ naam: 'Tata Steel', regel: 'De staalfabriek in IJmuiden', opdracht: 'tata steel ijmuiden' }, { naam: 'Tata Motors', regel: 'De autofabrikant', opdracht: 'tata motors' }]
  const io = memIo()
  const b1 = await (await doe(io, { actie: 'duiden', opdracht: 'tata' }, { anthropic: nepModel(() => ({ ...GOED, uitkomst: 'bedoel', keuzes })) })).json()
  assert.deepEqual(b1, { soort: 'bedoel', keuzes })
  const b2 = await (await doe(io, { actie: 'duiden', opdracht: 'games' }, { anthropic: nepModel(() => ({ ...GOED, uitkomst: 'rubriek', rubriek: 'cultuur', binnen: [{ naam: 'GTA 6', regel: 'De nieuwe GTA', opdracht: 'gta 6' }] })) })).json()
  assert.deepEqual(b2, { soort: 'rubriek', rubriek: 'cultuur', binnen: [{ naam: 'GTA 6', regel: 'De nieuwe GTA', opdracht: 'gta 6' }] })
  const prive = nepModel(() => ({ ...GOED, uitkomst: 'geen' }))
  const b3 = await (await doe(io, { actie: 'duiden', opdracht: 'mijn buurman Henk de Vries' }, { anthropic: prive })).json()
  assert.deepEqual(b3, { soort: 'geen', tekst: GEEN_TEKST })
  assert.ok(![...io.kv.keys()].some((k) => k.startsWith('volgzaak-def:')), 'een geweigerde opdracht krijgt geen def en komt nooit in de feed')
  // De tweede keer: uit de aliastabel, zonder model.
  for (const o of ['tata', 'games', 'mijn buurman Henk de Vries']) {
    const m = gooiModel()
    const r = await doe(io, { actie: 'duiden', opdracht: o }, { anthropic: m })
    assert.equal(r.status, 200, o)
    assert.equal(m.calls.length, 0, o)
  }
})

test('een duiding die de controle niet haalt: geen Volg-knop, niets bewaard, quotum terug', async () => {
  const io = memIo()
  const r = await doe(io, { actie: 'duiden', opdracht: 'gta 6' }, { anthropic: nepModel(() => ({ ...GOED, regel: 'Release om 18:00 — groot onderwerp' })) })
  assert.deepEqual(await r.json(), { soort: 'geen', tekst: GEEN_TEKST })
  assert.ok(![...io.kv.keys()].some((k) => k.startsWith('volgzaak-def:') || k.startsWith('volgzaak-alias:')))
  assert.equal(io.kv.get(`volgzaak-quota-${UID}-2026-11-20`), 0)
  assert.equal(io.kv.get('volgzaak-quota-all-2026-11-20'), 0)
})

test('quotum: vijf per lid per dag (429), een storing van het model geeft beide tellers terug, een vol plafond voor iedereen ook', async () => {
  const io = memIo()
  let k = 0
  const model = nepModel(() => ({ ...GOED, naam: `Ding ${++k}`, namen_nl: [`Ding ${k}`] }))
  for (let i = 0; i < DUIDEN_PER_DAG; i++) assert.equal((await doe(io, { actie: 'duiden', opdracht: `ding nummer ${i}` }, { anthropic: model })).status, 200)
  const r = await doe(io, { actie: 'duiden', opdracht: 'nog eentje' }, { anthropic: model })
  assert.equal(r.status, 429)
  // Storing: beide tellers terug.
  const io2 = memIo()
  const kapot = nepModel(() => { throw new Error('storing') })
  assert.equal((await doe(io2, { actie: 'duiden', opdracht: 'gta 6' }, { anthropic: kapot })).status, 502)
  assert.equal(io2.kv.get(`volgzaak-quota-${UID}-2026-11-20`), 0)
  assert.equal(io2.kv.get('volgzaak-quota-all-2026-11-20'), 0)
  // Het plafond voor iedereen vol: je eigen telling terug.
  const io3 = memIo({ 'volgzaak-quota-all-2026-11-20': 300 })
  const r3 = await doe(io3, { actie: 'duiden', opdracht: 'gta 6' }, { anthropic: gooiModel() })
  assert.equal(r3.status, 429)
  assert.equal(io3.kv.get(`volgzaak-quota-${UID}-2026-11-20`), 0)
})

test('volgen en ontvolgen: een anonieme teller die nooit onder nul gaat, met een eerste momentopname uit de voorraad', async () => {
  const io = metVoorraad(memIo())
  await doe(io, { actie: 'duiden', opdracht: 'gta 6' }, { anthropic: nepModel(() => GOED) })
  assert.equal((await doe(io, { actie: 'volgen', slug: 'gta-6' })).status, 200)
  assert.equal(io.kv.get('volgzaak-volgers:gta-6'), 1)
  assert.equal(io.kv.get('volgzaak-lijst-v1')['gta-6'].volgers, 1)
  const stand = io.kv.get('volgzaak-stand:gta-6:2026-11-20-ochtend')
  assert.equal(stand.verhalen.length, 1)
  assert.equal(stand.verhalen[0].verhaal, 's1')
  for (let i = 0; i < 3; i++) await doe(io, { actie: 'ontvolgen', slug: 'gta-6' })
  assert.equal(io.kv.get('volgzaak-volgers:gta-6'), 0)
  assert.equal(io.kv.get('volgzaak-lijst-v1')['gta-6'].volgers, 0)
  assert.equal((await doe(io, { actie: 'volgen', slug: 'bestaat-niet' })).status, 404)
  assert.equal((await doe(io, { actie: 'volgen', slug: '../x' })).status, 400)
  // De pagina leest de momentopname, ook zonder account.
  const p = await (await doe(io, { actie: 'pagina', slug: 'gta-6' }, { token: null })).json()
  assert.equal(p.volgzaak.label, 'GTA 6')
  assert.equal(p.stand.verhalen[0].kop, 'Rockstar noemt datum voor GTA 6')
  const o = await (await doe(io, { actie: 'overzicht', slugs: ['gta-6', 'iets-anders'] }, { token: null })).json()
  assert.deepEqual(o.overzicht, { 'gta-6': { laatstNieuw: null, status: 'actief' }, 'iets-anders': null })
})

test('volgen, ontvolgen en bijsturen samen hooguit twintig keer per lid per dag', async () => {
  const io = memIo({ 'volgzaak-def:gta-6': { slug: 'gta-6', label: 'GTA 6', status: 'actief' }, 'volgzaak-treffers:gta-6': { v: 1, s: {} } })
  for (let i = 0; i < 20; i++) assert.equal((await doe(io, { actie: i % 2 ? 'ontvolgen' : 'volgen', slug: 'gta-6' })).status, 200)
  assert.equal((await doe(io, { actie: 'volgen', slug: 'gta-6' })).status, 429)
})

test('bijsturen: dezelfde volgzaak verandert niets; een andere verschuift de volgers en de oude opdracht blijft naar de oude wijzen', async () => {
  const io = metVoorraad(memIo())
  await doe(io, { actie: 'duiden', opdracht: 'gta 6' }, { anthropic: nepModel(() => GOED) })
  await doe(io, { actie: 'volgen', slug: 'gta-6' })
  const zelfde = await (await doe(io, { actie: 'bijsturen', slug: 'gta-6', scherper: 'zonder geruchten' }, { anthropic: nepModel(() => GOED) })).json()
  assert.equal(zelfde.soort, 'zelfde')
  const pc = { ...GOED, naam: 'GTA 6 op pc', regel: 'Alleen de pc-versie van GTA 6', namen_nl: ['GTA 6 pc'], namen_en: [] }
  const ander = await (await doe(io, { actie: 'bijsturen', slug: 'gta-6', scherper: 'alleen de pc-versie' }, { anthropic: nepModel(() => pc) })).json()
  assert.equal(ander.van, 'gta-6')
  assert.equal(ander.naar, 'gta-6-op-pc')
  assert.equal(io.kv.get('volgzaak-volgers:gta-6'), 0)
  assert.equal(io.kv.get('volgzaak-volgers:gta-6-op-pc'), 1)
  const opnieuw = await (await doe(io, { actie: 'duiden', opdracht: 'gta 6' }, { anthropic: gooiModel() })).json()
  assert.equal(opnieuw.volgzaak.slug, 'gta-6')
})

test('privacy: geen slug of opdracht in de log; een sleutel met een account-id bevat nooit een slug en omgekeerd', async () => {
  const io = metVoorraad(memIo())
  const log = stille()
  const opdracht = 'De release van GTA 6, zonder geruchten'
  await doe(io, { actie: 'duiden', opdracht }, { anthropic: nepModel(() => GOED), log })
  await doe(io, { actie: 'volgen', slug: 'gta-6' }, { log })
  await doe(io, { actie: 'bijsturen', slug: 'gta-6', scherper: 'zonder geruchten' }, { anthropic: nepModel(() => GOED), log })
  await doe(io, { actie: 'ontvolgen', slug: 'gta-6' }, { log })
  await doe(io, { actie: 'duiden', opdracht: 'kapot' }, { anthropic: nepModel(() => { throw new Error('gta-6 storing') }), log })
  const alles = log.regels.join('\n')
  assert.ok(log.regels.length > 0)
  for (const geheim of ['gta-6', 'GTA 6', 'gta 6', opdracht, 'geruchten', 'kapot', UID]) assert.ok(!alles.toLowerCase().includes(geheim.toLowerCase()), geheim)
  const sleutels = io.sleutels()
  assert.ok(sleutels.some((k) => k.includes(UID)))
  for (const k of sleutels) {
    if (k.includes(UID)) assert.doesNotMatch(k, /gta/, `sleutel met account-id bevat een slug: ${k}`)
    if (k.includes('gta')) assert.ok(!k.includes(UID), `sleutel met slug bevat een account-id: ${k}`)
  }
  // En geen account-id in een document met een slug.
  for (const [k, v] of io.kv) if (k.includes('gta') || JSON.stringify(v).includes('gta-6')) assert.ok(!JSON.stringify(v).includes(UID), k)
})
