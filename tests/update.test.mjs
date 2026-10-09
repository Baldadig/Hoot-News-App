import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldPrompt, onControllerChange } from '../src/lib/update.js'

test('melding alleen als er een nieuwe versie wacht op een pagina die al bediend werd', () => {
  assert.equal(shouldPrompt({ waiting: true, hasController: true }), true)
  assert.equal(shouldPrompt({ waiting: true, hasController: false }), false) // eerste installatie
  assert.equal(shouldPrompt({ waiting: false, hasController: true }), false)
})

test('weggeklikt blijft weg; een ander tabblad dat al vernieuwde geeft wél een melding', () => {
  assert.equal(shouldPrompt({ waiting: true, hasController: true, dismissed: true }), false)
  assert.equal(shouldPrompt({ waiting: false, hasController: true, changedElsewhere: true }), true)
})

test('herladen gebeurt alleen op verzoek, en maar één keer (geen lus)', () => {
  assert.equal(onControllerChange({ hadController: true, requested: true, reloading: false }), 'reload')
  assert.equal(onControllerChange({ hadController: true, requested: true, reloading: true }), 'ignore')
  assert.equal(onControllerChange({ hadController: true, requested: false, reloading: false }), 'prompt') // nooit ongevraagd herladen
  assert.equal(onControllerChange({ hadController: false, requested: false, reloading: false }), 'ignore') // eerste installatie
})
