import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePrefs, DEFAULT_PREFS } from '../src/lib/prefs.js'

test('ontbrekende instellingen krijgen een standaard; bestaande blijven', () => {
  const p = normalizePrefs({ muted: ['nos'], layout: 'krant' })
  assert.equal(p.layout, 'krant')
  assert.deepEqual(p.muted, ['nos'])
  assert.equal(p.preview, 2)
  assert.equal(p.bluesky, false)
  assert.equal(normalizePrefs({ instapaper: true, voice: 'fenna' }).voice, undefined)
  assert.equal(p.textSize, 'normaal')
})

test('oude "Kort/Volledig" wordt regels; onzin valt terug op de standaard', () => {
  assert.equal(normalizePrefs({ density: 'volledig' }).preview, 'alles')
  assert.equal(normalizePrefs({ density: 'kort' }).preview, 2)
  assert.equal(normalizePrefs({ preview: 9, textSize: 'xxl', images: 'soms' }).preview, 2)
  assert.equal(normalizePrefs(null).textSize, DEFAULT_PREFS.textSize)
})
