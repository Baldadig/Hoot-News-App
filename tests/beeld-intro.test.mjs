// Build 46: beeld en intro aanvullen op de server (BEELD-EN-INTRO.md, besluiten van Alex).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ogImageFrom, loadOgImage, isGate } from '../netlify/lib/og.mjs'
import { imagesFromArticles, sizeBingImages, gapTitleQueries, borrowFromStories, wantsArticleImage } from '../netlify/lib/build.mjs'
import { articleKey, bingUnmeasured, bingId } from '../netlify/lib/snippets.mjs'

const art = (id, extra = {}) => ({ id, kind: 'article', source: 'nature', title: 'Titel ' + id, url: `https://www.nature.com/articles/${id}`, publishedAt: '2026-11-04T10:00:00Z', ...extra })
const memKv = () => {
  const m = new Map()
  return { get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v), m }
}

test('deelbeeld: entiteiten in het adres (FD: &#x3D;) worden tekens', () => {
  assert.equal(ogImageFrom('<head><meta property="og:image" content="https://images.fd.nl/a.jpg?w&#x3D;640&amp;fm&#x3D;jpg"></head>'), 'https://images.fd.nl/a.jpg?w=640&fm=jpg')
})

test('deelbeeld: een doorverwijzing naar een cookiemuur of login geeft geen beeld; een gewone wel', async () => {
  assert.equal(isGate('https://myprivacy.dpgmedia.nl/consent?siteKey=x'), true)
  assert.equal(isGate('https://www.example.com/login?next=/a'), true)
  assert.equal(isGate('https://www.vrt.be/vrtnws/nl/2026/11/04/titel/'), false) // vrtnws.be/p.… stuurt hierheen
  assert.equal(isGate('https://www.tijd.be/politiek/titel/10698532.html'), false)
  const ok = async () => ({ ok: true, url: 'https://www.vrt.be/vrtnws/nl/a/', headers: new Headers({ 'content-type': 'text/html' }), body: new Response('<head><meta property="og:image" content="https://images.vrt.be/a.jpg"></head>').body })
  assert.equal(await loadOgImage('https://vrtnws.be/p.abc', { fetcher: ok }), 'https://images.vrt.be/a.jpg')
  const html = '<head><meta property="og:image" content="https://consent.example/banner.png"></head>'
  const fake = (finalUrl) => async () => ({ ok: true, url: finalUrl, headers: new Headers({ 'content-type': 'text/html' }), body: new Response(html).body })
  assert.equal(await loadOgImage('https://www.ad.nl/a', { fetcher: fake('https://myprivacy.dpgmedia.nl/consent') }), null)
  assert.equal(await loadOgImage('https://www.ad.nl/a', { fetcher: fake('https://www.ad.nl/a') }), 'https://consent.example/banner.png')
})

test('deelbeeld ook voor betaalde bronnen; eenmaal opgehaald komt het uit de cache', async () => {
  const kv = memKv()
  let loads = 0
  const load = async (url) => (loads++, `https://media.nature.com/${url.split('/').pop()}.jpg`)
  const sourceOf = (id) => ({ id, paid: true })
  const a = [art('a'), art('b')]
  await imagesFromArticles(a, Date.now(), { load, ...kv, sourceOf })
  assert.deepEqual(a.map((i) => i.image), ['https://media.nature.com/a.jpg', 'https://media.nature.com/b.jpg'])
  assert.equal(loads, 2)
  const b = [art('a'), art('b')]
  await imagesFromArticles(b, Date.now(), { load, ...kv, sourceOf })
  assert.equal(loads, 2) // geen nieuwe paginaverzoeken
  assert.equal(b[0].image, 'https://media.nature.com/a.jpg')
})

test('deelbeeld: de rondegrens houdt de stap kort en onthoudt een afgebroken poging niet als "geen beeld"', async () => {
  const kv = memKv()
  const slow = (url, { signal }) => new Promise((resolve) => signal.addEventListener('abort', () => resolve(null)))
  const t = Date.now()
  const keep = setTimeout(() => {}, 5000) // AbortSignal.timeout houdt de test zelf niet wakker
  await imagesFromArticles([art('a'), art('b')], Date.now(), { load: slow, ...kv, sourceOf: (id) => ({ id }), budget: 120 })
  clearTimeout(keep)
  assert.ok(Date.now() - t < 1000)
  assert.equal(kv.m.get('og-images-v1') ?? null, null) // niets onthouden: volgende ronde opnieuw
})

test('beeld van een ander artikel lenen doen we niet: alleen een kopie met dezelfde kop', async () => {
  const kv = memKv()
  const items = [art('a', { title: 'Zelfde kop' }), art('b', { title: 'Zelfde kop', source: 'nature2', url: 'https://x.org/b', publishedAt: '2026-11-04T09:00:00Z' }), art('c', { title: 'Andere kop' })]
  await imagesFromArticles(items, Date.now(), { load: async (u) => (u.endsWith('/a') ? 'https://img/a.jpg' : null), ...kv, sourceOf: (id) => ({ id }) })
  assert.equal(items[0].image, 'https://img/a.jpg')
  assert.equal(items[1].image, 'https://img/a.jpg')
  assert.equal(items[2].image, undefined)
})

