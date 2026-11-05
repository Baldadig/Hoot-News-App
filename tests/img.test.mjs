import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitsLarge, fitsHero, knownWidth, imgProps, avatarUrl } from '../src/lib/img.js'

test('Wired: thumbnail vraagt een kleine variant in plaats van het origineel (1 MB)', () => {
  const p = imgProps('https://media.wired.com/photos/abc/master/pass/2298652701', 'thumb')
  assert.equal(p.src, 'https://media.wired.com/photos/abc/master/w_176,c_limit/2298652701')
  assert.match(p.srcSet, /w_320,c_limit\/2298652701 320w$/)
  // De miniatuur is 96 breed (3:2), smaller op een smalle telefoon — zoals --thumb-w in styles.css.
  assert.equal(p.sizes, '(max-width: 359px) 72px, (max-width: 479px) 84px, 96px')
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

test('Bing-beeld uit de zoekindex, ongemeten: alleen als thumbnail, nooit groot', () => {
  const url = 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=1360&h=765&c=7'
  assert.equal(imgProps(url, 'thumb').src, 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=176&h=176&c=7')
  assert.equal(imgProps(url, 'lead'), null)
  assert.equal(fitsLarge(url), false)
  assert.equal(fitsLarge('https://i.guim.co.uk/a.jpg'), true)
})

test('Bing-beeld gemeten door de server (build 46): groot als het bronbeeld groot genoeg is, nooit groter opgevraagd', async () => {
  const { fitsHero, knownWidth } = await import('../src/lib/img.js')
  const big = 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=700&h=393'
  assert.equal(knownWidth(big), 700)
  assert.equal(fitsLarge(big), true)
  assert.equal(fitsHero(big), true) // The Economist: 700 breed, scherp genoeg voor het hoofdverhaal
  const p = imgProps(big, 'lead')
  assert.equal(p.src, 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=480&h=269')
  assert.match(p.srcSet, /w=700&h=393 700w$/)
  assert.doesNotMatch(p.srcSet, /w=(720|1080|1360)/)
  assert.equal(imgProps(big, 'thumb').src, 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=176&h=176&c=7')
  const small = 'https://www.bing.com/th?id=ONUT.k&pid=News&w=300&h=200'
  assert.equal(fitsLarge(small), false)
  assert.equal(imgProps(small, 'lead'), null)
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

test('NU.nl: het vierkantje van 256 px wordt als hoofdbeeld een scherpe 16:9-versie, zonder uitrekken', () => {
  const url = 'https://images.nu.nl/m/nr1x4qtarbku_sqr256/164/0/851/851/zeven-doden.jpg'
  const lead = imgProps(url, 'lead')
  assert.equal(lead.src, 'https://images.nu.nl/m/nr1x4qtarbku_wd640/0/0/0/0/zeven-doden.jpg')
  assert.match(lead.srcSet, /_wd1280\/0\/0\/0\/0\/zeven-doden\.jpg 1280w$/)
  assert.deepEqual(imgProps(url, 'thumb'), { src: url })
})

test('FD (imgix): het vierkant van 140 uit de feed wordt een beeld op maat; De Morgen zoals de Volkskrant', () => {
  const url = 'https://images.fd.nl/905854-906089.jpeg?fit=crop&crop=faces&auto=format%2Ccompress&q=45&w=140&h=140&fm=jpg&cs=tinysrgb'
  const lead = imgProps(url, 'lead')
  assert.match(lead.srcSet, /images\.fd\.nl\/905854-906089\.jpeg\?auto=format%2Ccompress&q=45&fm=jpg&cs=tinysrgb&w=1360 1360w$/)
  assert.ok(!/[?&](h|fit|crop)=/.test(lead.src), 'geen vierkante uitsnede meer')
  assert.match(imgProps('https://image.demorgen.be/279974483/feature-crop/320/320/afbeelding', 'lead').srcSet, /feature-crop\/1080\/720\/afbeelding 1080w/)
})

test('scherp genoeg voor een groot beeld: bronbreedte ≥ 1,4 × het vak op een retinascherm', async () => {
  const { sourceWidth, sharpEnough } = await import('../src/lib/img.js')
  const meta = (w, h, crop = { l: 0, r: 0, t: 0, b: 0 }) => ({ w, h, crop })
  // Varianten van de uitgever: de grootste variant telt, niet het kleine origineel uit de feed.
  assert.equal(sourceWidth({ image: 'https://image.volkskrant.nl/1/feature-crop/320/320/a', imageMeta: meta(320, 320) }), 1360)
  // Met gemeten randen toont MeasuredImg het origineel: dan telt dat.
  assert.equal(sourceWidth({ image: 'https://images.fd.nl/a.jpeg?w=140&h=140', imageMeta: meta(140, 140, { l: 16, r: 12, t: 0, b: 0 }) }), 140)
  // Geen varianten: de meting. Onbekend: null (dan past het, zoals altijd).
  const ad = { image: 'https://images.ad.nl/x/fit-width/400/a.jpg', imageMeta: meta(400, 267) }
  assert.equal(sourceWidth(ad), 400)
  assert.equal(sourceWidth({ image: 'https://example.org/a.jpg' }), null)
  assert.equal(sharpEnough(ad, 720, 2), false)
  assert.equal(sharpEnough(ad, 358, 1), true)
  // NOS levert hooguit 1024: dat blijft groot op 720, ook op een retinascherm.
  assert.equal(sharpEnough({ image: 'https://images.cdn.nos.nl/8/D/x/4x209x2992x1683-1024x576.webp' }, 720, 2), true)
  assert.equal(sharpEnough({ image: 'https://example.org/b.jpg', imageMeta: meta(840, 472) }, 720, 2), false)
  assert.equal(sharpEnough({ image: 'https://example.org/b.jpg', imageMeta: meta(840, 472) }, 720, 1), true)
})
