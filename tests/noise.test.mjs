import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNoise } from '../netlify/lib/rss.mjs'
import { matchCard, wantsArticleImage } from '../netlify/lib/build.mjs'
import { ogImageFrom } from '../netlify/lib/og.mjs'

const it = (title, link = 'https://example.org/a') => ({ title, link })

test('kleine updates en aanbiedingen horen niet in de Stroom', () => {
  assert.equal(isNoise(it('Software-update - Camtasia 2026.2.3', 'https://tweakers.net/downloads/78736/camtasia-202623.html')), true)
  assert.equal(isNoise(it('Driver-update - AMD Ryzen Chipset Driver 8.09.28.1124')), true)
  assert.equal(isNoise(it('Firmware-update - QNAP QTS 5.2.10.3568')), true)
  assert.equal(isNoise(it('.Actie - Thuisladen kan geld opleveren', 'https://tweakers.net/plan/4860/thuisladen.html')), true)
  assert.equal(isNoise(it('De beste aanbiedingen van deze week')), true)
  assert.equal(isNoise(it('Black Friday-deals bij Coolblue en Bol')), true)
  assert.equal(isNoise(it('Kortingscode voor Zalando')), true)
  assert.equal(isNoise(it('Iets'), ['Software']), true) // Tweakers-categorie
  // Nieuws blijft: ook een deal of update die nieuws is.
  assert.equal(isNoise(it('Trump en China sluiten deal over chips')), false)
  assert.equal(isNoise(it('Brexit-deal na lang onderhandelen rond')), false)
  assert.equal(isNoise(it('Nvidia brengt hotfix uit voor bug die gpu-temperatuur verkeerd weergeeft', 'https://tweakers.net/nieuws/1/x.html')), false)
  assert.equal(isNoise(it('Review - Philips OLED951-tv – Luxe en veelzijdig', 'https://tweakers.net/reviews/15432/x.html')), false)
})

test('Tweakers-beeld via Bluesky: op de kop gekoppeld, ook met "Review - " ervoor of een kleine wijziging', () => {
  const cards = [
    { title: 'Philips OLED951-tv – Luxe en veelzijdig, maar minder smart', thumb: 'https://cdn.bsky.app/a' },
    { title: 'Veel websites bij hosters van Yourhosting zijn nog steeds offline om PHP-bug', thumb: 'https://cdn.bsky.app/b' },
  ]
  assert.equal(matchCard('Review - Philips OLED951-tv – Luxe en veelzijdig, maar minder smart', cards)?.thumb, 'https://cdn.bsky.app/a')
  assert.equal(matchCard('Veel websites bij hosters van Yourhosting zijn nog steeds offline door PHP-bug', cards)?.thumb, 'https://cdn.bsky.app/b')
  assert.equal(matchCard('Spotify heeft 306 miljoen betalende Premium-abonnees', cards), null)
})

test('beeld van het artikel: alleen voor gratis bronnen zonder beeld, nooit een liveblog', () => {
  const art = (extra = {}) => ({ kind: 'article', image: null, url: 'https://www.rollingstone.com/music/x/', ...extra })
  assert.equal(wantsArticleImage(art(), { id: 'rollingstone' }), true)
  assert.equal(wantsArticleImage(art(), { id: 'bloomberg', paid: true }), false)
  assert.equal(wantsArticleImage(art({ image: 'https://a/b.jpg' }), { id: 'rollingstone' }), false)
  assert.equal(wantsArticleImage(art(), { id: 'tweakers', bskyImages: true }), false) // die komt via Bluesky
  assert.equal(wantsArticleImage(art(), { id: 'volkskrant' }), false) // die komt via de zoekindex
  // WordPress schrijft & soms als &#038;
  assert.equal(ogImageFrom('<head><meta property="og:image" content="https://www.rollingstone.com/a.jpg?crop=0px&#038;resize=1200"></head>'), 'https://www.rollingstone.com/a.jpg?crop=0px&resize=1200')
})

test('reclame voor een nieuwsbrief is geen bericht', async () => {
  const { isNoise } = await import('../netlify/lib/rss.mjs')
  assert.equal(isNoise({ title: 'Middle East Dispatch newsletter: Election day in Israel' }), true)
  assert.equal(isNoise({ title: 'Why newsletters are booming again' }), false)
})

test('de Ballon d’Or is voetbal', async () => {
  const { keywordTopics } = await import('../netlify/lib/topics.mjs')
  assert.ok(keywordTopics('Harry Kane’s Ballon d’Or is behalve een erkenning').includes('voetbal'))
})

test('persberichten, gesponsorde en partnerinhoud zijn geen nieuws', () => {
  // Stond als nieuws in de Editie van 29 oktober (avond), rubriek VS.
  assert.equal(isNoise(it('Election Night at The Atlantic : Live Special November 3 at 9 P.M.', 'https://www.theatlantic.com/press-releases/2026/10/election-night-at-the-atlantic-live-special/684812/')), true)
  assert.equal(isNoise(it('Uitgeverij lanceert nieuwe app', 'https://www.example.nl/persberichten/2026/nieuwe-app')), true)
  assert.equal(isNoise(it('De beste reis van je leven', 'https://www.example.com/sponsored/reizen-naar-japan')), true)
  assert.equal(isNoise(it('Zo bespaar je energie', 'https://www.example.nl/partner/energie-besparen')), true)
  assert.equal(isNoise(it('Zo bespaar je energie', 'https://www.example.nl/partner-content/energie-besparen')), true)
  // Gewoon nieuws, ook over een partner of een persbericht.
  assert.equal(isNoise(it('Persbericht van ministerie bleek onjuist', 'https://www.example.nl/politiek/persbericht-ministerie-onjuist')), false)
  assert.equal(isNoise(it('Ex-partner van zanger aangehouden', 'https://www.example.nl/show/ex-partner-van-zanger')), false)
  assert.equal(isNoise(it('The Atlantic Daily', 'https://www.theatlantic.com/newsletters/2026/10/x/684800/')), false)
})
