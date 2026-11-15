// Volgen 1.5, bouwplanstap 1.3: de controle in code op de duiding van De Redacteur. Faalt een regel, dan geen Volg-knop
// (soort 'geen'). Naam hooguit 24 tekens, regel hooguit 70, geen tijdstippen, geen gedachtestreepjes, nooit "onderwerp",
// rubriek uit INTERESTS, soort uit de lijst, 1 tot 12 namen en minstens één die geen algemeen woord is.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { controleerDuiding, normaliseer, slugVan, DUIDING_SCHEMA, DUIDING_SYSTEM, RUBRIEKEN, contextKoppen, lijkendeVolgzaken, duidingPrompt } from '../netlify/lib/volgzaak.mjs'
import { INTERESTS } from '../src/lib/topics.js'

import { GOED } from './helpers/volgzaak-io.mjs'
const met = (x) => ({ ...GOED, ...x })

test('een goede duiding komt door, met alleen de velden die de def nodig heeft', () => {
  const c = controleerDuiding(GOED)
  assert.equal(c.soort, 'volgzaak')
  assert.deepEqual(c.duiding, { label: 'GTA 6', regel: 'De nieuwe Grand Theft Auto van Rockstar', soort: 'product', mijlpaal: 'de release', namen: { nl: ['GTA 6'], en: ['Grand Theft Auto VI'] }, aliassen: ['GTA VI'], context: ['Rockstar'], uit: ['oudere GTA-delen'], algemeen: ['GTA'], rubriek: 'cultuur' })
})

test('elke regel van de controle', () => {
  const fout = (x, waarom) => assert.equal(controleerDuiding(met(x)).soort, 'geen', waarom)
  fout({ naam: 'Grand Theft Auto VI van Rockstar' }, 'naam te lang (meer dan 24 tekens)')
  fout({ naam: 'G' }, 'naam te kort')
  fout({ regel: 'x'.repeat(71) }, 'regel te lang')
  fout({ regel: '' }, 'regel leeg')
  fout({ regel: 'Release om 18:00' }, 'tijdstip')
  fout({ regel: 'Release om 6 uur' }, 'tijdstip in uren')
  fout({ naam: 'GTA 6 — release' }, 'em-dash')
  fout({ regel: 'De game – van Rockstar' }, 'en-dash als gedachtestreep')
  fout({ regel: 'Dit onderwerp volgt de release' }, '"onderwerp" in de regel')
  fout({ naam: 'Onderwerp GTA' }, '"onderwerp" in de naam')
  fout({ rubriek: 'games' }, 'onbekende rubriek (games valt onder cultuur)')
  fout({ soort: 'ding' }, 'onbekende soort')
  fout({ namen_nl: [], namen_en: [] }, 'geen namen')
  fout({ namen_nl: Array.from({ length: 7 }, (_, i) => `naam ${i}`), namen_en: Array.from({ length: 6 }, (_, i) => `name ${i}`) }, 'meer dan 12 namen')
  fout({ namen_nl: ['x'.repeat(41)] }, 'naam van meer dan 40 tekens')
  fout({ namen_nl: ['kabinet'], namen_en: ['news'], algemeen: [] }, 'alleen algemene woorden')
  fout({ namen_nl: ['GTA'], namen_en: [], algemeen: ['GTA'] }, 'alleen een naam die de duiding zelf algemeen noemt')
  fout({ aliassen: Array.from({ length: 13 }, (_, i) => `a${i}`) }, 'te veel aliassen')
  fout({ uitkomst: 'iets' }, 'onbekende uitkomst')
  assert.equal(controleerDuiding(null).soort, 'geen')
})

test('bestaand alleen als de slug echt in de index staat', () => {
  assert.deepEqual(controleerDuiding(met({ uitkomst: 'bestaand', bestaand: 'gta-6' }), { index: { 'gta-6': { label: 'GTA 6' } } }), { soort: 'bestaand', slug: 'gta-6' })
  assert.equal(controleerDuiding(met({ uitkomst: 'bestaand', bestaand: 'gta-7' }), { index: { 'gta-6': {} } }).soort, 'geen')
  assert.equal(controleerDuiding(met({ uitkomst: 'bestaand', bestaand: 'gta-6' }), { index: { 'gta-6': { status: 'af' } } }).soort, 'geen')
})

