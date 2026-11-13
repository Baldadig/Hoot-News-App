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

test('NU.nl: het vierkantje van 256 px wordt als hoofdbeeld een 16:9-uitsnede binnen dat vierkant, zonder uitrekken', () => {
  const url = 'https://images.nu.nl/m/nr1x4qtarbku_sqr256/164/0/851/851/zeven-doden.jpg'
  const lead = imgProps(url, 'lead')
  // 851 breed, 479 hoog (16:9), verticaal midden in het vierkant: 0 + (851 - 479) / 2 = 186.
  assert.equal(lead.src, 'https://images.nu.nl/m/nr1x4qtarbku_wd640/164/186/851/479/zeven-doden.jpg')
  assert.match(lead.srcSet, /_wd1280\/164\/186\/851\/479\/zeven-doden\.jpg 1280w$/)
  assert.ok(!/\/0\/0\/0\/0\//.test(lead.srcSet), 'nooit 0/0/0/0: dan perst NU.nl het hele beeld in 16:9')
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
  // 400 breed is te smal voor een groot beeld, ook op een scherm zonder retina (shared/beeld.mjs: 600).
  assert.equal(sharpEnough(ad, 358, 1), false)
  // NOS levert hooguit 1024: dat blijft groot op 720, ook op een retinascherm.
  assert.equal(sharpEnough({ image: 'https://images.cdn.nos.nl/8/D/x/4x209x2992x1683-1024x576.webp' }, 720, 2), true)
  assert.equal(sharpEnough({ image: 'https://example.org/b.jpg', imageMeta: meta(840, 472) }, 720, 2), false)
  assert.equal(sharpEnough({ image: 'https://example.org/b.jpg', imageMeta: meta(840, 472) }, 720, 1), true)
})

test('DPG: Het Parool en Trouw krijgen net als de Volkskrant het grote beeld van de beeldserver (feature-crop en roi)', async () => {
  const { sourceWidth, measuredOriginal, sharpEnough, DPG_HOSTS } = await import('../src/lib/img.js')
  const { readFileSync } = await import('node:fs')
  const meta = { w: 320, h: 320, crop: { l: 0, r: 0, t: 0, b: 0 } }
  for (const host of ['image.parool.nl', 'image.trouw.nl']) {
    const url = `https://${host}/280236357/feature-crop/320/320/afbeelding`
    assert.equal(imgProps(url, 'thumb').src, `https://${host}/280236357/feature-crop/176/176/afbeelding`)
    assert.match(imgProps(url, 'thumb').srcSet, /feature-crop\/320\/320\/afbeelding 320w$/)
    assert.match(imgProps(url, 'lead').srcSet, /feature-crop\/1080\/720\/afbeelding 1080w, .*feature-crop\/1360\/907\/afbeelding 1360w$/)
    // De server mat het vierkant van 320 uit de feed; we tonen de variant, dus die telt (niet klein rechts).
    const item = { image: url, imageMeta: meta }
    assert.equal(measuredOriginal(item, 'lead'), false)
    assert.equal(sourceWidth(item), 1360)
    assert.equal(sharpEnough(item, 358, 3), true)
    assert.equal(sharpEnough(item, 720, 2), true)
  }
  // roi (een uitsnede rond een brandpunt): de maat verandert, het brandpunt en de naam blijven.
  const roi = 'https://image.parool.nl/280216597/roi/320/320/0.295181/0.317843/afbeelding'
  assert.equal(imgProps(roi, 'thumb').src, 'https://image.parool.nl/280216597/roi/176/176/0.295181/0.317843/afbeelding')
  assert.match(imgProps(roi, 'lead').srcSet, /roi\/1360\/907\/0\.295181\/0\.317843\/afbeelding 1360w$/)
  assert.equal(sourceWidth({ image: roi, imageMeta: meta }), 1360)
  // Met gemeten randen blijft het origineel (en de meting) leidend, zoals bij elke bron.
  assert.equal(sourceWidth({ image: roi, imageMeta: { ...meta, crop: { l: 0, r: 0, t: 20, b: 20 } } }), 320)
  // AD en de regionale titels: ondertekende adressen, een andere maat geeft 403. Die blijven ongemoeid.
  const ad = 'https://images.ad.nl/NWY0ODcxOTZjZGU1YmEwMjc0ZTAvZGlvLzI3NDMwMzI5MC9maXQtd2lkdGgvNDAw/a'
  assert.deepEqual(imgProps(ad, 'thumb'), { src: ad })
  // Eén lijst voor web en app.
  const swift = readFileSync(new URL('../ios/Hoot/BeeldOpMaat.swift', import.meta.url), 'utf8')
  const set = swift.match(/static let dpgHosts: Set<String> = \[([^\]]*)\]/)
  assert.ok(set, 'ImageURL.dpgHosts staat in de app')
  assert.deepEqual([...set[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort(), [...DPG_HOSTS].sort())
})

// ---- Vervormde en onscherpe beelden (13 november 2026, Tyra Banks bij NU.nl in Buiten je bubbel) ----
test('beeldpoort: NU.nl staand portret van 536 breed geeft geen uitgerekte variant en geen groot beeld', async () => {
  const { sourceWidth, shownRatio, largeOk, sharpEnough, largeVariant } = await import('../src/lib/img.js')
  const { nuLiggend } = await import('../shared/beeld.mjs')
  const url = 'https://images.nu.nl/m/8iyx5wyaofel_sqr256/0/13/536/536/topmodel-tyra-banks-52-is-weer-vrijgezel-ik-omarm-mijn-vrouwelijkheid.jpg'
  // De echte live meting uit de feed: het vierkant van 256.
  const item = { image: url, imageMeta: { w: 256, h: 256, crop: { l: 0, r: 0, t: 0, b: 0 }, ratio: 1 } }
  // Gemeten 13 november: deze uitsnede geeft 1280 x 720 zonder vervorming (0/0/0/0 rekte het portret uit).
  assert.equal(nuLiggend(url, 1280), 'https://images.nu.nl/m/8iyx5wyaofel_wd1280/0/130/536/302/topmodel-tyra-banks-52-is-weer-vrijgezel-ik-omarm-mijn-vrouwelijkheid.jpg')
  assert.equal(largeVariant(url), nuLiggend(url, 1280))
  assert.ok(!imgProps(url, 'lead').srcSet.includes('/0/0/0/0/'))
  assert.equal(sourceWidth(item), 536, 'niet de 1280 die NU.nl opgeschaald levert')
  assert.equal(shownRatio(item), 16 / 9)
  assert.equal(largeOk(item), false)
  assert.equal(sharpEnough(item, 358, 3), false)
  // Een NU.nl-beeld met een groot origineel blijft gewoon groot.
  const groot = { image: 'https://images.nu.nl/m/qjrxs4nafylh_sqr256/1016/860/2486/2486/aow.jpg' }
  assert.equal(sourceWidth(groot), 1280)
  assert.equal(largeOk(groot), true)
  assert.equal(sharpEnough(groot, 358, 3), true)
})

test('beeldpoort: te smal (400) geen groot beeld, 1280 x 720 wel; verhouding 3:1 of 1:2 nooit groot', async () => {
  const { largeOk, sharpEnough, shownRatio } = await import('../src/lib/img.js')
  const { grootBeeldMag, GROOT_MIN_BREED, GROOT_VERHOUDING } = await import('../shared/beeld.mjs')
  const meta = (w, h) => ({ w, h, crop: { l: 0, r: 0, t: 0, b: 0 } })
  assert.equal(GROOT_MIN_BREED, 600)
  assert.deepEqual(GROOT_VERHOUDING, [0.6, 2.4])
  assert.equal(largeOk({ image: 'https://example.org/smal.jpg', imageMeta: meta(400, 267) }), false)
  assert.equal(sharpEnough({ image: 'https://example.org/smal.jpg', imageMeta: meta(400, 267) }, 358, 1), false)
  const gewoon = { image: 'https://example.org/gewoon.jpg', imageMeta: meta(1280, 720) }
  assert.equal(largeOk(gewoon), true)
  assert.equal(sharpEnough(gewoon, 358, 3), true)
  // Breed genoeg, maar een banner van 3:1 of een staande strook van 1:2: het vak kan het niet vullen.
  const banner = { image: 'https://example.org/banner.jpg', imageMeta: meta(1800, 600) }
  const strook = { image: 'https://example.org/strook.jpg', imageMeta: meta(800, 1600) }
  assert.equal(shownRatio(banner), 3)
  assert.equal(largeOk(banner), false)
  assert.equal(largeOk(strook), false)
  // Een staande foto van 2:3 mag wel (de vakken snijden bij, ze rekken nooit uit).
  assert.equal(largeOk({ image: 'https://example.org/staand.jpg', imageMeta: meta(1000, 1500) }), true)
  // Onbekend blijft zoals altijd: tonen.
  assert.equal(largeOk({ image: 'https://example.org/onbekend.jpg' }), true)
  assert.equal(grootBeeldMag({}), true)
  assert.equal(grootBeeldMag({ kleinVierkant: true }), false)
})

test('beeldpoort: de gemeten grote variant (imageMeta.lead) telt voor breedte en verhouding', async () => {
  const { sourceWidth, largeOk } = await import('../src/lib/img.js')
  const plain = { l: 0, r: 0, t: 0, b: 0 }
  const wired = 'https://media.wired.com/photos/abc/master/pass/foto.jpg'
  // Wired vraagt 1360 (c_limit): levert de uitgever er maar 500, dan geen groot beeld.
  assert.equal(sourceWidth({ image: wired, imageMeta: { w: 500, h: 300, crop: plain, lead: { w: 500, h: 300 } } }), 500)
  assert.equal(largeOk({ image: wired, imageMeta: { w: 500, h: 300, crop: plain, lead: { w: 500, h: 300 } } }), false)
  assert.equal(largeOk({ image: wired, imageMeta: { w: 1360, h: 400, crop: plain, lead: { w: 1360, h: 400 } } }), false, '3,4:1')
  assert.equal(largeOk({ image: wired, imageMeta: { w: 1360, h: 765, crop: plain, lead: { w: 1360, h: 765 } } }), true)
})

test('beeldpoort: bekend klein vierkant (FD 140, Guardian 140) pas groot als de variant gemeten en goed is', async () => {
  const { largeOk, smallSquare } = await import('../src/lib/img.js')
  const fd = 'https://images.fd.nl/905854-906089.jpeg?fit=crop&crop=faces&auto=format%2Ccompress&q=45&w=140&h=140&fm=jpg&cs=tinysrgb'
  const meta = { w: 140, h: 140, crop: { l: 0, r: 0, t: 0, b: 0 } }
  assert.equal(smallSquare(fd), true)
  assert.equal(smallSquare('https://images.fd.nl/a.jpg?w=640&fm=jpg'), false)
  assert.equal(smallSquare('https://images.nu.nl/m/8iyx5wyaofel_sqr256/0/13/536/536/a.jpg'), false, 'NU.nl: de breedte staat in het adres')
  assert.equal(largeOk({ image: fd, imageMeta: meta }), false)
  assert.equal(largeOk({ image: fd, imageMeta: { ...meta, lead: { w: 1360, h: 906 } } }), true)
  assert.equal(largeOk({ image: 'https://i.guim.co.uk/img/x.jpg?width=140&s=abc' }), false)
})

test('beeldpoort: de server meet ook de grote variant en zet die in imageMeta.lead', async () => {
  const { measureFeedImages } = await import('../netlify/lib/image-measure.mjs')
  const url = 'https://images.nu.nl/m/8iyx5wyaofel_sqr256/0/13/536/536/tyra.jpg'
  const items = [{ kind: 'article', image: url }, { kind: 'article', image: 'https://example.org/geen-variant.jpg' }]
  const asked = []
  const sizes = { [url]: [256, 256], 'https://images.nu.nl/m/8iyx5wyaofel_wd1280/0/130/536/302/tyra.jpg': [1280, 720], 'https://example.org/geen-variant.jpg': [900, 600] }
  const load = async (u) => { asked.push(u); const [w, h] = sizes[u]; return { w, h, crop: { l: 0, r: 0, t: 0, b: 0 }, ratio: w / h } }
  let stored = {}
  await measureFeedImages(items, 1000, { load, get: async () => ({}), set: async (_k, v) => { stored = v } })
  assert.deepEqual(asked.sort(), Object.keys(sizes).sort())
  assert.deepEqual(items[0].imageMeta.lead, { w: 1280, h: 720 })
  assert.equal(items[0].imageMeta.w, 256)
  assert.equal(items[1].imageMeta.lead, undefined)
  assert.ok(stored['https://images.nu.nl/m/8iyx5wyaofel_wd1280/0/130/536/302/tyra.jpg'])
})

test('beeldpoort: de app spiegelt de poort en de NU.nl-uitsnede (ImageURL.swift, BeeldOpMaat.swift)', async () => {
  const { readFileSync } = await import('node:fs')
  const swift = readFileSync(new URL('../ios/Hoot/ImageURL.swift', import.meta.url), 'utf8')
  const opMaat = readFileSync(new URL('../ios/Hoot/BeeldOpMaat.swift', import.meta.url), 'utf8')
  assert.match(swift, /static let grootMinBreed = 600\.0/)
  assert.match(swift, /static let grootVerhouding = \(0\.6, 2\.4\)/)
  assert.match(swift, /guard largeOk\(item\) else \{ return false \}/)
  assert.match(opMaat, /_wd1280\/\\\(v\.x\)\/\\\(v\.y \+ \(v\.zijde - hoog\) \/ 2\)\/\\\(v\.zijde\)\/\\\(hoog\)\//)
  assert.ok(!opMaat.includes('/0/0/0/0/'), 'de app vraagt nooit meer 0/0/0/0')
  // Nergens uitrekken: een beeld op een vaste maat krijgt altijd aspectRatio(contentMode: .fill).
  for (const f of ['ImageMeasure.swift', 'Views/Components.swift', 'Views/Vouw.swift']) {
    const src = readFileSync(new URL(`../ios/Hoot/${f}`, import.meta.url), 'utf8')
    assert.ok(!/\.resizable\(\)\.frame\(width: rect\.width/.test(src), f)
  }
})
