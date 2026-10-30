// De dagreeks op de momentopname (tests/helpers/dagreeks.mjs): Ochtend → Middag → Avond voor vijf
// persona's, samengesteld op toestelkennis (eigen bronnen + de koppen van de algemene Editie) en
// gemeten op de volledige pool. De drempels zijn die van Hoot-design/algoritme/aanvulling-pariteit-
// herhaling.md §3, scenario "dag"; meting/acceptatie.mjs meet dezelfde maten met dezelfde helper.
// Twee harde drempels van §3 staan hier bewust nog als todo, met een vaste afspraak wanneer ze hard
// worden: "O→A, previous=code = 0" bij H3 (previous over drie Edities in de hook) en "tweetalig ≥ 35"
// bij H6 (sameEvent gericht uitgebreid). Tot dan is "alle harde drempels gehaald" niet "§3 gehaald".
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
  t.diagnostic(`groot nieuws aanwezig óf vandaag al getoond: ${S.grootNieuwsDag}; tweetalige verhalen in de dagpool: ${S.tweetalig} van ${S.verhalen}`)
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

test('dagreeks: herhaald zonder ontwikkeling, Ochtend→Avond = 0 met wat de hook meegeeft (code)', { todo: 'spec §3 hard 0; wordt hard bij H3 (de hook geeft nog één Editie mee als previous)' }, () => {
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

// Teller en noemer op de basis van de diagnose: alle verhalen van de dagpool (met de live-momentopname
// erbij 22 van 142, zoals §3 zegt; alleen op de momentopname van 19:00Z minder), niet alleen de Avond.
test('dagreeks: ≥ 35 tweetalige verhalen in de dagpool', { todo: 'spec §3 hard; wordt hard bij H6 (sameEvent gericht uitgebreid)' }, () => {
  assert.ok(S.verhalen > 60, `dagpool heeft ${S.verhalen} verhalen`)
  assert.ok(S.tweetalig >= 35, `${S.tweetalig} van ${S.verhalen}`)
})

// De meting zelf: composePersonal krijgt per persona alleen toestelkennis, en geen persona kent de
// hele pool (anders bewijst "zonder ontwikkeling 0" niets over H2).
test('dagreeks: de persoonlijke Edities zijn op toestelkennis samengesteld', () => {
  for (const r of Object.values(res.personas)) for (const ed of r.variants.code.editions) {
    const d = res.day.find((x) => x.sl.id === ed.id)
    for (const e of ed.entries) assert.ok(d.byId.has(e.leadId || e.id), `${r.name} ${ed.id}: kop ${e.leadId || e.id} onbekend`)
    for (const e of ed.entries.filter((x) => x.kind === 'story')) assert.ok(Array.isArray(e.keys) && e.keys.length, `${r.name} ${ed.id}: plek ${e.id} zonder keys`)
  }
})
