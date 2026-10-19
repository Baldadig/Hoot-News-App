import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ssml, editionParts } from '../netlify/lib/tts.mjs'

test('SSML: Nederlandse neurale stem, tekens veilig, pauze tussen de stukken', () => {
  const x = ssml(['Kop & kern <1>', 'Twee'], 'maarten')
  assert.match(x, /<voice name="nl-NL-MaartenNeural">/)
  assert.match(x, /Kop &amp; kern &lt;1&gt;/)
  assert.match(x, /<\/s><break time="700ms"\/><s>Twee/)
  assert.match(ssml(['x'], 'bestaat-niet'), /nl-NL-FennaNeural/)
})

test('de tekst van een bewaarde editie: kop, overzicht, dan per verhaal kop, kern en bron', () => {
  const stored = {
    id: '2026-10-19-middag',
    entries: [{ kind: 'story', id: 's1', leadId: 'a' }, { kind: 'item', id: 'c' }],
    stories: [{ id: 's1', leadId: 'b', itemIds: ['a', 'b'] }],
    items: [{ id: 'a', title: 'Kop A', summary: 'Kern A.', sourceName: 'NOS' }, { id: 'b', title: 'Kop B', sourceName: 'NYT' }, { id: 'c', title: 'Kop C', sourceName: 'NRC' }],
    brief: { text: 'Alinea een.\n\nAlinea twee.' },
  }
  const p = editionParts(stored, 'middag')
  assert.equal(p[0], 'Hoot. De middageditie van maandag 19 oktober. Twee verhalen.')
  assert.deepEqual(p.slice(1, 5), ['Eerst het overzicht.', 'Alinea een.', 'Alinea twee.', 'En dan de verhalen.'])
  assert.equal(p[5], 'Eén. Kop A. Kern A. Bron: NOS.')
  assert.equal(p[6], 'Twee. Kop C. Bron: NRC.')
})