test('Bing-beeld: het bronbeeld meten en op eigen maat opvragen; groot genoeg = groot tonen', async () => {
  const kv = memKv()
  const img = 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=1200&h=675&c=7'
  assert.equal(bingUnmeasured(img), true)
  const items = [art('e', { source: 'economist', image: img }), art('f', { source: 'economist', image: 'https://www.bing.com/th?id=ONUT.klein&pid=News&w=1200&h=675&c=7' })]
  let loads = 0
  const load = async (url) => (loads++, url.includes('klein') ? { w: 300, h: 200 } : { w: 700, h: 393 })
  await sizeBingImages(items, Date.now(), { load, ...kv })
  assert.equal(items[0].image, 'https://www.bing.com/th?id=ONUT.abc&pid=News&w=700&h=393')
  assert.equal(items[1].image, 'https://www.bing.com/th?id=ONUT.klein&pid=News&w=300&h=200')
  assert.equal(bingUnmeasured(items[0].image), false)
  assert.equal(bingId(items[0].image), 'ONUT.abc')
  const again = [art('e', { source: 'economist', image: img })]
  await sizeBingImages(again, Date.now(), { load, ...kv })
  assert.equal(loads, 2) // uit de cache
  assert.equal(again[0].image, items[0].image)
  // Lukt meten niet, dan blijft het adres zoals het was (een miniatuur).
  const fail = [art('g', { image: 'https://www.bing.com/th?id=ONUT.weg&pid=News&w=1200&h=675&c=7' })]
  await sizeBingImages(fail, Date.now(), { load: async () => null, ...memKv() })
  assert.equal(bingUnmeasured(fail[0].image), true)
})

test('De Tijd: feedlink en zoekindex vinden elkaar op het artikelnummer', () => {
  assert.equal(articleKey('https://www.tijd.be/r/t/1/id/10698532'), 'tijd.be/10698532')
  assert.equal(articleKey('https://www.tijd.be/politiek-economie/belgie/titel/10698532.html'), 'tijd.be/10698532')
  assert.equal(wantsArticleImage(art('t', { source: 'tijd' }), { id: 'tijd', paid: true }), false) // via de zoekindex
})

test('Volkskrant: gericht zoeken op de kop, nieuwste eerst, niet te vaak en niet eindeloos', () => {
  const now = Date.parse('2026-11-04T14:00:00Z')
  const vk = (id, at, extra = {}) => ({ id, kind: 'article', source: 'volkskrant', title: 'Kop ' + id, url: `https://www.volkskrant.nl/x/kop~b${id}aaaa/`, publishedAt: at, ...extra })
  const img = 'https://image.volkskrant.nl/a.jpg'
  const open = [vk('1', '2026-11-03T08:00:00Z', { image: img }), vk('2', '2026-11-04T13:00:00Z', { image: img }), vk('3', '2026-11-04T12:00:00Z', { summary: 'Heeft er al een.', image: img }), vk('4', '2026-11-04T11:00:00Z'), vk('5', '2026-11-04T10:00:00Z'), vk('6', '2026-11-04T13:30:00Z', { summary: 'Wel intro, geen beeld.' })]
  const tries = { [articleKey(open[3].url)]: { n: 1, at: now - 5 * 6e4 }, [articleKey(open[4].url)]: { n: 6, at: now - 864e5 } }
  // Eerst wie een intro mist (nieuwste eerst), dan wie alleen een beeld mist; 3 mist niets;
  // 4: net geprobeerd; 5: al zes keer.
  assert.deepEqual(gapTitleQueries(open, tries, now).map((i) => i.id), ['2', '1', '6'])
  assert.deepEqual(gapTitleQueries(open, {}, now, { max: 1 }).map((i) => i.id), ['2'])
})

test('intro lenen binnen een verhaal: zelfde taal, andere bron, eigen intro, met "via X"', () => {
  const vk = { id: 'vk', kind: 'article', source: 'volkskrant', sourceName: 'de Volkskrant', title: 'Russische aanval op school in Oekraïne eist veertig doden', url: 'https://www.volkskrant.nl/a~b1234567/' }
  const nos = { id: 'nos', kind: 'article', source: 'nos', sourceName: 'NOS', title: 'Veertig doden bij Russische aanval op school', summary: 'Bij een Russische aanval op een school zijn veertig doden gevallen.', url: 'https://nos.nl/a' }
  const nyt = { id: 'nyt', kind: 'article', source: 'nyt', sourceName: 'NYT', lang: 'en', title: 'Russian strike on school kills forty', summary: 'A Russian strike killed forty.', url: 'https://nytimes.com/a' }
  const geleend = { id: 'tr', kind: 'article', source: 'trouw', sourceName: 'Trouw', title: 'Russische aanval op school: veertig doden', summary: 'Geleende tekst.', borrowedFrom: 'AD', url: 'https://trouw.nl/a' }
  const byId = new Map([vk, nos, nyt, geleend].map((i) => [i.id, i]))
  assert.equal(borrowFromStories([{ id: 's', itemIds: ['nyt', 'tr', 'vk', 'nos'] }], byId), 1)
  assert.equal(vk.summary, nos.summary)
  assert.equal(vk.borrowedFrom, 'NOS')
  // Geen donor in dezelfde taal: dan niets.
  const vk2 = { ...vk, id: 'vk2', summary: undefined, borrowedFrom: undefined }
  assert.equal(borrowFromStories([{ id: 's2', itemIds: ['vk2', 'nyt'] }], new Map([[vk2.id, vk2], [nyt.id, nyt]])), 0)
  assert.equal(vk2.summary, undefined)
})
