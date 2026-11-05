import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { measureImage, loadImageMeasure, measureFeedImages, MAX_IMAGE_BYTES } from '../netlify/lib/image-measure.mjs'
import { portraitImage, cropStyle } from '../src/lib/image-meta.js'
const fixture = name => readFile(new URL(`./fixtures/images/${name}`, import.meta.url))
test('A1: witte zijbalken, zwarte letterbox, staand en gewoon beeld', async () => {
  for (const [file, crop, ratio] of [
    ['white-sides.png', { l: 24, r: 16, t: 0, b: 0 }, 120 / 100],
    ['black-letterbox.png', { l: 0, r: 0, t: 16, b: 24 }, 160 / 60],
    ['portrait.png', { l: 0, r: 0, t: 0, b: 0 }, 60 / 100],
    ['normal.png', { l: 0, r: 0, t: 0, b: 0 }, 160 / 100],
  ]) {
    const m = await measureImage(await fixture(file))
    assert.deepEqual(m.crop, crop, file)
    assert.equal(m.ratio, ratio, file)
    assert.equal(portraitImage({ imageMeta: m }), ratio < .8)
    assert.ok(cropStyle({ imageMeta: m })['--crop-inset'])
  }
})
test('A1: kapot, te veel pixels en te veel bytes geven geen meting', async () => {
  assert.equal(await measureImage(await fixture('broken.png')), null)
  assert.equal(await measureImage(await fixture('too-large.png')), null)
  assert.equal(await measureImage(Buffer.alloc(MAX_IMAGE_BYTES + 1)), null)
})
test('A1: te grote download, timeout en HTTP-fout vallen stil terug', async () => {
  assert.equal(await loadImageMeasure('https://example.com/a', { fetcher: async () => new Response('', { headers: { 'content-type': 'image/png', 'content-length': MAX_IMAGE_BYTES + 1 } }) }), null)
  assert.equal(await loadImageMeasure('https://example.com/a', { fetcher: async () => { throw new Error('timeout') } }), null)
  assert.equal(await loadImageMeasure('https://example.com/a', { fetcher: async () => new Response('', { status: 404 }) }), null)
  let cancelled = false
  const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(MAX_IMAGE_BYTES + 1)) }, cancel() { cancelled = true } })
  assert.equal(await loadImageMeasure('https://example.com/a', { fetcher: async () => new Response(stream, { headers: { 'content-type': 'image/png' } }) }), null)
  assert.equal(cancelled, true)
})
test('A1: opslag en feed bewaren dezelfde meting en meten dubbele URL maar één keer', async () => {
  let cache, calls = 0
  const m = await measureImage(await fixture('white-sides.png'))
  const items = [1, 2].map(id => ({ id, kind: 'article', image: 'https://example.com/a.png' }))
  const options = { load: async () => { calls++; return m }, get: async () => cache, set: async (_, value) => { cache = value } }
  await measureFeedImages(items, 1000, options)
  await measureFeedImages(items, 2000, options)
  assert.equal(calls, 1)
  assert.deepEqual(items[0].imageMeta, m)
  assert.deepEqual(items[1].imageMeta, m)
})
test('A1: ontbrekende en ongeldige metadata houden de oude weergave', () => {
  for (const imageMeta of [null, {}, { w: 10, h: 10, crop: { l: 20, r: 0, t: 0, b: 0 } }]) {
    assert.equal(portraitImage({ imageMeta }), false)
    assert.equal(cropStyle({ imageMeta }), undefined)
  }
})
test('B11: de Stroom-rijen (tijdlijn en krant) en de Editie gebruiken dezelfde meting als de lead', async () => {
  const items = await readFile(new URL('../src/components/Items.jsx', import.meta.url), 'utf8')
  const img = await readFile(new URL('../src/components/Img.jsx', import.meta.url), 'utf8')
  assert.match(items, /media media--tl\$\{imageMeta\(item\) \? ' media--measured' : ''\}`\} style=\{cropStyle\(item\)\}>\s*\{\(onFail\) => <MeasuredImg item=\{item\} kind="lead"/)
  assert.match(items, /thumb\$\{imageMeta\(item\) \? ' media--measured' : ''\}`\} style=\{cropStyle\(item\)\}>[\s\S]*?<MeasuredImg item=\{item\} width="96"/)
  assert.match(items, /media--lead[\s\S]*?<MeasuredImg item=\{item\} kind="lead"/)
  // Zonder meting, of zonder randen en met varianten van de uitgever: de Img op maat (poetsbeurt 5 november).
  assert.match(img, /if \(!measuredOriginal\(item, kind\)\) return <Img/)
})
test('B11: NOS-beeld met witte zijbalken in een 2:1-vak: balken vallen eruit, beeld vult het vak', () => {
  // Echte meting uit de live feed: 1024x576 met 223 px wit links en rechts.
  const item = { imageMeta: { w: 1024, h: 576, crop: { l: 223, r: 223, t: 0, b: 0 }, ratio: 578 / 576 } }
  const s = cropStyle(item)
  assert.equal(s['--crop-inset'], `0% ${223 / 1024 * 100}% 0% ${223 / 1024 * 100}%`)
  // In een 2:1-vak (400x200) bepaalt de breedte de schaal: de inhoud (578 breed) wordt 400 breed,
  // het hele beeld dus 400*1024/578 breed; beide balken liggen buiten het vak.
  const box = { w: 400, h: 200 }, { w, h, crop: c } = item.imageMeta
  const scale = Math.max(box.w / (w - c.l - c.r), box.h / (h - c.t - c.b))
  const x = (box.w - w * scale) / 2 + (c.r - c.l) * scale / 2
  assert.ok(Math.abs(x + c.l * scale) < 1e-9 && Math.abs(x + (w - c.r) * scale - box.w) < 1e-9, 'inhoud valt precies op de vakranden')
  assert.ok(h * scale >= box.h, 'hoogte vult het vak (cover)')
})
test('B11: elke Stroom-afbeelding wordt gemeten (tot 48 nieuwe per bouw), met de bestaande cache', async () => {
  let cache, calls = 0
  const items = Array.from({ length: 40 }, (_, i) => ({ id: i, kind: 'article', image: `https://example.com/${i}.png` }))
  const value = { w: 100, h: 50, crop: { l: 10, r: 10, t: 0, b: 0 }, ratio: 2 }
  const options = { load: async () => { calls++; return value }, get: async () => cache, set: async (_, v) => { cache = v } }
  await measureFeedImages(items, 1000, options)
  assert.equal(calls, 40)
  assert.ok(items.every(i => i.imageMeta))
  await measureFeedImages(items, 2000, options)
  assert.equal(calls, 40)
})
