// Volgen 1.5: de volgregels in de gedeelde rekenkern (shared/volgzaak-weergave.mjs). Dezelfde gevallen draait de app
// (ios/HootTests/VolgzaakParityTests.swift, uit tests/fixtures/volgzaak-golden.json). Hier: de regels zelf, en de fixture
// door de bron en door de kale bundel (zoals JavaScriptCore op de iPhone hem draait).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { volgzaakVoorrang, metVoorrang, volgzaakView, volgtVan, rubriekRegel, actieveVolgzaken, weekNaam, VOLGZAKEN_MAX, VOORRANG_MS, JE_VOLGT, BUITEN_JE_BRONNEN } from '../src/lib/editionCore.js'
import * as core from '../src/lib/editionCore.js'
import { readCore } from '../scripts/build-edition-core.mjs'
import { makeVolgzaakGolden, callCase } from '../scripts/make-volgzaak-golden.mjs'

const NOW = Date.parse('2026-11-20T09:30:00Z')
const uur = (h) => new Date(NOW - h * 36e5).toISOString()
const zaken = (...slugs) => slugs.map((s) => ({ slug: s, label: s.toUpperCase(), status: 'actief' }))
const verhalen = { g: { volgzaak: { slug: 'gta', label: 'GTA' } }, g2: { volgzaak: { slug: 'gta', label: 'GTA' } }, f: { volgzaak: { slug: 'form', label: 'Form' } }, t: { volgzaak: { slug: 'tata', label: 'Tata' } }, s: { volgzaak: { slug: 'star', label: 'Star' } } }
const it = (id, storyId, h, kind = 'article') => ({ id, storyId, publishedAt: uur(h), kind })
const basis = (extra = {}) => ({ verhalen, volgzaken: zaken('gta', 'form'), gezien: {}, gelezen: [], now: NOW, weergave: 'alles', ...extra })

test('voorrang: alleen het nieuwste stuk per gevolgde volgzaak krijgt label en voorrang; oudere stukken blijven zonder label op hun plek', () => {
  const lijst = [it('x', null, 0.5), it('f1', 'f', 1), it('g1', 'g', 2), it('g2', 'g2', 5), it('f2', 'f', 8)]
  const r = volgzaakVoorrang(basis({ lijst, grens: 5 }))
  assert.deepEqual(Object.keys(r.labels).sort(), ['f1', 'g1'])
  assert.deepEqual(r.voorrang, ['f1', 'g1'], 'nieuwste eerst')
  const geordend = metVoorrang(lijst, r.voorrang).map((i) => i.id)
  assert.deepEqual(geordend, ['f1', 'g1', 'x', 'g2', 'f2'], 'het stuk verhuist en staat niet nog eens lager')
})

test('voorrang: alleen uit het laatste etmaal, alleen ongezien, alleen boven de grens, niet als je het (in de Editie) las', () => {
  const lijst = [it('g1', 'g', 2), it('f1', 'f', 25)]
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, grens: 2 })).voorrang, ['g1'], 'ouder dan een etmaal: label wel, voorrang niet')
  assert.ok(volgzaakVoorrang(basis({ lijst, grens: 2 })).labels.f1)
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, grens: 2, gezien: { g1: 1 } })).voorrang, [], 'gezien: bij het volgende openen niet meer boven')
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, grens: 2, gezien: ['g1'] })).voorrang, [], 'gezien mag ook een lijst zijn')
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, grens: 0 })).voorrang, [], 'alles gezien (grens 0): geen voorrang')
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, grens: 2, gelezen: ['g1'] })).voorrang, [], 'gelezen in de Editie: geen voorrang meer')
  assert.equal(VOORRANG_MS, 864e5)
})

test('voorrang: hooguit drie, nieuwste eerst; een gestopte volgzaak telt niet', () => {
  const lijst = [it('t1', 't', 1), it('s1', 's', 2), it('f1', 'f', 3), it('g1', 'g', 4)]
  const vier = [...zaken('gta', 'form', 'tata', 'star')]
  const r = volgzaakVoorrang(basis({ lijst, grens: 4, volgzaken: vier }))
  assert.equal(r.voorrang.length, VOLGZAKEN_MAX)
  assert.deepEqual(r.voorrang, ['t1', 'f1', 'g1'], 'de eerste drie van je lijst tellen; star is de vierde')
  const gestopt = volgzaakVoorrang(basis({ lijst, grens: 4, volgzaken: [{ slug: 'tata', label: 'Tata', status: 'gestopt' }, ...zaken('gta')] }))
  assert.deepEqual(gestopt.voorrang, ['g1'])
  assert.equal(gestopt.labels.t1, undefined)
})

