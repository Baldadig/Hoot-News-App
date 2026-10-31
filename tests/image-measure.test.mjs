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
