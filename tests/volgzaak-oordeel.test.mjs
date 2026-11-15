// Volgen 1.5, bouwplanstap 1.4b: het oordeel bij twijfel, naar het patroon van luister-oordeel. Met de vlag uit of zonder
// sleutel niets; één verhaal per vraag; een eigen plafond van $5 per dag (bovenop de $3 van luister, eigen dagteller);
// hooguit 12 oordelen per volgzaak per dag; de volgorde van de wachtrij (meeste volgers eerst); een time-out telt als
// betaald; ja en nee gaan terug in de treffers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { volgzaakOordeelRonde, oordeelVraag, VOLGZAAK_DAG_USD, MAX_OORDELEN_PER_DAG, PER_VRAAG, VOLGZAAK_OORDEEL_SCHEMA } from '../netlify/lib/volgzaak-oordeel.mjs'
import { OORDEEL_DAG_USD, OORDEEL_KEY, WACHTRIJ_KEY, AANROEP_USD } from '../netlify/lib/luister.mjs'
import { VK, dagNL } from '../netlify/lib/volgzaak-basis.mjs'
import { memIo, nepModel, gooiModel } from './helpers/volgzaak-io.mjs'

const NOW = Date.parse('2026-11-20T10:00:00Z')
const AAN = { HOOT_VOLGZAKEN: 'aan' }
const DAG = dagNL(NOW)
const vraag = (slug, key, volgers = 1) => ({ slug, key, volgers, pubs: 1, laatst: NOW, prompt: `Gevolgd: ${slug}\n\nKoppen van het verhaal:\n- nos: kop ${key}` })
const JA = { reden: 'nep', gaatOver: 'ja', zeker: 'ja' }
const NEE = { reden: 'nep', gaatOver: 'nee', zeker: 'ja' }
const run = (io, opts = {}) => volgzaakOordeelRonde({ get: io.get, update: io.update, now: NOW, start: Date.now(), env: AAN, ...opts })

test('de getallen: een eigen plafond van $5 bovenop de $3 van luister, 12 per volgzaak per dag, één verhaal per vraag', () => {
  assert.equal(VOLGZAAK_DAG_USD, 5)
  assert.equal(OORDEEL_DAG_USD, 3)
  assert.equal(MAX_OORDELEN_PER_DAG, 12)
  assert.equal(PER_VRAAG, 1)
  assert.equal(VK.dagUsd(DAG), 'volgzaak-dag-usd:2026-11-20')
  assert.notEqual(VK.dagUsd(DAG), OORDEEL_KEY, 'een eigen dagteller, niet die van luister')
  assert.deepEqual(VOLGZAAK_OORDEEL_SCHEMA.required, ['reden', 'gaatOver', 'zeker'])
  assert.match(oordeelVraag({ label: 'GTA 6', regel: 'De nieuwe GTA', namen: { nl: ['GTA 6'], en: [] }, uit: ['oude delen'] }, [{ bron: 'nos', kop: 'Kop' }]), /Gevolgd: GTA 6\nOmschrijving: De nieuwe GTA\nNamen: GTA 6\nTelt niet mee: oude delen/)
})

test('met de vlag uit of zonder sleutel: geen aanroep en geen lezing', async () => {
  const io = memIo({ [VK.wachtrij]: { v: 1, at: NOW, vragen: [vraag('gta-6', 's1')] } })
  const model = gooiModel()
  for (const env of [{}, { HOOT_VOLGZAKEN: 'uit' }]) {
    const { stats } = await run(io, { client: model, env })
    assert.equal(stats.uit, 'vlag uit')
  }
  assert.equal((await run(io, { client: null })).stats.uit, 'geen sleutel')
  assert.equal(model.calls.length, 0)
  assert.equal(io.log.length, 0)
})

test('ja en nee gaan terug in de treffers, één verhaal per vraag, met de kosten van de dag', async () => {
  const io = memIo({
    [VK.wachtrij]: { v: 1, at: NOW, vragen: [vraag('gta-6', 's1', 3), vraag('gta-6', 's2', 3)] },
    [VK.treffers('gta-6')]: { v: 1, s: { s1: ['t', 1, NOW, NOW, 'K', 'nos', 'u', null], s2: ['t', 1, NOW, NOW, 'K', 'nos', 'u', null] } },
  })
  const model = nepModel((req) => (/kop s1/.test(req.messages[0].content) ? JA : NEE))
  const { stats } = await run(io, { client: model })
  assert.equal(model.calls.length, 2)
  assert.ok(model.calls.every((c) => c.model === 'claude-sonnet-5-5' && c.output_config.effort === 'low' && (c.messages[0].content.match(/Koppen van het verhaal/g) || []).length === 1))
  assert.equal(stats.ja, 1)
  assert.equal(stats.nee, 1)
  const tr = io.kv.get(VK.treffers('gta-6')).s
  assert.equal(tr.s1[0], 'j')
  assert.equal(tr.s2[0], 'n')
  assert.equal(io.kv.get(VK.oordeel('gta-6')).o.s1[0], 'j')
  const dag = io.kv.get(VK.dagUsd(DAG))
  assert.equal(dag.per['gta-6'], 2)
  assert.ok(dag.usd > 0)
  // De opslag van luister is niet aangeraakt.
  assert.ok(!io.log.some(([, k]) => k === OORDEEL_KEY || k === WACHTRIJ_KEY))
  // Nog eens: al beoordeeld, dus niets meer gevraagd.
  const m2 = gooiModel()
  await run(io, { client: m2 })
  assert.equal(m2.calls.length, 0)
})

