// De dagreeks op de momentopname (tests/helpers/dagreeks.mjs): Ochtend → Middag → Avond voor vijf
// persona's. De drempels zijn die van Hoot-design/algoritme/aanvulling-pariteit-herhaling.md §3,
// scenario "dag"; meting/acceptatie.mjs meet dezelfde maten met dezelfde helper. Wat op een regel
// wacht die nog niet gebouwd is (H3 drie Edities in de hook, H5 account, H6 sameEvent), staat als todo.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot } from './helpers/snapshot.mjs'
import { runDay, articlesOf, line, VARIANTS } from './helpers/dagreeks.mjs'

const snap = loadSnapshot()
const res = runDay(articlesOf(snap), snap.sources)
const S = res.summary

test('dagreeks: drie dagdelen, vijf persona\'s, drie varianten, elke Editie vol', (t) => {
  for (const v of VARIANTS) {
    t.diagnostic(`previous=${v}: ${line({ label: 'opeenvolgend', ...S[v].opeenvolgend })}`)
    t.diagnostic(`previous=${v}: ${line({ label: 'ochtend→avond', ...S[v].ochtendAvond })}`)
  }
  t.diagnostic(`groot nieuws aanwezig óf vandaag al getoond: ${S.grootNieuwsDag}; tweetalige verhalen in de Avond: ${S.tweetalig} van ${S.verhalen}`)
  assert.equal(Object.keys(res.personas).length, 5)
  for (const r of Object.values(res.personas)) for (const v of VARIANTS) for (const ed of r.variants[v].editions) assert.equal(ed.entries.length, 10, `${r.name} ${v} ${ed.id}`)
  assert.equal(S.code.opeenvolgend.plekken, 100)
  assert.equal(S.code.ochtendAvond.plekken, 50)
})

test('dagreeks: herhaald zonder ontwikkeling, Ochtend→Middag→Avond = 0 (code, drie, account)', () => {
  for (const v of VARIANTS) assert.equal(S[v].opeenvolgend.zonderOntwikkeling, 0, `previous=${v}`)
})

test('dagreeks: herhaald zonder ontwikkeling, Ochtend→Avond = 0 met previous over de dag (drie, account)', () => {
  for (const v of ['drie', 'account']) assert.equal(S[v].ochtendAvond.zonderOntwikkeling, 0, `previous=${v}`)
})

test('dagreeks: herhaald zonder ontwikkeling, Ochtend→Avond = 0 met wat de hook meegeeft (code)', { todo: 'H3: de hook geeft nog één Editie mee als previous' }, () => {
  assert.equal(S.code.ochtendAvond.zonderOntwikkeling, 0)
})

test('dagreeks: herhaald mét ontwikkeling hooguit 1 per Editie, altijd met een nieuwe kop en why "Vervolg"', () => {
  for (const v of VARIANTS) {
    assert.ok(S[v].opeenvolgend.ontwikkeldMax <= 1, `previous=${v}: ${S[v].opeenvolgend.ontwikkeldMax} per Editie`)
    assert.equal(S[v].opeenvolgend.vervolgFout + S[v].ochtendAvond.vervolgFout, 0, `previous=${v}`)
  }
})

test('dagreeks: nooit dezelfde kop als een vorige Editie', () => {
  for (const v of VARIANTS) assert.equal(S[v].opeenvolgend.zelfdeKop, 0, `previous=${v}`)
  for (const v of ['drie', 'account']) assert.equal(S[v].ochtendAvond.zelfdeKop, 0, `previous=${v}`)
})

test('dagreeks: geen plek die als "Vervolg" terugkomt zonder nieuwe namen in de kop (gemeten op de volledige pool)', () => {
  for (const v of VARIANTS) assert.equal(S[v].opeenvolgend.vervolgZonderSig + S[v].ochtendAvond.vervolgZonderSig, 0, `previous=${v}`)
})

test('dagreeks: zelfde onderwerp onder een ander verhaal-id komt niet terug (clashes tegen vorige koppen)', () => {
  for (const v of VARIANTS) assert.equal(S[v].opeenvolgend.zelfdeOnderwerp, 0, `previous=${v}`)
})

test('dagreeks: groot nieuws aanwezig óf vandaag al getoond = 100 %', () => {
  assert.equal(S.grootNieuwsDag, 1)
})

test('dagreeks: ≥ 35 tweetalige verhalen in de Avond', { todo: 'H6 (sameEvent gericht uitgebreid) komt in een volgend pakket' }, () => {
  assert.ok(S.tweetalig >= 35, `${S.tweetalig} van ${S.verhalen}`)
})
