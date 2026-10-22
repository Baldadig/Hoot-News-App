import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitsLarge, fitsHero, knownWidth, imgProps, avatarUrl } from '../src/lib/img.js'

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

test('onbekende beeld-URL’s blijven ongemoeid; ondertekende gaan ongeschonden naar de CDN', () => {
  for (const url of ['https://example.org/x.jpg', 'https://static01.nyt.com/images/x-superJumbo.jpg', 'geen url']) {
    assert.deepEqual(imgProps(url, 'thumb'), { src: url })
    assert.deepEqual(imgProps(url, 'lead'), { src: url })
  }
  for (const url of ['https://images.nrc.nl/sig=/1280x/filters:no_upscale()/s3/x.jpg', 'https://i.guim.co.uk/img/x.jpg?width=140&s=abc']) {
    assert.equal(decodeURIComponent(imgProps(url, 'thumb').src.match(/url=([^&]+)/)[1]), url)
  }
  assert.deepEqual(imgProps(null), { src: null })
})

test('Bluesky-profielfoto: kleine variant; andere avatars ongemoeid', () => {
  assert.equal(avatarUrl('https://cdn.bsky.app/img/avatar/plain/did:plc:x/bafk'), 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:x/bafk')
  assert.equal(avatarUrl('https://unavatar.io/x/nos'), 'https://unavatar.io/x/nos')
  assert.equal(avatarUrl(null), null)
})

test('Bing-beeld uit de zoekindex: alleen als thumbnail, nooit groot', () => {
  const url = 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=1360&h=765&c=7'
  assert.equal(imgProps(url, 'thumb').src, 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=176&h=176&c=7')
  assert.equal(imgProps(url, 'lead'), null)
  assert.equal(fitsLarge(url), false)
  assert.equal(fitsLarge('https://i.guim.co.uk/a.jpg'), true)
})

test('bronnen zonder eigen formaten gaan via de beeld-CDN, met het origineel als terugval', () => {
  const url = 'https://images.nrc.nl/abc=/1280x/filters:no_upscale()/s3/a.jpg'
  const p = imgProps(url, 'lead')
  assert.equal(p.fallback, url)
  assert.match(p.src, /^\/\.netlify\/images\?url=https%3A%2F%2Fimages\.nrc\.nl%2F.+&w=480$/)
  assert.match(p.srcSet, /&w=1360 1360w$/)
  assert.equal(imgProps('https://example.org/a.jpg', 'lead').fallback, undefined)
})

test('elke CDN-bron staat ook in netlify.toml (anders weigert Netlify het beeld)', async () => {
  const { readFileSync } = await import('node:fs')
  const { CDN_HOSTS } = await import('../src/lib/img.js')
  const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')
  for (const host of CDN_HOSTS) assert.ok(toml.includes(`'https://${host.replaceAll('.', '\\.')}/.*'`), host)
})

test('The Guardian: de breedte staat in het (getekende) adres; 140 px is nooit groot, 460 niet als hoofdverhaal', () => {
  const g = (w) => `https://i.guim.co.uk/img/media/a/master/1.jpg?width=${w}&quality=85&auto=format&fit=max&s=abc`
  assert.equal(knownWidth(g(140)), 140)
  assert.equal(fitsLarge(g(140)), false)
  assert.equal(fitsLarge(g(460)), true)
  assert.equal(fitsHero(g(460)), false)
  assert.equal(fitsHero(g(1200)), true)
  assert.equal(fitsHero('https://images.cdn.nos.nl/a-1024x576.webp'), true) // onbekend = goed
  assert.equal(fitsHero(null), false)
})
