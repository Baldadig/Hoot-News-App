// Volgen 1.5, bouwplanstap 1.4a: de naamherkenning van de Haagse dossiers is een gedeelde functie geworden (normNaam,
// kopWoorden, namenInKop, uitgeversPerNaam, en kopBevat alleen voor volgzaken). dossierNames en haagsDossier geven op de
// live feeds precies dezelfde uitvoer als vóór de verbouwing (vastgelegd met scripts/vastleggen-dossiers.mjs in de commit
// daarvoor). De bestaande toetsen van haagsDossier (frisse-ogen-ronde3, aflevering-geen-bron) blijven ongewijzigd groen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FEEDS, laad, uitvoer } from '../scripts/vastleggen-dossiers.mjs'
import { normNaam, kopWoorden, namenInKop, kopBevat, uitgeversPerNaam, dossierNames } from '../netlify/lib/dossiers.mjs'

const VOORAF = JSON.parse(readFileSync(new URL('./fixtures/dossier-namen-vooraf.json', import.meta.url), 'utf8'))

test('dossierNames en haagsDossier: dezelfde uitvoer als vóór de verbouwing, op vijf live feeds', () => {
  for (const f of FEEDS) {
    const nu = JSON.parse(JSON.stringify(uitvoer(laad(f))))
    assert.deepEqual(nu.alle, VOORAF[f].alle, `${f}: namen in alle koppen`)
    assert.deepEqual(nu.haagsNamen, VOORAF[f].haagsNamen, `${f}: namen in Haagse koppen`)
    assert.deepEqual(nu.dossier, VOORAF[f].dossier, `${f}: het dossier`)
    assert.deepEqual(nu.entries, VOORAF[f].entries, `${f}: de plekken`)
  }
  assert.ok(Object.values(VOORAF).some((o) => o.dossier), 'minstens één feed met een dossier')
})

test('de toetsen van haagsDossier zelf zijn niet aangeraakt', () => {
  for (const f of ['frisse-ogen-ronde3.test.mjs', 'aflevering-geen-bron.test.mjs']) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')
    assert.match(src, /haagsDossier/)
    assert.doesNotMatch(src, /namenInKop|kopBevat|uitgeversPerNaam/)
  }
})

test('de gedeelde stukken: woorden van een kop, namen uit een woordenschat, samenstelling, een naam met een getal', () => {
  assert.equal(normNaam('Café'), 'cafe')
  assert.deepEqual(kopWoorden('GTA-6 komt eraan, zegt Rockstar'), ['GTA', '6', 'komt', 'eraan', 'zegt', 'Rockstar'])
  const w = new Set(['formatie', 'rockstar'])
  assert.deepEqual([...namenInKop('Formatiegesprek met Rockstar', w)].sort(), ['formatie', 'rockstar'])
  assert.deepEqual([...namenInKop('Nieuwe regels voor box 3', new Set())], ['box 3'])
  assert.deepEqual([...namenInKop('Releasedatum GTA 6 bekend', new Set())], ['gta 6'])
  assert.deepEqual([...namenInKop('De Tweede Kamer 2', new Set())], [], 'een woord van de politiek met een getal is geen naam')
  // Een korte naam telt niet vooraan in een samenstelling.
  assert.deepEqual([...namenInKop('Gtaverhaal', new Set(['gta']))], [])
})

test('kopBevat: een naam van meer woorden als opeenvolgende woorden', () => {
  assert.equal(kopBevat('Rechtszaak tegen Tata Steel begint', 'Tata Steel'), true)
  assert.equal(kopBevat('Tata kondigt aan: steel wordt duurder', 'Tata Steel'), false)
  assert.equal(kopBevat('Grand Theft Auto VI uitgesteld', 'Grand Theft Auto VI'), true)
  assert.equal(kopBevat('GTA-6 uitgesteld', 'GTA 6'), true)
  assert.equal(kopBevat('Iets anders', ''), false)
})

test('uitgevers per naam: de NOS-familie is één uitgever', () => {
  const stukken = [{ id: 'a', source: 'nos' }, { id: 'b', source: 'nos-economie' }, { id: 'c', source: 'nu' }]
  const namen = new Map([['a', new Set(['tata'])], ['b', new Set(['tata'])], ['c', new Set(['tata', 'steel'])]])
  assert.deepEqual([...uitgeversPerNaam(stukken, namen)], [['tata', 2], ['steel', 1]])
  // dossierNames rekent met namenInKop: dezelfde namen per kop.
  const pieces = [{ id: 'x', title: 'Kabinet en Jetten over Belastingplan' }, { id: 'y', title: 'belastingplannen in de Kamer' }]
  const m = dossierNames(pieces)
  assert.deepEqual([...m.get('x')].sort(), ['belastingplan', 'jetten'])
  assert.deepEqual([...m.get('y')], ['belastingplan'])
})
