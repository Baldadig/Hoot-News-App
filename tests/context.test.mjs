import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHash, toHash, rememberLocation, hrefFor, filterSig, positionKey, MAIN } from '../src/lib/context.js'

test('de overslaan-link (#inhoud) verandert de route niet, in geen enkele hoofdbestemming', () => {
  for (const dest of MAIN) {
    const here = parseHash(toHash(dest, dest === 'stroom' ? { onderwerp: 'ai' } : {}))
    assert.deepEqual(parseHash('#inhoud', here), here, dest)
  }
})

test('filters blijven behouden als je via de ondernavigatie teruggaat naar de Stroom', () => {
  let memory = {}
  memory = rememberLocation(memory, parseHash('#/stroom?onderwerp=ai'))
  memory = rememberLocation(memory, parseHash('#/bewaard'))
  assert.equal(hrefFor(memory, 'stroom'), '#/stroom?onderwerp=ai')
  assert.equal(hrefFor(memory, 'bewaard'), '#/bewaard')
  assert.equal(hrefFor(memory, 'editie'), '#/editie')
})

test('een geopend verhaal of een zoekscherm hoort niet bij de onthouden plek', () => {
  let memory = rememberLocation({}, parseHash('#/stroom?bron=nrc&verhaal=s123'))
  assert.equal(hrefFor(memory, 'stroom'), '#/stroom?bron=nrc')
  const before = memory
  memory = rememberLocation(memory, parseHash('#/zoek'))
  assert.equal(memory, before)
})

test('filter wissen wordt ook onthouden', () => {
  let memory = rememberLocation({}, parseHash('#/stroom?onderwerp=ai'))
  memory = rememberLocation(memory, parseHash('#/stroom'))
  assert.equal(hrefFor(memory, 'stroom'), '#/stroom')
})

test('elke filtercombinatie heeft een eigen leespositie', () => {
  assert.equal(positionKey('stroom', {}), 'hoot:pos-stroom')
  assert.notEqual(positionKey('stroom', { onderwerp: 'ai' }), positionKey('stroom', {}))
  assert.notEqual(positionKey('stroom', { onderwerp: 'ai' }), positionKey('stroom', { bron: 'ai' }))
  assert.equal(positionKey('stroom', { onderwerp: 'ai', verhaal: 's1' }), positionKey('stroom', { onderwerp: 'ai' }))
  assert.equal(filterSig({ soort: 'opinie' }), '||opinie|')
  assert.notEqual(positionKey('stroom', { rubriek: 'sport' }), positionKey('stroom', {}))
})

test('lege of kale hash is de Editie', () => {
  assert.equal(parseHash('').path, 'editie')
  assert.equal(parseHash('#/').path, 'editie')
})
