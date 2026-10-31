import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { wholeSentences, introMax, lineFit } from '../shared/zinnen.mjs'

// Intro's in hele zinnen (T2, D2). De gevallen staan in een fixture die iOS ook leest (I4), zodat
// web en app precies hetzelfde knippen. max null = Infinity ('alles'); zonder rek is rek = max.
const fx = JSON.parse(readFileSync(new URL('./fixtures/zinnen.json', import.meta.url), 'utf8'))
const inf = (v) => (v == null ? Infinity : v)

for (const c of fx.zinnen) {
  test(`wholeSentences: ${c.naam}`, () => {
    const max = inf(c.max)
    const rek = c.rek ?? max
    const out = wholeSentences(c.invoer, max, rek)
    assert.equal(out, c.verwacht)
    assert.ok(!/(…|\.\.\.)$/.test(out), 'Hoot eindigt nooit met een beletselteken')
    assert.ok(out.length <= rek, 'binnen rek')
  })
}

test('introMax: max op lines regels, rek op lines + 1, in de gemeten kolom', () => {
  for (const c of fx.introMax) {
    const r = introMax(c.lines, { width: c.width, font: c.font })
    assert.deepEqual({ max: r.max, rek: r.rek }, { max: inf(c.verwacht.max), rek: inf(c.verwacht.rek) }, `${c.lines} ${c.width} ${c.font}`)
  }
})

test('lineFit: grotere letter of smallere kolom, minder tekens', () => {
  assert.ok(lineFit(2, { width: 247, font: 18 }) < lineFit(2, { width: 247, font: 15 }))
  assert.ok(lineFit(2, { width: 200, font: 15 }) < lineFit(2, { width: 247, font: 15 }))
  assert.equal(lineFit(1, { width: 10, font: 15 }), 0)
})

test('wholeSentences: null en undefined zijn leeg', () => {
  assert.equal(wholeSentences(null, 130), '')
  assert.equal(wholeSentences(undefined), '')
})

// De server (preview in netlify/lib/text.mjs) knipt met hetzelfde zinseinde: een letterwoord aan
// het eind van een zin telt, een initiaal niet.
test('server preview: letterwoord is een zinseinde, initiaal niet', async () => {
  const { preview } = await import('../netlify/lib/text.mjs')
  const gvvv = 'Feyenoord gaat het in de achtste finale van de KNVB-beker opnemen tegen amateurclub GVVV. De wedstrijd wordt op 17 december in het sportpark van Veenendaal gespeeld, voor een uitverkocht huis van vijfduizend man.'
  assert.equal(preview(gvvv), 'Feyenoord gaat het in de achtste finale van de KNVB-beker opnemen tegen amateurclub GVVV.')
  const jan = 'Jan G. uit Tilburg is opgepakt voor de brand in de binnenstad van vorige week, waarbij drie panden verloren gingen. De politie zoekt nog getuigen die iets hebben gezien in de nacht van zaterdag op zondag.'
  assert.equal(preview(jan), 'Jan G. uit Tilburg is opgepakt voor de brand in de binnenstad van vorige week, waarbij drie panden verloren gingen.')
})
