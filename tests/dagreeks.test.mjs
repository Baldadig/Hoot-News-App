// De dagreeks op de momentopname (tests/helpers/dagreeks.mjs): Ochtend → Middag → Avond voor vijf
// persona's, samengesteld op toestelkennis (eigen bronnen + de koppen van de algemene Editie) en
// gemeten op de volledige pool. De drempels zijn die van Hoot-design/algoritme/aanvulling-pariteit-
// herhaling.md §3, scenario "dag"; meting/acceptatie.mjs meet dezelfde maten met dezelfde helper.
// Vier varianten voor `previous`: `code` (hetzelfde toestel, zoals de hook: de laatste Editie met haar
// history), `drie` (alle Edities van de dag), `account` (ander toestel, alleen wat in het account staat)
// en `sprong` (ander toestel, en niemand stelde de Middag samen). Sinds H3/H5 geldt "herhaald zonder
// ontwikkeling = 0" hard in alle vier, ook Ochtend→Avond. Eén drempel van §3 staat hier als todo:
// "tweetalig ≥ 35". H6 (sameEvent gericht uitgebreid, `extended`) bracht de dagpool met live-momentopname
// van 22 naar 31 van 143 (alleen de momentopname van 19:00Z: van 17 van 97 naar 22 van 100). Dat is een
// afwijking van de aanvulling die de bouwer niet zelf kan sluiten: óf §3 wordt aangepast met de
// onderbouwing (wat eentalig blijft is binnenland en sport zonder tegenhanger in de andere taal), óf er
// komen meer regels. Tot Alex of de orkestratie dat beslist, is "alle harde drempels gehaald" niet
// "§3 gehaald". De stand na H6 staat hier los daarvan hard als regressiewacht, zodat H6 niet terugvalt.
// Sinds de keuring van P5b-3 is ook hard: geen woordenschat-kloof tussen de keys van de server en de
// kenmerken die het toestel rekent (keysKloof = 0).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot } from './helpers/snapshot.mjs'
import { runDay, articlesOf, line, VARIANTS, SCHEDULE } from './helpers/dagreeks.mjs'
import { HISTORY_MAX } from '../netlify/lib/stories.mjs'

const snap = loadSnapshot()
const res = runDay(articlesOf(snap), snap.sources)
const S = res.summary

// Normen 1 november 2026: liever korter dan ongeoorloofd aanvullen. Op toestelkennis zijn er 's ochtends
// en 's middags niet altijd tien toegelaten plekken (zonder Wereld alleen groot buitenlands nieuws,
// geen sport zonder sportkeuze); een Editie is dan korter, nooit leeg en nooit langer dan tien.
test('dagreeks: drie dagdelen, vijf persona\'s, vier varianten, elke Editie gevuld met wat de normen toelaten', (t) => {
  for (const v of VARIANTS) {
    t.diagnostic(`previous=${v}: ${line({ label: 'opeenvolgend', ...S[v].opeenvolgend })}`)
    t.diagnostic(`previous=${v}: ${line({ label: 'ochtend→avond', ...S[v].ochtendAvond })}`)
  }
  t.diagnostic(`groot nieuws aanwezig óf vandaag al getoond: ${S.grootNieuwsDag}; tweetalige verhalen in de dagpool: ${S.tweetalig} van ${S.verhalen}; woordenschat-kloof: ${S.keysKloof} stukken`)
  assert.equal(Object.keys(res.personas).length, 5)
  assert.deepEqual(VARIANTS, ['code', 'drie', 'account', 'sprong'])
  for (const r of Object.values(res.personas)) for (const v of VARIANTS) {
    assert.equal(r.variants[v].editions.length, SCHEDULE[v].length, `${r.name} ${v}`)
    for (const ed of r.variants[v].editions) assert.ok(ed.entries.length >= 6 && ed.entries.length <= 10, `${r.name} ${v} ${ed.id}: ${ed.entries.length}`)
    // De Avond heeft op deze dag genoeg toegelaten aanbod voor tien plekken.
    assert.equal(r.variants[v].editions.at(-1).entries.length, 10, `${r.name} ${v} avond`)
  }
  // De maten tellen elke plek van de latere Editie van een overgang.
  const len = (v, pick) => Object.values(res.personas).reduce((n, r) => n + pick(r.variants[v].editions).reduce((m, ed) => m + ed.entries.length, 0), 0)
  for (const v of VARIANTS) assert.equal(S[v].opeenvolgend.plekken, len(v, (eds) => eds.slice(1)), v)
  for (const v of VARIANTS) assert.equal(S[v].ochtendAvond.plekken, len(v, (eds) => eds.slice(-1)), v)
})

test('dagreeks: herhaald zonder ontwikkeling, opeenvolgend = 0 (code, drie, account, sprong)', () => {
  for (const v of VARIANTS) assert.equal(S[v].opeenvolgend.zonderOntwikkeling, 0, `previous=${v}`)
})

test('dagreeks: herhaald zonder ontwikkeling, Ochtend→Avond = 0 in alle varianten (H3: previous over de dag, ook wat de hook meegeeft)', () => {
  for (const v of VARIANTS) assert.equal(S[v].ochtendAvond.zonderOntwikkeling, 0, `previous=${v}`)
})