test('voorrang: onder Alles en in de eigen rubriek, niet onder Buiten je bubbel of een tab; nooit op een Bluesky-bericht', () => {
  const lijst = [it('p', 'g', 0.1, 'post'), it('g1', 'g', 1)]
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, grens: 2, weergave: 'rubriek' })).voorrang, ['g1'])
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, grens: 2, weergave: 'alles' })).labels, { g1: { slug: 'gta', label: 'GTA' } }, 'de post krijgt geen label, ook al is hij nieuwer')
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, grens: 2, weergave: 'bubbel' })), { labels: {}, voorrang: [] })
  const tab = volgzaakVoorrang(basis({ lijst, grens: 2, weergave: 'tab' }))
  assert.deepEqual(tab.voorrang, [])
  assert.ok(tab.labels.g1, 'in een tab wel het label, geen voorrang')
})

test('voorrang: zonder volgzaken of zonder veld verandert er niets (de app werkt ook met een server zonder deze functie)', () => {
  const lijst = [it('g1', 'g', 1), it('x', null, 2)]
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, volgzaken: [] })), { labels: {}, voorrang: [] })
  assert.deepEqual(volgzaakVoorrang(basis({ lijst, verhalen: {} })), { labels: {}, voorrang: [] })
  assert.deepEqual(volgzaakVoorrang({}), { labels: {}, voorrang: [] })
  assert.equal(metVoorrang(lijst, []), lijst, 'zonder voorrang dezelfde lijst')
})

test('label in de Editie: elke plek van een gevolgde volgzaak, met de naam uit je eigen lijst; gestopt of onbekend niet', () => {
  assert.deepEqual(volgtVan({ volgzaak: { slug: 'gta', label: 'GTA VI' } }, [{ slug: 'gta', label: 'GTA 6' }]), { slug: 'gta', label: 'GTA 6' })
  assert.equal(volgtVan({ volgzaak: { slug: 'gta', label: 'GTA' } }, [{ slug: 'gta', label: 'GTA', status: 'gestopt' }]), null)
  assert.equal(volgtVan({ id: 'zonder' }, zaken('gta')), null)
  assert.equal(volgtVan(null, zaken('gta')), null)
  assert.deepEqual(actieveVolgzaken([{ slug: 'a', label: 'A' }, { slug: 'a', label: 'A' }, { slug: 'b' }, ...zaken('c', 'd', 'e')]).map((z) => z.slug), ['a', 'c', 'd'])
})

test('rubriekregel: "Je volgt" gaat voor "Buiten je bronnen"; nooit drie delen', () => {
  assert.deepEqual(rubriekRegel({ rubriek: 'Politiek', volgt: { slug: 'f' }, buiten: true }), { delen: ['Politiek', JE_VOLGT], volgt: true, buiten: false })
  assert.deepEqual(rubriekRegel({ rubriek: 'Wereld', buiten: true }).delen, ['Wereld', BUITEN_JE_BRONNEN])
  assert.deepEqual(rubriekRegel({ rubriek: 'Games' }).delen, ['Games'])
  for (const volgt of [null, { slug: 'x' }]) for (const buiten of [false, true]) assert.ok(rubriekRegel({ rubriek: 'R', volgt, buiten }).delen.length <= 2)
})

const BRONNEN = [{ id: 'nos', lang: 'nl' }, { id: 'nu', lang: 'nl' }, { id: 'nrc', lang: 'nl', paid: true }, { id: 'tw', lang: 'nl' }, { id: 'verge', lang: 'en' }]
const v = (verhaal, bron, h, extra = {}) => ({ verhaal, kop: `Kop ${verhaal}`, bron, url: `https://x/${verhaal}`, bronnen: 2, at: uur(h), betaald: false, ...extra })

