import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePrefs, DEFAULT_PREFS } from '../src/lib/prefs.js'

test('ontbrekende instellingen krijgen een standaard; bestaande blijven', () => {
  const p = normalizePrefs({ muted: ['nos'], layout: 'krant' })
  assert.equal(p.layout, 'krant')
  assert.deepEqual(p.muted, ['nos'])
  assert.equal(p.preview, 3) // build 46: standaard 3 regels intro
  assert.equal(p.bluesky, false)
  assert.equal(normalizePrefs({ instapaper: true, voice: 'fenna' }).voice, undefined)
  assert.equal(p.textSize, 'normaal')
})

test('oude "Kort/Volledig" wordt regels; onzin valt terug op de standaard', () => {
  assert.equal(normalizePrefs({ density: 'volledig' }).preview, 'alles')
  assert.equal(normalizePrefs({ density: 'kort' }).preview, 3)
  assert.equal(normalizePrefs({ preview: 9, textSize: 'xxl', images: 'soms' }).preview, 3)
  assert.equal(normalizePrefs(null).textSize, DEFAULT_PREFS.textSize)
})

test('regels intro (build 46): oude standaard 2 wordt 3, een nieuwe keuze geldt zoals hij is', () => {
  assert.equal(normalizePrefs({ preview: 2 }).preview, 3) // de oude standaard, ook door de app meegestuurd
  assert.equal(normalizePrefs({ preview: 1 }).preview, 1)
  assert.equal(normalizePrefs({ preview: 'alles' }).preview, 'alles')
  assert.equal(normalizePrefs({ preview: 3, regels: 2 }).preview, 2) // bewust gekozen
  assert.equal(normalizePrefs({ preview: 2, regels: 2 }).preview, 2)
  assert.equal(normalizePrefs({ regels: 7, preview: 1 }).preview, 1)
})