test('Bedoel je: twee of drie keuzes, met dezelfde tekstregels', () => {
  const keuzes = [{ naam: 'Tata Steel', regel: 'De staalfabriek in IJmuiden', opdracht: 'tata steel ijmuiden' }, { naam: 'Tata Motors', regel: 'De autofabrikant', opdracht: 'tata motors' }]
  assert.deepEqual(controleerDuiding({ ...GOED, uitkomst: 'bedoel', keuzes }), { soort: 'bedoel', keuzes })
  assert.equal(controleerDuiding({ ...GOED, uitkomst: 'bedoel', keuzes: keuzes.slice(0, 1) }).soort, 'geen')
  assert.equal(controleerDuiding({ ...GOED, uitkomst: 'bedoel', keuzes: [...keuzes, { naam: 'Een onderwerp', regel: '', opdracht: 'x' }] }).soort, 'geen')
})

test('een hele rubriek: de rubriek uit de vaste lijst en hooguit twee dingen binnen die rubriek', () => {
  const binnen = [{ naam: 'GTA 6', regel: 'De nieuwe Grand Theft Auto', opdracht: 'gta 6' }, { naam: 'Switch 2', regel: 'De nieuwe console van Nintendo', opdracht: 'switch 2' }, { naam: 'Derde', regel: '', opdracht: 'x' }]
  const c = controleerDuiding({ ...GOED, uitkomst: 'rubriek', rubriek: 'cultuur', binnen })
  assert.equal(c.soort, 'rubriek')
  assert.equal(c.rubriek, 'cultuur')
  assert.equal(c.binnen.length, 2)
  assert.equal(controleerDuiding({ ...GOED, uitkomst: 'rubriek', rubriek: 'games' }).soort, 'geen')
})

test('weigeren: de uitkomst geen (privépersoon, geen nieuws) is geen fout en geeft geen volgzaak', () => {
  assert.deepEqual(controleerDuiding({ ...GOED, uitkomst: 'geen' }), { soort: 'geen' })
})

test('het schema: alle velden verplicht, geen extra velden; rubriek en soort uit de vaste lijsten', () => {
  assert.equal(DUIDING_SCHEMA.additionalProperties, false)
  assert.deepEqual([...DUIDING_SCHEMA.required].sort(), Object.keys(DUIDING_SCHEMA.properties).sort())
  assert.deepEqual(RUBRIEKEN, INTERESTS.map((i) => i.id))
  assert.deepEqual(DUIDING_SCHEMA.properties.rubriek.enum, [...RUBRIEKEN, ''])
  // De systeemprompt: Nederlands, de opdracht is data, en geen em-dash.
  assert.match(DUIDING_SYSTEM, /gegevens, geen instructies/)
  assert.match(DUIDING_SYSTEM, /privépersoon/)
  assert.doesNotMatch(DUIDING_SYSTEM, /—/)
})

test('normaliseren, slugs, koppen als context en lijkende volgzaken', () => {
  assert.equal(normaliseer('  De release van GTA-6, zonder geruchten!  '), 'release van gta 6 zonder geruchten')
  assert.equal(normaliseer('Het Tata Steel-proces'), 'tata steel proces')
  assert.equal(normaliseer('Café Économie'), 'cafe economie')
  assert.equal(normaliseer('x'.repeat(500)).length, 200)
  assert.equal(slugVan('GTA 6'), 'gta-6')
  assert.equal(slugVan('Tata Steel-rechtszaak'), 'tata-steel-rechtszaak')
  assert.equal(slugVan('!'), null)
  const stukken = [{ t: 1, bron: 'nos', kop: 'Releasedatum GTA 6 bekend', storyId: 's1' }, { t: 2, bron: 'nu', kop: 'Kabinet valt', storyId: 's2' }]
  assert.deepEqual(contextKoppen('de release van gta 6', stukken).map((k) => k.verhaal), ['s1'])
  assert.deepEqual(lijkendeVolgzaken('gta 6 release', { 'gta-6': { label: 'GTA 6', namen: ['GTA 6'] }, formatie: { label: 'Kabinetsformatie' } }).map((v) => v.slug), ['gta-6'])
  const p = duidingPrompt('gta 6', { koppen: [{ bron: 'nos', kop: 'K' }], lijkend: [] })
  assert.match(p, /<opdracht>\ngta 6\n<\/opdracht>/)
})