test('pagina: eigen bronnen, gratis van buiten met "Buiten je bronnen", nooit een betaalmuur van buiten, geen taal die je niet koos', () => {
  const stand = { verhalen: [v('a', 'nos', 1), v('b', 'tw', 2), v('c', 'nrc', 3, { betaald: true }), v('d', 'verge', 4), v('e', 'onbekend', 5)] }
  const r = volgzaakView({ stand, bronnen: BRONNEN, eigen: ['nos'], gezien: null, now: NOW })
  assert.deepEqual(r.nieuw.map((x) => [x.verhaal, x.buiten]), [['a', false], ['b', true]])
  const met = volgzaakView({ stand, bronnen: BRONNEN, eigen: ['nos', 'nrc', 'verge'], gezien: null, now: NOW })
  assert.deepEqual(met.nieuw.map((x) => x.verhaal), ['a', 'c', 'b', 'd'], 'eerst je eigen taal, dan je eigen bronnen; betaald mag als het jouw bron is')
})

test('pagina: Nieuw sinds je vorige bezoek, gelezen telt niet als nieuw, Eerder per week; dubbelen eruit', () => {
  const stand = { verhalen: [v('a', 'nos', 1), v('b', 'nu', 30), v('c', 'nos', 24 * 9), v('a', 'nu', 2), { ...v('d', 'nu', 3), kop: 'Kop a' }] }
  const r = volgzaakView({ stand, bronnen: BRONNEN, eigen: ['nos', 'nu'], gezien: uur(10), gelezen: [], now: NOW })
  assert.deepEqual(r.nieuw.map((x) => x.verhaal), ['a'])
  assert.deepEqual(r.eerder.map((w) => [w.week, w.verhalen.map((x) => x.verhaal)]), [['Deze week', ['b']], ['Vorige week', ['c']]])
  assert.equal(r.aantal, 3)
  const gelezen = volgzaakView({ stand, bronnen: BRONNEN, eigen: ['nos', 'nu'], gezien: uur(10), gelezen: ['a'], now: NOW })
  assert.deepEqual(gelezen.nieuw, [])
  assert.deepEqual(volgzaakView({ now: NOW }), { nieuw: [], eerder: [], aantal: 0 }, 'zonder momentopname: leeg, geen fout')
})

test('weken: Deze week, Vorige week, daarna "Week van" de maandag (Amsterdamse kalender, ook rond de zomertijd)', () => {
  const vr = Date.parse('2026-11-20T09:00:00Z') // vrijdag
  assert.equal(weekNaam(Date.parse('2026-11-16T00:30:00Z'), vr), 'Deze week')
  assert.equal(weekNaam(Date.parse('2026-11-15T23:30:00Z'), vr), 'Deze week', 'zondag 23:30 UTC is maandag 00:30 in Amsterdam')
  assert.equal(weekNaam(Date.parse('2026-11-12T12:00:00Z'), vr), 'Vorige week')
  assert.equal(weekNaam(Date.parse('2026-11-03T12:00:00Z'), vr), 'Week van 2 november')
  assert.equal(weekNaam(Date.parse('2026-10-25T23:30:00Z'), Date.parse('2026-10-28T12:00:00Z')), 'Deze week', 'na de wintertijd: maandag 26 oktober')
  assert.equal(weekNaam(Date.parse('2026-03-29T22:30:00Z'), Date.parse('2026-04-01T12:00:00Z')), 'Deze week', 'in de zomertijd: maandag 30 maart 00:30')
})

const golden = JSON.parse(readFileSync(new URL('./fixtures/volgzaak-golden.json', import.meta.url), 'utf8'))

test('fixture: de bron geeft byte voor byte de vastgelegde uitvoer, en de fixture is bij (npm run golden)', () => {
  for (const c of golden) assert.equal(callCase(core, c), JSON.stringify(c.output), c.name)
  assert.deepEqual(makeVolgzaakGolden(), golden)
})

test('fixture: de kale bundel (zoals op de iPhone) geeft dezelfde bytes', () => {
  const sandbox = createContext({})
  runInContext(readCore(), sandbox)
  const bundel = runInContext('globalThis.HootCore', sandbox)
  for (const c of golden) assert.equal(callCase(bundel, c), JSON.stringify(c.output), c.name)
})
