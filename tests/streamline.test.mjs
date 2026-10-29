import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rubriekRij, actieveRubriek, kiesRubriek, rijBronnen, inRijVolgorde, stapel, keuzeLabel, joinNL, plek, legeRegel, stapelTeksten, zeg, bezier, STEP_OPEN, STEP, PEEK, SMALL, LOGO } from '../src/lib/streamline.js'

const sigs = (rij) => rij.items.map((r) => r.sig)

test('rubrieken: zonder eigen onderwerpen de acht rubrieken, na Alles (en de bubbel) de kolomlijn', () => {
  const rij = rubriekRij({ hasBubble: true })
  assert.deepEqual(rij.items.map((r) => r.label), ['Alles', 'Buiten je bubbel', 'Politiek', 'Binnenland', 'Wereld', 'Economie', 'Tech', 'Wetenschap', 'Cultuur', 'Sport'])
  assert.equal(rij.sep, 2)
  assert.equal(rij.items[0].key, null)
  assert.equal(rij.items[2].key, 'rubriek')
  assert.equal(rubriekRij({}).sep, 1) // geen bubbel: alleen Alles links van de lijn
})

test('rubrieken: volg je onderwerpen, dan die (gepinde eerst) als onderwerp', () => {
  const rij = rubriekRij({ mine: ['ai', 'nederland', 'oekraine'], pinned: ['oekraine'] })
  assert.deepEqual(sigs(rij), ['', 'onderwerp=oekraine', 'onderwerp=ai', 'onderwerp=nederland'])
  assert.equal(rij.items[1].label, 'Oekraïne & Rusland')
})

test('een actief filter dat niet in de rij staat, komt direct na de kolomlijn', () => {
  const rij = rubriekRij({ hasBubble: true, filters: { onderwerp: 'ai' } })
  assert.deepEqual(sigs(rij).slice(0, 4), ['', 'onderwerp=bubbel', 'onderwerp=ai', 'rubriek=politiek'])
  assert.equal(rij.items[2].label, 'AI')
  assert.equal(rij.sep, 2)
  // de rubriek 'tech' is iets anders dan het onderwerp 'tech' (Big Tech)
  const mijn = rubriekRij({ mine: ['tech'], filters: { rubriek: 'tech' } })
  assert.deepEqual(sigs(mijn), ['', 'rubriek=tech', 'onderwerp=tech'])
  // al in de rij: niets erbij
  assert.equal(rubriekRij({ filters: { rubriek: 'sport' } }).items.length, 9)
  // de bubbel zonder bubbel (oude link): toch zichtbaar, links van de lijn
  assert.deepEqual(sigs(rubriekRij({ filters: { onderwerp: 'bubbel' } })).slice(0, 2), ['', 'onderwerp=bubbel'])
  // onbekend: de id als naam
  assert.equal(rubriekRij({ filters: { onderwerp: 'xyz' } }).items[1].label, 'xyz')
})

test('actieve rubriek en kiezen: onderwerp en rubriek sluiten elkaar uit, de rest blijft', () => {
  assert.equal(actieveRubriek({}), '')
  assert.equal(actieveRubriek({ rubriek: 'wereld' }), 'rubriek=wereld')
  assert.equal(actieveRubriek({ onderwerp: 'ai', rubriek: 'tech' }), 'onderwerp=ai')
  const f = { bron: 'nos', soort: 'opinie', onderwerp: 'ai', rubriek: '' }
  assert.deepEqual(kiesRubriek(f, { key: 'rubriek', id: 'wereld' }), { bron: 'nos', soort: 'opinie', onderwerp: '', rubriek: 'wereld' })
  assert.deepEqual(kiesRubriek(f, { key: null, id: 'alles' }), { bron: 'nos', soort: 'opinie', onderwerp: '', rubriek: '' })
  assert.deepEqual(kiesRubriek({}, { key: 'onderwerp', id: 'bubbel' }), { onderwerp: 'bubbel', rubriek: '' })
})

test('bronnen: gekozen bronnen buiten je rij komen achteraan, in de volgorde van de keuze', () => {
  const strip = [{ id: 'nos', name: 'NOS' }, { id: 'nrc', name: 'NRC' }]
  const byId = new Map([['bsky:a', { id: 'bsky:a', name: 'Anna' }]])
  const rij = rijBronnen(strip, ['nrc', 'bsky:a', 'weg', 'bsky:a'], byId)
  assert.deepEqual(rij.map((s) => s.id), ['nos', 'nrc', 'bsky:a', 'weg'])
  assert.equal(rij[3].name, 'weg')
  assert.deepEqual(inRijVolgorde(['weg', 'nrc', 'nos'], rij), ['nos', 'nrc', 'weg'])
  assert.deepEqual(inRijVolgorde(['x', 'nos'], strip), ['nos', 'x'])
})

