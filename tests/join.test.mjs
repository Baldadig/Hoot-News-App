import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { shouldAskToJoin, JOIN_AUTO, JOIN_PAUSE } from '../src/lib/join.js'
import { dropInvite } from '../src/lib/account.js'

// `auto: true` = de schakelaar aan; zo testen we de terughoudendheid zelf.
const base = { status: 'out', auto: true, onboarded: true, path: 'editie', scrolled: 1500, now: 10 * JOIN_PAUSE }

test('vanzelf vragen staat aan (1.1.0): terughoudend, na het lezen, hooguit twee keer', () => {
  assert.equal(JOIN_AUTO, true)
  const { auto, ...standaard } = base
  assert.equal(shouldAskToJoin(standaard), true)
  assert.equal(shouldAskToJoin({ ...standaard, scrolled: 300 }), false)
  assert.equal(shouldAskToJoin({ ...standaard, asked: { n: 2, at: 0 } }), false)
  // Met de schakelaar uit vraagt Hoot nooit vanzelf.
  assert.equal(shouldAskToJoin({ ...base, auto: false }), false)
})

test('schakelaar aan: gevraagd als je ingesteld bent en een eind hebt gelezen, voor iedereen', () => {
  assert.equal(shouldAskToJoin(base), true)
  assert.equal(shouldAskToJoin({ ...base, path: 'stroom' }), true)
})

test('niet als je al ingelogd bent, nog niet ingesteld, of nog maar net leest', () => {
  assert.equal(shouldAskToJoin({ ...base, status: 'in' }), false)
  assert.equal(shouldAskToJoin({ ...base, status: 'loading' }), false)
  assert.equal(shouldAskToJoin({ ...base, onboarded: false }), false)
  assert.equal(shouldAskToJoin({ ...base, scrolled: 300 }), false)
  assert.equal(shouldAskToJoin({ ...base, path: 'bronnen' }), false)
})

test('"Niet nu": pas na de pauze nog één keer, daarna nooit meer', () => {
  assert.equal(shouldAskToJoin({ ...base, asked: { n: 1, at: base.now - 1000 } }), false)
  assert.equal(shouldAskToJoin({ ...base, asked: { n: 1, at: base.now - JOIN_PAUSE } }), true)
  assert.equal(shouldAskToJoin({ ...base, asked: { n: 2, at: 0 } }), false)
})

// Een nep-adresbalk en -opslag voor dropInvite.
const browser = (href, stored = {}) => {
  const store = { ...stored }
  const hist = { state: { x: 1 }, url: null, replaceState(state, _t, url) { this.url = url; this.kept = state } }
  const storage = { removeItem: (k) => delete store[k], setItem: () => assert.fail('niets opslaan') }
  return { loc: { href }, hist, storage, store }
}

test('oude uitnodigingslink: de code gaat stil uit de adresbalk, niets wordt bewaard', () => {
  const b = browser('https://hootnews.nl/lees/?uitnodiging=abc123&x=1#/editie')
  dropInvite(b.loc, b.hist, b.storage)
  assert.equal(b.hist.url, '/lees/?x=1#/editie')
  assert.deepEqual(b.hist.kept, { x: 1 })
  const alleen = browser('https://hootnews.nl/lees/?uitnodiging=abc123#/stroom')
  dropInvite(alleen.loc, alleen.hist, alleen.storage)
  assert.equal(alleen.hist.url, '/lees/#/stroom')
})

test('zonder uitnodiging verandert de adresbalk niet; een oude bewaarde code wordt opgeruimd', () => {
  const b = browser('https://hootnews.nl/lees/#/editie', { 'hoot:invite': 'oud', 'hoot:prefs': '{}' })
  dropInvite(b.loc, b.hist, b.storage)
  assert.equal(b.hist.url, null)
  assert.deepEqual(b.store, { 'hoot:prefs': '{}' })
})

test('geen uitnodigingspaden of -teksten meer op het web', () => {
  const files = ['src/hooks/useAccount.js', 'src/components/Account.jsx', 'src/App.jsx', 'src/views/Edition.jsx', 'src/views/Welcome.jsx', 'src/views/Settings.jsx', 'src/lib/account.js', 'src/main.jsx']
  for (const f of files) {
    const src = readFileSync(new URL('../' + f, import.meta.url), 'utf8')
    assert.doesNotMatch(src, /noInvite|redeem_invite|create_invite|RedeemRow|InviteRow|captureInvite|pendingInvite/, f)
    assert.doesNotMatch(src, /op uitnodiging|Voor leden|Al lid\?|uitnodigingscode/i, f)
  }
})

test('landing: de FAQ zegt dat een account voor iedereen is', () => {
  const html = readFileSync(new URL('../landing/index.src.html', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /op uitnodiging/)
  assert.match(html, /Wil je je Editie en Bewaard op meer toestellen\? Maak gratis een account\./)
})