test('het plafond: niet meer vragen dan er vandaag past; is het op, dan niets', async () => {
  const vragen = Array.from({ length: 10 }, (_, i) => vraag('gta-6', `s${i}`))
  const io = memIo({ [VK.wachtrij]: { v: 1, at: NOW, vragen }, [VK.dagUsd(DAG)]: { dag: DAG, usd: VOLGZAAK_DAG_USD - 3 * AANROEP_USD, per: {} } })
  const model = nepModel(() => JA, { usage: { input_tokens: 0, output_tokens: 0 } })
  const { stats } = await run(io, { client: model })
  assert.equal(model.calls.length, 3)
  assert.equal(stats.plafond, true)
  const io2 = memIo({ [VK.wachtrij]: { v: 1, at: NOW, vragen }, [VK.dagUsd(DAG)]: { dag: DAG, usd: VOLGZAAK_DAG_USD, per: {} } })
  const m2 = gooiModel()
  const r2 = await run(io2, { client: m2 })
  assert.equal(m2.calls.length, 0)
  assert.equal(r2.stats.plafond, true)
  // Een dagteller van gisteren telt niet.
  const io3 = memIo({ [VK.wachtrij]: { v: 1, at: NOW, vragen: vragen.slice(0, 2) }, [VK.dagUsd(DAG)]: { dag: '2026-11-19', usd: 99, per: {} } })
  const m3 = nepModel(() => JA)
  await run(io3, { client: m3 })
  assert.equal(m3.calls.length, 2)
})

test('meeste volgers eerst als het krap wordt, en hooguit 12 per volgzaak per dag', async () => {
  // De wachtrij komt gesorteerd uit de ronde: eerst de populaire volgzaak.
  const vragen = [...Array.from({ length: 5 }, (_, i) => vraag('populair', `p${i}`, 50)), ...Array.from({ length: 5 }, (_, i) => vraag('klein', `k${i}`, 1))]
  const io = memIo({ [VK.wachtrij]: { v: 1, at: NOW, vragen }, [VK.dagUsd(DAG)]: { dag: DAG, usd: VOLGZAAK_DAG_USD - 6 * AANROEP_USD, per: { populair: 10 } } })
  const model = nepModel(() => JA, { usage: { input_tokens: 0, output_tokens: 0 } })
  await run(io, { client: model })
  const gevraagd = model.calls.map((c) => c.messages[0].content.match(/Gevolgd: (\w+)/)[1])
  assert.deepEqual(gevraagd, ['populair', 'populair', 'klein', 'klein', 'klein', 'klein'], 'populair tot de 12 van vandaag, dan de rest binnen het plafond')
  assert.equal(io.kv.get(VK.dagUsd(DAG)).per.populair, 12)
})

test('een time-out telt als betaald en als poging; na vier pogingen niet meer', async () => {
  const io = memIo({ [VK.wachtrij]: { v: 1, at: NOW, vragen: [vraag('gta-6', 's1')] }, [VK.treffers('gta-6')]: { v: 1, s: { s1: ['t', 1, NOW, NOW] } } })
  const model = nepModel(() => '__hangt__')
  const { stats } = await run(io, { client: model, vraagMs: 30, minMs: 10 })
  assert.equal(stats.timeouts, 1)
  assert.equal(io.kv.get(VK.dagUsd(DAG)).usd, AANROEP_USD)
  assert.equal(io.kv.get(VK.oordeel('gta-6')).p.s1[0], 1)
  assert.equal(io.kv.get(VK.treffers('gta-6')).s.s1[0], 't', 'geen oordeel: twijfel blijft twijfel')
  io.kv.set(VK.oordeel('gta-6'), { v: 1, o: {}, p: { s1: [4, NOW] } })
  const m2 = gooiModel()
  await run(io, { client: m2 })
  assert.equal(m2.calls.length, 0)
})

test('een wachtrij van een ronde die te oud is, telt niet', async () => {
  const io = memIo({ [VK.wachtrij]: { v: 1, at: NOW - 31 * 6e4, vragen: [vraag('gta-6', 's1')] } })
  const m = gooiModel()
  const { stats } = await run(io, { client: m })
  assert.equal(stats.inWachtrij, 0)
  assert.equal(m.calls.length, 0)
})
