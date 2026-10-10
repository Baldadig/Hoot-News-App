import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePrefs, DEFAULT_PREFS } from '../src/lib/prefs.js'
import { bulletinText } from '../src/lib/speech.js'

test('ontbrekende instellingen krijgen een standaard; bestaande blijven', () => {
  const p = normalizePrefs({ muted: ['nos'], layout: 'krant' })
  assert.equal(p.layout, 'krant')
  assert.deepEqual(p.muted, ['nos'])
  assert.equal(p.preview, 2)
  assert.equal(p.instapaper, true)
  assert.equal(p.textSize, 'normaal')
})

test('oude "Kort/Volledig" wordt regels; onzin valt terug op de standaard', () => {
  assert.equal(normalizePrefs({ density: 'volledig' }).preview, 'alles')
  assert.equal(normalizePrefs({ density: 'kort' }).preview, 2)
  assert.equal(normalizePrefs({ preview: 9, textSize: 'xxl', images: 'soms' }).preview, 2)
  assert.equal(normalizePrefs(null).textSize, DEFAULT_PREFS.textSize)
})

test('het bulletin leest kop, kern en bron per verhaal, in stukken', () => {
  const parts = bulletinText({ slot: 'ochtend', date: 'vrijdag 10 oktober', rows: [{ title: 'Pillay  wint', summary: 'De rechter…', sourceName: 'NOS' }, { title: 'Tweede', sourceName: 'NRC' }] })
  assert.equal(parts[0], 'Hoot. De ochtendeditie van vrijdag 10 oktober. Twee verhalen.')
  assert.equal(parts[1], 'Eén. Pillay wint. De rechter. Bron: NOS.')
  assert.equal(parts[2], 'Twee. Tweede. Bron: NRC.')
  assert.equal(parts.length, 4)
})
