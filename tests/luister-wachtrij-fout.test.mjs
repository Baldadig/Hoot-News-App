// Luister verder, herstel keuring 4 van branch weekshow: een fout van het model in de eigen functie (oordeelRonde) mag de
// terugval niet laten wegvallen. Zonder sleutel of bij een fout van het model blijft een koppeling via een artikellink van
// de eigen uitgever over (de kop van netlify/lib/luister.mjs). De ronde vraagt zelf niets meer (wachtrij), dus de fout moet
// via de opslag (OORDEEL_KEY, `f`) bij de volgende ronde aankomen. Geen echte AI: tests/helpers/nep-oordeel.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { koppelMetOordeel, oordeelRonde, OORDEEL_KEY, WACHTRIJ_KEY, MAX_POGINGEN, leesOpslag, schrijfOpslag } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, JA, NEE } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const OPTS = { stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS }
const ALLES = { maxAanroepen: Infinity, maxVragen: Infinity }
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const lijst = (r) => r.rows.koppelingen.map((k) => `${k.kop} | ${k.show}: ${k.aflevering}`).sort()
// Zoals in productie: de ronde zet de vragen in de wachtrij (de client wordt dan niet gevraagd).
const ronde = (kv) => koppelMetOordeel({ ...OPTS, ...ALLES, client: nepClient(() => NEE), get: kv.get, update: kv.update, wachtrij: true })

test('fout in de eigen functie, dan de volgende ronde: de artikellink van de eigen uitgever koppelt, zoals zonder sleutel', async () => {
  const zonder = await koppelMetOordeel({ ...OPTS, client: null })
  assert.ok(zonder.byStory.size >= 1, 'de fixture heeft een artikellink van de eigen uitgever')
  const kv = memKv()
  const r0 = await ronde(kv)
  assert.equal(r0.byStory.size, 0, 'de eerste ronde heeft nog geen oordeel')
  const overbelast = nepClient(() => JA, { fout: new Error('500 overloaded') })
  const { stats } = await oordeelRonde({ client: overbelast, get: kv.get, update: kv.update, now: NOW, start: Date.now(), maxAanroepen: Infinity })
  assert.ok(stats.fouten >= 1)
  assert.ok(Object.keys(kv.kv.get(OORDEEL_KEY).f || {}).length >= 1, 'de fouten staan per paar in de opslag')
  const r1 = await ronde(kv)
  assert.deepEqual(lijst(r1), lijst(zonder), 'dezelfde koppelingen als zonder sleutel')
  assert.ok(r1.rows.koppelingen.every((k) => k.grond === 'link' && k.dezelfdeUitgever))
  assert.ok(r1.rows.koppelingen.some((k) => /zonder oordeel \(fout\)/.test(k.reden)))
  assert.ok(!r1.rows.afgevallen.some((a) => /De Redacteur beoordeelt het paar/.test(a.reden) && /fout/.test(a.reden)))
})

test('zes keer fout achter elkaar (zoals de proef): elke ronde de terugval, en na de pogingen een eerlijke reden', async () => {
  const zonder = await koppelMetOordeel({ ...OPTS, client: null })
  const kv = memKv()
  await ronde(kv)
  for (let k = 0; k < 6; k++) {
    await oordeelRonde({ client: nepClient(() => JA, { fout: new Error('overbelast') }), get: kv.get, update: kv.update, now: NOW, start: Date.now(), maxAanroepen: Infinity })
    const r = await ronde(kv)
    assert.deepEqual(lijst(r), lijst(zonder), `ronde ${k + 1}`)
    assert.ok(!r.rows.afgevallen.some((a) => /De Redacteur beoordeelt het paar in zijn eigen ronde/.test(a.reden)), `ronde ${k + 1}: geen belofte die niet komt`)
  }
  // De wachtrij is leeg (alle pogingen op); de paren vallen af met een reden die klopt.
  assert.equal(kv.kv.get(WACHTRIJ_KEY).vragen.length, 0)
  const r = await ronde(kv)
  assert.ok(r.rows.afgevallen.some((a) => /geen oordeel \(fout\): dan alleen een artikellink van de eigen uitgever/.test(a.reden)))
})

test('pogingen op door time-outs (geen fout): geen terugval, wel een eerlijke reden', async () => {
  const kv = memKv()
  await ronde(kv)
  const doc = kv.kv.get(WACHTRIJ_KEY)
  const keys = doc.vragen.flatMap((v) => v.keys)
  // De opslag zoals na MAX_POGINGEN time-outs.
  kv.kv.set(OORDEEL_KEY, { v: 1, o: {}, p: Object.fromEntries(keys.map((k) => [k, [MAX_POGINGEN, NOW]])) })
  const r = await ronde(kv)
  assert.equal(r.byStory.size, 0)
  assert.equal(kv.kv.get(WACHTRIJ_KEY).vragen.length, 0)
  assert.ok(r.rows.afgevallen.some((a) => new RegExp(`in ${MAX_POGINGEN} pogingen niet beoordeeld, het wordt niet meer gevraagd`).test(a.reden)))
  assert.ok(!r.rows.afgevallen.some((a) => /De Redacteur beoordeelt het paar in zijn eigen ronde/.test(a.reden)))
})

test('de opslag van de fouten: de laatste poging telt, een oordeel of een time-out haalt de fout weg', () => {
  const f1 = schrijfOpslag(null, { geprobeerd: ['a', 'b'], fout: new Set(['a', 'b']), now: NOW })
  assert.deepEqual(Object.keys(f1.f).sort(), ['a', 'b'])
  assert.deepEqual([...leesOpslag(f1, NOW).fouten].sort(), ['a', 'b'])
  const f2 = schrijfOpslag(f1, { geprobeerd: ['a'], fout: new Set(), nieuw: new Map([['b', { ...JA, reden: 'x' }]]), now: NOW })
  assert.equal(f2.f, undefined, 'a was een time-out, b kreeg een oordeel')
  assert.equal(leesOpslag(f2, NOW).fouten.size, 0)
})
