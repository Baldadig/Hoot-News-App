import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imgProps, avatarUrl } from '../src/lib/img.js'

test('Wired: thumbnail vraagt een kleine variant in plaats van het origineel (1 MB)', () => {
  const p = imgProps('https://media.wired.com/photos/abc/master/pass/2298652701', 'thumb')
  assert.equal(p.src, 'https://media.wired.com/photos/abc/master/w_176,c_limit/2298652701')
  assert.match(p.srcSet, /w_320,c_limit\/2298652701 320w$/)
  assert.equal(p.sizes, '88px')
})

test('NYT: vierkant van 320 px als thumbnail, 3:2 als hoofdbeeld', () => {
  const url = 'https://static01.nyt.com/images/2026/10/09/x/x-mediumSquareAt3X.jpg'
  assert.deepEqual(imgProps(url, 'thumb'), { src: 'https://static01.nyt.com/images/2026/10/09/x/x-square320.jpg' })
  assert.match(imgProps(url, 'lead').srcSet, /threeByTwoSmallAt2X\.jpg 600w, .*threeByTwoMediumAt2X\.jpg 1500w/)
})

test('The Verge: kapotte &#038; in de feed-URL verdwijnt, breedte wordt meegegeven', () => {
  const p = imgProps('https://platform.theverge.com/wp-content/uploads/a.jpg?quality=90&#038;strip=all&#038;crop=0,0,100,100', 'thumb')
  assert.equal(p.src, 'https://platform.theverge.com/wp-content/uploads/a.jpg?quality=80&strip=all&w=176')
})

test('de Volkskrant: hoofdbeeld groter dan de 320 px uit de feed, thumbnail kleiner', () => {
  const url = 'https://image.volkskrant.nl/278064774/feature-crop/320/320/afbeelding'
  assert.equal(imgProps(url, 'thumb').src, 'https://image.volkskrant.nl/278064774/feature-crop/176/176/afbeelding')
  assert.match(imgProps(url, 'lead').srcSet, /feature-crop\/1080\/720\/afbeelding 1080w/)
})

test('NOS: vaste formaten, alleen vanaf het grote feed-beeld', () => {
  const big = 'https://images.cdn.nos.nl/8/D/x/4x209x2992x1683-1024x576.webp'
  assert.deepEqual(imgProps(big, 'thumb'), { src: 'https://images.cdn.nos.nl/8/D/x/4x209x2992x1683-256x144.webp' })
  assert.match(imgProps(big, 'lead').srcSet, /-512x288\.webp 512w, .*-768x432\.webp 768w, .*-1024x576\.webp 1024w/)
  const small = 'https://images.cdn.nos.nl/8/6/x/0x0x336x189-336x189.webp'
  assert.deepEqual(imgProps(small, 'thumb'), { src: small })
})

test('onbekende of ondertekende beeld-URL’s blijven ongemoeid', () => {
  for (const url of ['https://images.nrc.nl/sig=/1280x/filters:no_upscale()/s3/x.jpg', 'https://i.guim.co.uk/img/x.jpg?width=140&s=abc', 'https://static01.nyt.com/images/x-superJumbo.jpg', 'geen url']) {
    assert.deepEqual(imgProps(url, 'thumb'), { src: url })
    assert.deepEqual(imgProps(url, 'lead'), { src: url })
  }
  assert.deepEqual(imgProps(null), { src: null })
})

test('Bluesky-profielfoto: kleine variant; andere avatars ongemoeid', () => {
  assert.equal(avatarUrl('https://cdn.bsky.app/img/avatar/plain/did:plc:x/bafk'), 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:x/bafk')
  assert.equal(avatarUrl('https://unavatar.io/x/nos'), 'https://unavatar.io/x/nos')
  assert.equal(avatarUrl(null), null)
})
