import test from 'node:test'
import assert from 'node:assert/strict'
import { firstImages, latestChoice, warmImages, timeMs } from '../src/lib/rubriek-crossfade.js'
test('snelle keuzes laten alleen het laatste vertraagde resultaat door', async () => {
  const gate = latestChoice(), first = gate.begin(), second = gate.begin()
  assert.equal(first(), false); assert.equal(second(), true)
  gate.cancel(); assert.equal(second(), false)
})
test('voorladen beperkt zich tot eerste zichtbare beelden en respecteert uit', () => {
  const items = [{image:'a'}, {image:'a'}, {image:'b'}, {image:'c'}]
  assert.deepEqual(firstImages(items), ['a','b']); assert.deepEqual(firstImages(items,false), [])
})
test('een mislukt of hangend beeld blokkeert de rubriek niet', async () => {
  class Failing {set src(url) {queueMicrotask(() => this.onerror())}}
  await warmImages(['kapot'], url=>({src:url}), {ImageType:Failing,timeout:50})
  class Hanging {set src(url) {}}
  const start=Date.now();await warmImages(['traag'],url=>({src:url}),{ImageType:Hanging,timeout:20})
  assert.ok(Date.now()-start < 500)
})

test('seconden en milliseconden leveren dezelfde echte overgangsduur op', () => {
  assert.equal(timeMs('.2s'),200);assert.equal(timeMs('200ms'),200)
  assert.equal(timeMs('0s'),0);assert.equal(timeMs('ongeldig'),200)
})

test('beeldvoorladen probeert ook een genormaliseerde fallback-URL maar één keer', async () => {
  const requested=[]
  class NormalizingFailure {
    set src(value) {this.value=encodeURI(value);requested.push(value);queueMicrotask(()=>this.onerror?.())}
    get src() {return this.value}
  }
  await warmImages(['cdn'],()=>({src:'https://example.test/cdn',fallback:'https://example.test/beeld met é.png'}),{ImageType:NormalizingFailure,timeout:100})
  assert.deepEqual(requested,['https://example.test/cdn','https://example.test/beeld met é.png'])
})