test('de stapel: de gekozen bronnen bovenop, anders de eerste drie van de rij', () => {
  const rij = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }))
  assert.deepEqual(stapel([], rij), ['a', 'b', 'c'])
  assert.deepEqual(stapel(['e', 'b'], rij), ['b', 'e'])
  assert.deepEqual(stapel(['e', 'd', 'c', 'b'], rij), ['b', 'c', 'd'])
  assert.deepEqual(stapel([], rij.slice(0, 2)), ['a', 'b'])
})

test('namen: "NOS" of "3 bronnen", en een Nederlandse opsomming', () => {
  assert.equal(keuzeLabel([]), '')
  assert.equal(keuzeLabel(['NOS']), 'NOS')
  assert.equal(keuzeLabel(['NOS', 'NRC', 'de Volkskrant']), '3 bronnen')
  assert.equal(joinNL(['NOS']), 'NOS')
  assert.equal(joinNL(['NOS', 'NRC']), 'NOS en NRC')
  assert.equal(joinNL(['NOS', 'NRC', 'de Volkskrant']), 'NOS, NRC en de Volkskrant')
})

test('plek: dicht in de stapel (stap 16, met de muis 20), de rest erachter', () => {
  const sc = SMALL / LOGO
  assert.deepEqual(plek({ i: 0, k: -1, n: 3, all: true }), { x: 0, s: sc, o: 0 })
  // het voorste logo (k = 0) schuift helemaal naar rechts, op de plek van Alle bronnen
  assert.deepEqual(plek({ i: 1, k: 0, n: 3 }), { x: STEP_OPEN, s: sc, o: 1 })
  assert.deepEqual(plek({ i: 3, k: 2, n: 3 }), { x: 3 * STEP_OPEN - 2 * STEP, s: sc, o: 1 })
  assert.deepEqual(plek({ i: 3, k: 2, n: 3, peek: true }), { x: 3 * STEP_OPEN - 2 * PEEK, s: sc, o: 1 })
  // niet in de stapel: achter het achterste logo, kleiner en onzichtbaar
  const weg = plek({ i: 7, k: -1, n: 3 })
  assert.equal(weg.x, 7 * STEP_OPEN - 2 * STEP)
  assert.equal(weg.o, 0)
  assert.ok(weg.s < sc)
})

test('een lege lijst: één regel met wie, waar en welke soort', () => {
  assert.equal(legeRegel({ namen: ['NOS'], rubriek: 'Wereld' }), 'Nog niets van NOS in Wereld.')
  assert.equal(legeRegel({ namen: ['NOS', 'NRC', 'de Volkskrant'] }), 'Nog niets van NOS, NRC en de Volkskrant vandaag.')
  assert.equal(legeRegel({ namen: ['NOS'], soort: 'opinie' }), 'Nog geen opinie van NOS vandaag.')
  assert.equal(legeRegel({ rubriek: 'Tech', soort: 'artikelen' }), 'Nog geen artikelen in Tech.')
  assert.equal(legeRegel({ rubriek: 'Buiten je bubbel' }), 'Nog niets buiten je bubbel.')
  assert.equal(legeRegel({}), 'Nog niets vandaag.')
})

test('wat de stapel zegt', () => {
  assert.equal(stapelTeksten([]).label, 'Bronnen kiezen, nu: alle bronnen')
  assert.equal(stapelTeksten(['NOS', 'NRC']).label, 'Bronnen kiezen, nu: NOS en NRC')
  assert.equal(stapelTeksten([]).hint, 'Klapt de rij dicht.')
  assert.equal(stapelTeksten(['NOS']).hint, 'Zet de keuze terug op alle bronnen.')
  assert.equal(zeg.bron('NOS', true, ['NOS', 'NRC']), 'NOS aan. Nu: NOS en NRC.')
  assert.equal(zeg.bron('NOS', false, []), 'NOS uit. Alle bronnen.')
  assert.equal(zeg.dicht(['NOS']), 'Rij dicht. Bronnen: NOS.')
  assert.equal(zeg.dicht([]), 'Rij dicht. Alle bronnen.')
  assert.equal(zeg.rubriek('Wereld'), 'Rubriek Wereld.')
})

test('de curve begint op 0, eindigt op 1, loopt alleen op en is snel aan het begin', () => {
  const e = bezier(0.2, 0.8, 0.2, 1)
  assert.equal(e(0), 0)
  assert.ok(Math.abs(e(1) - 1) < 1e-6)
  let last = 0
  for (let x = 0.05; x <= 1; x += 0.05) {
    const y = e(x)
    assert.ok(y >= last - 1e-9)
    last = y
  }
  assert.ok(e(0.25) > 0.6) // ease-out: na een kwart van de tijd al ruim over de helft
})
