import { test } from 'node:test'
import assert from 'node:assert/strict'
import legacy from '../netlify/edge-functions/legacy-domain.js'
import { movePayload, encodeMove, decodeMove, applyMove } from '../src/lib/domain-migration.js'
const storage = (initial = {}) => { const data = new Map(Object.entries(initial)); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) } }
test('verhuizen: voorkeuren en Bewaard mee, inlogtokens en uitnodigingen blijven achter', async () => {
  const old = storage({ 'hoot:prefs': '{"layout":"krant"}', 'hoot:saved-v2': '{"a":{"title":"Kop"}}', 'hoot:google-token': 'geheim', 'hoot:invite': 'geheim', 'sb-auth-token': 'geheim' })
  const payload = await decodeMove(await encodeMove(movePayload(old, '#/stroom?rubriek=cultuur')))
  assert.deepEqual(Object.keys(payload.values), ['hoot:prefs', 'hoot:saved-v2'])
  const target = storage(); applyMove(target, payload, 'https://hootnews.nl')
  assert.equal(target.getItem('hoot:prefs'), '{"layout":"krant"}')
  assert.equal(old.getItem('hoot:saved-v2'), target.getItem('hoot:saved-v2'))
  assert.equal(payload.route, '#/stroom?rubriek=cultuur')
})
test('verhuizen: bestaande nieuwe instellingen winnen; onbekende herkomst en velden worden geweigerd', () => {
  const target = storage({ 'hoot:prefs': '{"layout":"tijdlijn"}' })
  const payload = { version: 1, values: { 'hoot:prefs': '{"layout":"krant"}' } }
  applyMove(target, payload, 'https://hootnews.nl')
  assert.equal(target.getItem('hoot:prefs'), '{"layout":"tijdlijn"}')
  assert.throws(() => applyMove(target, payload, 'https://anders.nl'))
  assert.throws(() => applyMove(target, { version: 1, values: { 'hoot:google-token': '"token"' } }, 'https://hootnews.nl'))
})
test('verhuizen: accountgegevens gaan via synchronisatie; volle opslag rolt een gedeeltelijke verhuizing terug', () => {
  assert.deepEqual(Object.keys(movePayload(storage({ 'hoot:synced-user': 'x', 'hoot:prefs': '{}', 'hoot:read': '["a"]' })).values), ['hoot:prefs'])
  const target = storage(); const set = target.setItem
  target.setItem = (k,v) => { if(k === 'hoot:read') throw new Error('vol'); set(k,v) }
  assert.throws(() => applyMove(target, { version: 1, values: { 'hoot:prefs': '{}', 'hoot:read': '[]' } }, 'https://hootnews.nl'))
  assert.equal(target.getItem('hoot:prefs'), null)
})
test('domein: oude API en nieuwe origin passeren; oude HTML verhuist en oude deel-URL verwijst door', async () => {
  assert.equal(legacy(new Request('https://hootnews.nl/api/edition', { method: 'POST' })), undefined)
  assert.equal(legacy(new Request('https://gethoot.app/lees/')), undefined)
  const html = legacy(new Request('https://hootnews.nl/'))
  assert.equal(html.status, 200); assert.equal(html.headers.get('referrer-policy'), 'origin')
  assert.ok((await html.text()).includes('/lees/move-out.js'))
  const card = legacy(new Request('https://hootnews.nl/deel/a'))
  assert.equal(card.status, 301); assert.equal(card.headers.get('location'), 'https://gethoot.app/deel/a')
})

test('verhuizen: echt opgeslagen thema en nieuwe accounteigenaar worden gerespecteerd', async () => {
  const payload = await decodeMove(await encodeMove(movePayload(storage({ 'hoot:theme': 'dark', 'hoot:owner': 'account-a', 'hoot:prefs': '{"topics":["politiek"],"palette":"inkt"}', 'hoot:read': '["a"]' }))))
  assert.equal(payload.values['hoot:theme'], 'dark')
  assert.deepEqual(JSON.parse(payload.values['hoot:prefs']), { palette: 'inkt', onboarded: true })
  assert.equal(payload.values['hoot:read'], undefined)
  const target = storage({ 'hoot:owner': 'account-b' })
  applyMove(target, payload, 'https://hootnews.nl')
  assert.equal(target.getItem('hoot:prefs'), null)
})
