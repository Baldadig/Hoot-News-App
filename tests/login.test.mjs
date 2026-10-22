import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Een minimale browser: adresbalk, geschiedenis en opslag.
const store = new Map()
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
const url = { pathname: '/', search: '', hash: '' }
Object.defineProperty(globalThis, 'location', { value: url, configurable: true })
globalThis.history = { state: null, replaceState: (_s, _t, next) => { const u = new URL(next, 'https://hoot.test'); url.pathname = u.pathname; url.search = u.search; url.hash = u.hash } }

const { captureGoogleReturn, isAuthReturn } = await import('../src/lib/account.js')

beforeEach(() => {
  store.clear()
  Object.assign(url, { pathname: '/', search: '', hash: '' })
})

test('terug van Google: token bewaard, adresbalk schoon, terug naar waar je was', () => {
  store.set('hoot:google-login', JSON.stringify({ state: 's1', nonce: 'n1', back: '#/bronnen' }))
  url.hash = '#state=s1&id_token=abc.def.ghi&authuser=0'
  captureGoogleReturn()
  assert.equal(url.hash, '#/bronnen')
  assert.deepEqual(JSON.parse(store.get('hoot:google-token')), { token: 'abc.def.ghi', nonce: 'n1' })
  assert.equal(store.has('hoot:google-login'), false)
  assert.equal(isAuthReturn(), true)
})

test('een antwoord dat niet bij ons verzoek hoort, wordt genegeerd', () => {
  store.set('hoot:google-login', JSON.stringify({ state: 's1', nonce: 'n1', back: '#/stroom' }))
  url.hash = '#state=ANDERS&id_token=abc'
  captureGoogleReturn()
  assert.equal(store.has('hoot:google-token'), false)
  assert.equal(url.hash, '#/stroom')
  assert.equal(isAuthReturn(), false)
})

test('geannuleerd bij Google: geen token, terug naar de editie als er niets bewaard was', () => {
  url.hash = '#error=access_denied&state=s1'
  captureGoogleReturn()
  assert.equal(store.has('hoot:google-token'), false)
  assert.equal(url.hash, '#/editie')
})

test('een gewone route blijft staan', () => {
  url.hash = '#/stroom?onderwerp=ai'
  captureGoogleReturn()
  assert.equal(url.hash, '#/stroom?onderwerp=ai')
})
