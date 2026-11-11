// Web en iPhone tonen exact dezelfde Editie (besluit Alex, 9 november 2026: "Altijd gelijk"): één opgenomen
// antwoord van POST /api/edition v2 (tests/fixtures/edition-server-golden.json, scripts/make-server-golden.mjs).
// Het web moet dat antwoord letterlijk opslaan (`hoot:my-edition`) en tonen; de iPhone doet hetzelfde in
// ios/HootTests/EditionServerTests.swift (edition.json). Zelfde account en dagdeel: één antwoord, twee gelijke opslagen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { serverFirst, serverRequest, SERVER_KEY } from '../src/lib/editionSync.js'
import { recordServerGolden } from '../scripts/make-server-golden.mjs'

const golden = JSON.parse(readFileSync(new URL('./fixtures/edition-server-golden.json', import.meta.url), 'utf8'))
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v))

// localStorage zoals in de browser (src/lib/store.js schrijft JSON.stringify, leest JSON.parse).
globalThis.localStorage = (() => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
})()
const { readJSON, writeJSON } = await import('../src/lib/store.js')

test('het opgenomen antwoord: een lid, door de server vastgelegd, met afdruk en revisie', () => {
  const e = golden.response.edition
  assert.equal(golden.status, 200)
  assert.equal(golden.response.source, 'claimed')
  assert.equal(e.owner, golden.uid)
  assert.equal(e.id, golden.global.id)
  assert.equal(e.server, true)
  assert.ok(e.basis && e.revision && Array.isArray(e.entries) && e.entries.length === 10)
})

test('web: het antwoord van de server wordt letterlijk bewaard en getoond', async () => {
  const global = { ...golden.global, entries: [] }
  const e = golden.response.edition
  const r = await serverFirst({ global, owner: golden.uid, basis: e.basis, request: serverRequest(golden.request), ask: async () => ({ status: 200, edition: golden.response.edition }) })
  assert.equal(r.source, 'server')
  assert.equal(r.keep, true)
  // Zoals keep() in usePersonalEdition: bewaren onder hoot:my-edition, en weten dat hij van de server is.
  writeJSON('hoot:my-edition', r.edition)
  writeJSON(SERVER_KEY, `${global.id}|${golden.uid}|${e.basis}`)
  assert.equal(canon(readJSON('hoot:my-edition', null)), canon(golden.response.edition), 'opslag = antwoord')
  assert.equal(localStorage.getItem('hoot:my-edition'), JSON.stringify(golden.response.edition), 'zelfs de volgorde van de velden')
  // Bij de volgende keer openen: dezelfde Editie, zonder nieuwe vraag.
  const again = await serverFirst({ global, owner: golden.uid, basis: e.basis, local: readJSON('hoot:my-edition', null), localFromServer: true, ask: async () => assert.fail('niet opnieuw') })
  assert.equal(canon(again.edition), canon(golden.response.edition))
})

test('de server geeft voor deze vraag nog steeds dit antwoord (anders: bewust opnieuw maken)', async () => {
  const now = await recordServerGolden()
  assert.equal(canon(now.request), canon(golden.request))
  assert.equal(canon(now.response), canon(golden.response))
})
