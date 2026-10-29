import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldAskToJoin, inviteCode, JOIN_PAUSE } from '../src/lib/join.js'

const base = { status: 'out', invited: true, onboarded: true, path: 'editie', scrolled: 1500, now: 10 * JOIN_PAUSE }

test('gevraagd als je ingesteld bent en een eind hebt gelezen', () => {
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

test('op uitnodiging: zonder uitnodigingslink vraagt Hoot niet vanzelf', () => {
  assert.equal(shouldAskToJoin({ ...base, invited: false }), false)
  const { invited, ...zonder } = base
  assert.equal(shouldAskToJoin(zonder), false)
})

test('"Niet nu": pas na de pauze nog één keer, daarna nooit meer', () => {
  assert.equal(shouldAskToJoin({ ...base, asked: { n: 1, at: base.now - 1000 } }), false)
  assert.equal(shouldAskToJoin({ ...base, asked: { n: 1, at: base.now - JOIN_PAUSE } }), true)
  assert.equal(shouldAskToJoin({ ...base, asked: { n: 2, at: 0 } }), false)
})

test('uitnodigingscode: de hele link of alleen de code', () => {
  assert.equal(inviteCode('abc123'), 'abc123')
  assert.equal(inviteCode('  abc123 \n'), 'abc123')
  assert.equal(inviteCode('https://hootnews.nl/?uitnodiging=abc123'), 'abc123')
  assert.equal(inviteCode('https://hootnews.nl/?uitnodiging=abc123&x=1#/editie'), 'abc123')
  assert.equal(inviteCode('https://hootnews.nl/?uitnodiging=abc123#/editie'), 'abc123')
  assert.equal(inviteCode(''), '')
  assert.equal(inviteCode(), '')
})