test('dagreeks: herhaald mét ontwikkeling hooguit 1 per Editie, altijd met een nieuwe kop en why "Vervolg"', () => {
  for (const v of VARIANTS) {
    assert.ok(S[v].opeenvolgend.ontwikkeldMax <= 1, `previous=${v}: ${S[v].opeenvolgend.ontwikkeldMax} per Editie`)
    assert.equal(S[v].opeenvolgend.vervolgFout + S[v].ochtendAvond.vervolgFout, 0, `previous=${v}`)
  }
})

test('dagreeks: nooit dezelfde kop als een vorige Editie', () => {
  for (const v of VARIANTS) {
    assert.equal(S[v].opeenvolgend.zelfdeKop, 0, `previous=${v}`)
    assert.equal(S[v].ochtendAvond.zelfdeKop, 0, `previous=${v}`)
  }
})

test('dagreeks: geen plek die als "Vervolg" terugkomt zonder nieuwe namen in de kop (gemeten op de volledige pool)', () => {
  for (const v of VARIANTS) assert.equal(S[v].opeenvolgend.vervolgZonderSig + S[v].ochtendAvond.vervolgZonderSig, 0, `previous=${v}`)
})

test('dagreeks: zelfde onderwerp onder een ander verhaal-id komt niet terug (clashes tegen vorige koppen)', () => {
  for (const v of VARIANTS) assert.equal(S[v].opeenvolgend.zelfdeOnderwerp + S[v].ochtendAvond.zelfdeOnderwerp, 0, `previous=${v}`)
})

test('dagreeks: groot nieuws aanwezig óf vandaag al getoond = 100 %', () => {
  assert.equal(S.grootNieuwsDag, 1)
})

// Teller en noemer op de basis van de diagnose: alle verhalen van de dagpool (met de live-momentopname
// erbij 22 van 142, zoals §3 zegt; alleen op de momentopname van 19:00Z minder), niet alleen de Avond.
test('dagreeks: ≥ 35 tweetalige verhalen in de dagpool', { todo: 'spec §3 hard, niet gehaald: na H6 31 van 143 (met live), 22 van 100 (zonder); afwijking ter beslissing (§3 aanpassen of meer regels), niet door de bouwer te sluiten' }, () => {
  assert.ok(S.verhalen > 60, `dagpool heeft ${S.verhalen} verhalen`)
  assert.ok(S.tweetalig >= 35, `${S.tweetalig} van ${S.verhalen}`)
})

// Regressiewacht, geen drempel van §3: de stand na H6 op de momentopname alleen (npm test kent de
// live-momentopname niet): Apple/Nvidia, het Poolse Hof, Olesjky, de Chinese partij en de Intel-koersval
// zijn tweetalig geworden. Hard, zodat een volgende wijziging aan sameEvent niet stil terugvalt.
test('dagreeks: regressiewacht H6 — ≥ 22 tweetalige verhalen op de momentopname (vóór H6: 17)', () => {
  assert.ok(S.tweetalig >= 22, `${S.tweetalig} van ${S.verhalen}`)
})

// Keuring P5b-3: de kenmerken die het toestel zelf rekent (gewone signaturen over eigen bronnen plus de
// koppen van de algemene Editie) staan per stuk in de keys van zijn verhaal, voor elke persona en elk
// dagdeel. Vóór de herstelling: 21 stukken in 12 van 100 verhalen op de dagpool ("wall" + "street",
// "hong" + "kong", "belgische", "olesjky").
test('dagreeks: geen woordenschat-kloof tussen de server-keys en de toestelkenmerken (keysKloof = 0)', () => {
  assert.equal(S.keysKloof, 0, `${S.keysKloof} stukken in ${S.keysKloofVerhalen} verhalen`)
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

// H5: elke vastgelegde Editie draagt de samenvattingen van de Edities ervóór (hooguit HISTORY_MAX,
// nieuwste eerst), zoals de hook ze naar user_state.edition schrijft; het andere toestel (account) en
// het toestel dat de Middag oversloeg (sprong) rekenen met niets anders dan die rij.
test('dagreeks: history per Editie — Ochtend leeg, Middag [Ochtend], Avond [Middag, Ochtend]; sprong-Avond [Ochtend]', () => {
  for (const r of Object.values(res.personas)) {
    for (const v of ['code', 'drie', 'account']) {
      const ids = r.variants[v].editions.map((ed) => ed.history.map((h) => h.id))
      assert.deepEqual(ids, [[], ['2026-10-30-ochtend'], ['2026-10-30-middag', '2026-10-30-ochtend']], `${r.name} ${v}`)
    }
    assert.deepEqual(r.variants.sprong.editions.map((ed) => ed.history.map((h) => h.id)), [[], ['2026-10-30-ochtend']], `${r.name} sprong`)
    for (const v of VARIANTS) for (const ed of r.variants[v].editions) {
      assert.ok(ed.history.length <= HISTORY_MAX)
      for (const h of ed.history) {
        assert.ok(Array.isArray(h.storyIds) && Array.isArray(h.itemIds) && Array.isArray(h.titles) && h.builtAt, `${r.name} ${v} ${ed.id}: history-regel ${h.id}`)
        // Keys horen bij verhaalplekken. Een Editie met alleen losse berichten (normen 1 november: niet-groot
        // buitenland valt af) heeft er geen; elke Editie met een verhaal wel.
        const src = r.variants[v].editions.find((x) => x.id === h.id)
        const hasStory = src.entries.some((e) => e.kind === 'story')
        assert.equal(Object.keys(h.keys).length > 0, hasStory, `${r.name} ${v} ${ed.id}: history-regel ${h.id} ${hasStory ? 'zonder keys' : 'met keys zonder verhaal'}`)
      }
    }
  }
})
