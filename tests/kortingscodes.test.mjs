// Redacteur · kortingscodes (12 november 2026). Besluit van Alex: kortingscode-pagina's uit de Stroom, en dus nooit in de
// Editie. Per bron (kortingscodes · 3, netlify/lib/kortingscode.mjs), net als dealsCategory: alleen een bron met
// `couponPages: true` in sources.mjs (nu alleen Wired) doet mee. Dan valt een stuk weg als de slug "<naam>-<codewoord>" is
// (nike-promo-code) én de kop het codewoord in het openingsdeel heeft. Reden bij de telling: 'kortingscode'. Norm: er
// valt nooit nieuws weg; bij twijfel blijft het staan.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { isNoise, noiseReason, loadSource } from '../netlify/lib/rss.mjs'
import { mergeSource, withLatest } from '../netlify/lib/stream.mjs'
import { couponPage, couponHead, couponSlug, openingOf, slugOf } from '../netlify/lib/kortingscode.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

const dir = new URL('./fixtures/', import.meta.url)
const fixture = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')).items
const live = fixture('kortingscodes-2026-11-12.json')
const labels = [...fixture('editie-filters-sets.json'), ...fixture('ruis-labels.json')]
const wired = SOURCES.find((s) => s.id === 'wired')
const nos = SOURCES.find((s) => s.id === 'nos') || { id: 'nos', name: 'NOS', cat: 'nl', lang: 'nl' }
// Bronnen die het niet aanzetten: NOS, een Reuters- en AP-achtige bron (niet in sources.mjs) en geen bron.
const ZONDER = [nos, { id: 'reuters', name: 'Reuters', cat: 'world', lang: 'en' }, { id: 'ap', name: 'AP', cat: 'world', lang: 'en' }, null]

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const xmlItem = (x) => `<item><title>${esc(x.title)}</title><link>${esc(x.url)}</link>${(x.cats || []).map((c) => `<category>${esc(c)}</category>`).join('')}</item>`
async function viaFeed(src, items, limit = Infinity) {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Proef</title>${items.map(xmlItem).join('\n')}</channel></rss>`
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    const r = await loadSource({ ...src, urls: ['https://example.test/feed'] }, Promise.resolve({}), { limit })
    assert.equal(r.ok, true, r.error)
    return r.items
  } finally {
    globalThis.fetch = orig
  }
}

// De 12 die live in de Stroom stonden (12 november, ochtend), alle van Wired, alle alleen "Gear".
const LIVE = [
  'Wayfair Coupons: Up to 80% Off November 2026',
  'Hydrow Discount Code: Save Up to $150 | November 2026',
  'Nike Promo Codes and Discounts: 30% for November 2026',
  'AirDoctor Coupon Codes: 40% Off | November 2026',
  'Vitamix Promo Codes and Deals: $25 Off + Free Shipping',
  'Design Within Reach Promo Codes: 30% Off | November 2026',
  'Home Depot Promo Codes: 30% Off in November 2026',
  'NordVPN Coupons: 75% Off, Plus 3 Months Free in November 2026',
  'OnePlus Promo Codes: 30% Off November 2026',
  'Visible Promo Codes and Coupons for November 2026',
  'Factor Promo Code: 50% Off Off Meal Prep',
  'Squarespace Promo Codes: 20% Off in November 2026',
]

// Nieuws over kortingscodes en randgevallen: moeten blijven. De eerste vier zijn de tegenvoorbeelden uit de opdracht; de
// rest zou weggevallen zijn met "het woord staat ergens in kop en slug" (gelabeld N in de sets).
const BLIJFT = [
  // nieuws over coupons/kortingscodes, met nieuws-slug
  { title: 'FTC sues company over fake coupon codes', url: 'https://www.theverge.com/news/812345/ftc-lawsuit-fake-discount-app' },
  { title: 'Kortingscode-fraude: politie arresteert drie verdachten in Rotterdam', url: 'https://nos.nl/artikel/2645001-politie-arresteert-drie-verdachten-van-webwinkelfraude' },
  // een kop met "promo code" maar een nieuws-slug
  { title: 'Nike Promo Codes: Why the Brand Is Pulling Back on Discounts', url: 'https://www.wired.com/story/nike-pulls-back-on-discounts/' },
  { title: 'Promo Code', url: 'https://www.example.test/2026/11/12/podcast-aflevering-48' },
  // een slug met coupon maar een nieuwskop
  { title: 'Honey Is Being Sued Again Over How It Handles Shoppers', url: 'https://www.theverge.com/news/812400/honey-coupon' },
  { title: 'Rechtbank: kortingscodes van influencers zijn verkapte reclame', url: 'https://nos.nl/artikel/2640008-influencers-kortingscodes' },
  // het woord in kop én slug, maar als nieuws (gelabeld N)
  { title: 'Honey sued over coupon codes by YouTube creators', url: 'https://techcrunch.com/2026/11/12/honey-sued-coupon-codes-creators/' },
  { title: 'Promo codes scam: Dutch police warn of fake WhatsApp discount codes', url: 'https://nltimes.nl/2026/11/11/promo-codes-scam-dutch-police-warn-fake-whatsapp-discount-codes' },
  { title: 'Kortingscode-fraude: politie pakt bende op', url: 'https://www.nu.nl/binnenland/6418005/kortingscode-fraude.html' },
  { title: 'Fake coupon codes for Black Friday 2026 flood TikTok', url: 'https://www.theverge.com/news/700001/fake-coupon-codes-tiktok-scam' },
  { title: 'Kortingscodes op TikTok blijken vaak nep, zegt Consumentenbond', url: 'https://nos.nl/artikel/2643560-kortingscodes-op-tiktok-blijken-vaak-nep-zegt-consumentenbond' },
  { title: 'Europese Commissie onderzoekt kortingscodes van Temu', url: 'https://tweakers.net/nieuws/241118/europese-commissie-onderzoekt-kortingscodes-van-temu.html' },
  // wat de regel bewust niet ziet: woord in een samenstelling of te ver in de zin, of een lange slug
  { title: 'FTC sues company over fake coupon codes', url: 'https://www.example.test/news/ftc-sues-company-over-fake-coupon-codes' },
  { title: 'Influencers coupons', url: 'https://www.example.test/news/eu-court-rules-on-what-influencers-may-say-about-coupons' },
]

// Keuring 1 (12 november): 32 realistische nieuwskoppen over coupons, promocodes, vouchers en kortingscodes, in de stijl
// van echte bronnen. Onder kortingscodes · 1 vielen er 14 weg ("Temu coupons: EU opens formal investigation",
// …/temu-coupons). Alle 32 moeten blijven: na de dubbele punt staat een zin, geen aanbod.
const AANVAL = [
  ['Honey sued over coupon codes by YouTube creators', 'https://www.theverge.com/2026/1/2/honey-sued-coupon-codes-creators'],
  ['Influencers en kortingscodes: rechter zet streep door verkapte reclame', 'https://nos.nl/artikel/2640008-influencers-kortingscodes'],
  ['Temu coupons: EU opens formal investigation', 'https://www.reuters.com/technology/temu-coupons'],
  ['Fake coupons: police warn shoppers before Black Friday', 'https://www.bbc.com/news/fake-coupons'],
  ['Nepkortingscodes: Fraudehelpdesk krijgt honderden meldingen', 'https://www.nu.nl/economie/6312345/nepkortingscodes'],
  ['Kortingscodes: ACM tikt webwinkels op de vingers', 'https://nos.nl/artikel/2641111-acm-kortingscodes'],
  ["Coupon codes: how Honey's browser extension really worked", 'https://www.theverge.com/24300000/honey-coupon-codes'],
  ['PayPal Honey coupon codes: class action expands', 'https://techcrunch.com/2026/01/05/paypal-honey-coupon-codes'],
  ['Digital coupons: Kroger settles FTC lawsuit', 'https://apnews.com/article/kroger-digital-coupons'],
  ['Grocery coupons and SNAP: what changes in 2026', 'https://www.npr.org/2026/11/01/grocery-coupons'],
  ['Restaurant vouchers: government ends Eat Out scheme', 'https://www.theguardian.com/business/restaurant-vouchers'],
  ['School vouchers: Supreme Court hears Oklahoma case', 'https://www.nytimes.com/2026/04/01/us/school-vouchers.html'],
  ['Energy vouchers for November 2026: who qualifies', 'https://www.bbc.com/news/energy-vouchers'],
  ['Housing vouchers', 'https://www.npr.org/2026/03/03/housing-vouchers'],
  ['Section 8 housing vouchers: waitlists reopen', 'https://apnews.com/article/section-8-housing-vouchers'],
  ['Travel vouchers and refunds: KLM loses court case', 'https://nos.nl/artikel/2639000-klm-vouchers'],
  ['Corona-vouchers: reisbranche moet miljoenen terugbetalen', 'https://nos.nl/artikel/2638000-corona-vouchers'],
  ['Kortingscode-fraude: politie pakt bende op', 'https://www.ad.nl/binnenland/kortingscode-fraude.html'],
  ['Promo codes scam: Dutch police warn of fake WhatsApp discount codes', 'https://www.dutchnews.nl/2026/11/promo-codes-scam-dutch-police-warn-of-fake-whatsapp-discount-codes/'],
  ['Discount codes for November 2026 flood TikTok, most are fake', 'https://www.wired.com/story/discount-codes-tiktok-fake'],
  ['Amazon coupons and the FTC: the antitrust trial explained', 'https://www.vox.com/technology/amazon-coupons'],
  ['Uber Eats vouchers: drivers protest', 'https://www.theguardian.com/technology/uber-eats-vouchers'],
  ['Google kills Chrome coupon codes feature', 'https://www.theverge.com/news/google-chrome-coupon-codes'],
  ['Capital One Shopping coupons: lawsuit says extension stole commissions', 'https://arstechnica.com/tech-policy/2026/02/capital-one-shopping-coupons'],
  ['Influencer promo codes', 'https://www.nrc.nl/nieuws/2026/11/10/influencer-promo-codes-a4912345'],
  ['Kortingscodes en influencers: wat zegt de wet?', 'https://www.volkskrant.nl/economie/kortingscodes-en-influencers~b1234abc/'],
  ['Coupons', 'https://www.economist.com/finance/2026/11/12/coupons'],
  ['Bond coupons rise as Treasury yields climb', 'https://www.ft.com/content/bond-coupons'],
  ['Zero coupons: why Dutch pension funds buy them', 'https://fd.nl/financiele-markten/zero-coupons'],
  ['Chinese consumption vouchers: Beijing tries to revive spending', 'https://www.economist.com/china/consumption-vouchers'],
  ['Netflix promo codes in November 2026: the scam that steals your login', 'https://www.wired.com/story/netflix-promo-code'],
  ['Shein coupons — EU fines retailer', 'https://nos.nl/artikel/2642000-shein-coupons'],
].map(([title, url]) => ({ title, url }))

// De 11 gelabelde valkuilen (label N in de sets): nieuws met het woord in kop én slug.
const VALKUILEN = [
  ['Kortingscode-site lekt gegevens van miljoenen klanten', 'https://tweakers.net/nieuws/254400/kortingscode-site-lekt-gegevens.html'],
  ["PayPal's Honey accused of hiding better promo codes from shoppers", 'https://www.theverge.com/news/1031500/paypal-honey-promo-codes-lawsuit'],
  ['Honey sued over coupon codes by YouTube creators', 'https://techcrunch.com/2026/11/12/honey-sued-coupon-codes-creators/'],
  ['Rechtbank: kortingscodes van influencers zijn verkapte reclame', 'https://nos.nl/artikel/2640008-influencers-kortingscodes'],
  ['Kortingscode-fraude: politie pakt bende op', 'https://www.nu.nl/binnenland/6418005/kortingscode-fraude.html'],
  ['Fake coupon codes for Black Friday 2026 flood TikTok', 'https://www.theverge.com/news/700001/fake-coupon-codes-tiktok-scam'],
  ['Europese Commissie onderzoekt kortingscodes van Temu', 'https://tweakers.net/nieuws/241118/europese-commissie-onderzoekt-kortingscodes-van-temu.html'],
  ['Politie pakt bende op die nep-kortingscodes verkocht via Telegram', 'https://www.nu.nl/binnenland/6372201/politie-pakt-bende-op-die-nep-kortingscodes-verkocht-via-telegram.html'],
  ['Kortingscode-fraude: politie pakt bende op die webwinkels oplichtte', 'https://tweakers.net/nieuws/241570/kortingscode-fraude-politie-pakt-bende-op-die-webwinkels-oplichtte.html'],
  ['Promo codes scam: Dutch police warn of fake WhatsApp discount codes', 'https://nltimes.nl/2026/11/11/promo-codes-scam-dutch-police-warn-fake-whatsapp-discount-codes'],
  ['Kortingscodes op TikTok blijken vaak nep, zegt Consumentenbond', 'https://nos.nl/artikel/2643560-kortingscodes-op-tiktok-blijken-vaak-nep-zegt-consumentenbond'],
].map(([title, url]) => ({ title, url }))

// Keuring 2 (12 november): 40 nieuwe nieuwskoppen, met een bedrag of percentage direct na de dubbele punt. Onder
// kortingscodes · 2 (een generieke regel voor elke bron) vielen er 13 weg. Bij een bron zonder `couponPages` nu geen één.
const AANVAL2 = [
  ['Coupon codes: 40% of shoppers say they no longer trust them', 'https://www.reuters.com/business/retail/coupon-codes'],
  ['Kortingscodes: 30% van webwinkels misleidt klanten, zegt ACM', 'https://nos.nl/artikel/2643001-kortingscodes'],
  ['Promo codes: FTC fines retailer $25 million', 'https://apnews.com/article/promo-codes'],
  ['Coupons: 70% of US households still clip them', 'https://www.npr.org/2026/11/12/coupons'],
  ['Fake promo codes: 90% off at scam shops', 'https://www.bbc.com/news/fake-promo-codes'],
  ['Valse kortingscodes: 70 procent korting bij nepwinkels', 'https://nos.nl/artikel/2643002-valse-kortingscodes'],
  ['Student discount codes: 10% off with student ID', 'https://www.theguardian.com/money/student-discount-codes'],
  ['Digital coupons: $10 billion at stake', 'https://www.ft.com/content/digital-coupons'],
  ['Grocery coupons: 2026', 'https://www.vox.com/grocery-coupons'],
  ['Kortingscodes: 2 miljoen euro boete voor webshop', 'https://nos.nl/artikel/2643003-kortingscodes'],
  ['Kortingscodes: 400.000 euro boete voor kledingketen', 'https://www.nu.nl/economie/6312999/kortingscodes'],
  ['Coupon codes: $2,000 at risk', 'https://www.theverge.com/news/coupon-codes'],
  ['Voucher codes: 1 in 5 are fake, Which? finds', 'https://www.bbc.com/news/voucher-codes'],
  ['Discount codes: 25% up in November', 'https://www.economist.com/business/discount-codes'],
  ['Promo codes: up 40% in 2026', 'https://techcrunch.com/2026/11/12/promo-codes'],
  ['Kortingscodes: gebruik stijgt 30 procent in november', 'https://www.ad.nl/economie/kortingscodes'],
  ['Kortingscodes in december', 'https://www.nrc.nl/nieuws/2026/12/01/kortingscodes-a4913000'],
  ['Digital coupons in 2026', 'https://www.economist.com/finance/digital-coupons'],
  ['Grocery coupons for May', 'https://www.npr.org/2026/04/30/grocery-coupons'],
  ['Coupons: 3 months free trials are a trap, regulator says', 'https://www.bbc.com/news/coupons'],
  ['Kortingscodes: gratis verzending blijkt vaak nep', 'https://nos.nl/artikel/2643004-kortingscodes'],
  ['Promo codes — $5 off, but at what cost?', 'https://www.vox.com/promo-codes'],
  ['Coupon codes: 50% off claims under EU scrutiny', 'https://www.reuters.com/world/europe/coupon-codes'],
  ['Kortingscodes: 20 procent korting op energie mag niet meer', 'https://www.nu.nl/economie/6313000/kortingscodes'],
  ['Influencer kortingscodes: 15 procent korting met verborgen reclame', 'https://nos.nl/artikel/2643005-influencer-kortingscodes'],
  ['Bond coupons: 4% in 2026', 'https://www.ft.com/content/bond-coupons-2026'],
  ['Treasury coupons: 5% for November 2026', 'https://www.reuters.com/markets/rates-bonds/treasury-coupons'],
  ['Staatsobligaties coupons: 3 procent in 2026', 'https://fd.nl/financiele-markten/coupons'],
  ['Green coupons: 2.5% at auction', 'https://www.ft.com/content/green-coupons'],
  ['Euro coupons: 3% on new debt', 'https://www.economist.com/finance/euro-coupons'],
  ['Energy voucher codes: £150 per household', 'https://www.bbc.com/news/energy-voucher-codes'],
  ['NHS vouchers: £50 for glasses', 'https://www.bbc.com/news/nhs-vouchers'],
  ['Restaurant vouchers: 50% off on Mondays', 'https://www.theguardian.com/business/restaurant-vouchers-2026'],
  ['Supermarket coupons: 25% off on fresh food to cut waste', 'https://www.theguardian.com/environment/supermarket-coupons'],
  ['Coupons | 30% of Black Friday sales', 'https://www.economist.com/graphic-detail/coupons'],
  ['Kortingscodes: 10 euro', 'https://www.volkskrant.nl/economie/kortingscodes~b9999abc/'],
  ['Promo codes: $25 Off at Retailers Under Investigation', 'https://www.wired.com/story/promo-codes'],
  ['Coupons: 2 for 1', 'https://www.npr.org/2026/11/11/coupons'],
  ['Discount codes: 15% Off at Risk as EU Bans Fake Discounts', 'https://www.wired.com/story/discount-codes'],
  ['Coupons: deals', 'https://www.vox.com/coupons'],
].map(([title, url]) => ({ title, url }))

test('kortingscodes: alle 72 aanvalskoppen en de 11 gelabelde valkuilen blijven bij elke bron die het niet aanzet', async () => {
  assert.equal(AANVAL.length, 32)
  assert.equal(AANVAL2.length, 40)
  assert.equal(VALKUILEN.length, 11)
  assert.deepEqual(SOURCES.filter((s) => s.couponPages).map((s) => s.id), ['wired'])
  for (const x of [...AANVAL, ...AANVAL2, ...VALKUILEN]) {
    assert.equal(couponPage(x), false, x.title)
    for (const src of ZONDER) assert.equal(noiseReason({ title: x.title, link: x.url }, [], src), null, `${src?.id}: ${x.title}`)
  }
  const uniek = new Map([...AANVAL, ...AANVAL2, ...VALKUILEN].map((x) => [x.url, x]))
  assert.equal((await viaFeed(nos, [...uniek.values()])).length, uniek.size)
})

test('kortingscodes: bij Wired blijft een nieuwsachtige kop staan zolang de slug geen codepagina-slug is', () => {
  // Alle aanvalskoppen op een gewone Wired-link (…/story/<nieuws-slug>/): niets valt weg.
  for (const x of [...AANVAL, ...AANVAL2, ...VALKUILEN]) {
    const url = `https://www.wired.com/story/${slugOf(x.url).replace(/[^a-z0-9]+/g, '-')}-explained/`
    assert.equal(noiseReason({ title: x.title, link: url }, [], wired), null, `${x.title} | ${url}`)
  }
  // Wired's eigen nieuws-slugs uit de aanval: geen naam vóór het codewoord, of het codewoord niet als laatste.
  for (const url of ['https://www.wired.com/story/promo-codes', 'https://www.wired.com/story/discount-codes', 'https://www.wired.com/story/discount-codes-tiktok-fake'])
    assert.equal(couponSlug(url), false, url)
  // Wat bij Wired wél valt: de codepagina-slug met het codewoord in de kop. Dat is de afspraak (ook "Netflix promo codes
  // in November 2026: the scam …" op …/netflix-promo-code zou vallen; zo'n link gebruikt Wired voor zijn codepagina's).
  assert.equal(noiseReason({ title: 'Temu Coupons: 30% Off | November 2026', link: 'https://www.wired.com/story/temu-coupon/' }, [], wired), 'kortingscode')
  assert.equal(noiseReason({ title: 'Temu Coupons: 30% Off | November 2026', link: 'https://www.wired.com/story/temu-coupon/' }, [], nos), null)
  // Obligaties nooit, ook niet bij Wired met een codepagina-slug.
  assert.equal(couponPage({ title: 'Zero Coupons: 4% in November 2026', url: 'https://www.wired.com/story/dutch-zero-coupons' }, wired), false)
  assert.equal(couponPage({ title: 'Bond Coupons: 5% for 2026', url: 'https://www.wired.com/story/bond-coupons' }, wired), false)
  assert.equal(couponPage({ title: 'Green coupons: 2.5% at auction', url: 'https://www.wired.com/story/green-bond-coupons' }, wired), false)
})

test('kortingscodes: de 12 live kortingscode-pagina\'s vallen weg bij Wired, op reden kortingscode; bij een andere bron niet', async () => {
  assert.deepEqual(live.map((x) => x.title).sort(), [...LIVE].sort())
  for (const x of live) {
    assert.equal(couponPage(x, wired), true, x.title)
    assert.equal(noiseReason({ title: x.title, link: x.url }, x.cats, wired), 'kortingscode', x.title)
    for (const src of ZONDER) assert.equal(noiseReason({ title: x.title, link: x.url }, x.cats, src), null, `${src?.id}: ${x.title}`)
  }
  // Ook door de echte ophaalroute (rss-parser, loadSource): er blijft niets van over.
  assert.deepEqual(await viaFeed(wired, live), [])
})

test('kortingscodes: nieuws over kortingscodes en de tegenvoorbeelden blijven', async () => {
  for (const x of BLIJFT) {
    assert.equal(couponPage(x, wired), false, x.title)
    for (const src of [wired, ...ZONDER]) assert.equal(isNoise({ title: x.title, link: x.url }, [], src), false, `${src?.id}: ${x.title}`)
  }
  assert.equal((await viaFeed(nos, BLIJFT)).length, new Set(BLIJFT.map((x) => x.url)).size)
})

test('kortingscodes: bron, kop en slug moeten alle drie gelden', () => {
  const kop = 'Nike Promo Codes and Discounts: 30% for November 2026'
  const url = 'https://www.wired.com/story/nike-promo-code/'
  assert.equal(couponHead(kop), true)
  assert.equal(couponSlug(url), true)
  assert.equal(couponPage({ title: kop, url }, wired), true)
  assert.equal(couponPage({ title: kop, link: url }, wired), true) // feeditem: link
  assert.equal(couponPage({ title: kop, url }), false) // geen bron
  assert.equal(couponPage({ title: kop, url }, nos), false) // bron zet het niet aan
  assert.equal(couponPage({ title: kop, url }, { ...nos, couponPages: 'ja' }), false) // alleen true telt
  assert.equal(couponPage({ title: kop, url: 'https://www.wired.com/story/nike-earnings-q3/' }, wired), false)
  assert.equal(couponPage({ title: 'Nike Reports Lower Sales', url }, wired), false)
  assert.equal(couponPage({ title: kop }, wired), false)
  assert.equal(couponPage({}, wired), false)
  assert.equal(couponPage(null, wired), false)
})

test('kortingscodes: het codewoord in het openingsdeel van de kop, de slug eindigt op "<naam>-<codewoord>"', () => {
  for (const t of ['Wayfair Coupons: Up to 80% Off', 'Design Within Reach Promo Codes: 30% Off', 'Visible Promo Codes and Coupons for November 2026',
    'B&H Photo Promo Codes and Deals This November 2026', 'Hydrow Discount Code | Save $150', 'Factor Promo Code: 50% Off Off Meal Prep',
    'Naturepedic Promo Codes: Get 20% Off Plus Free Pillows', 'Lovehoney Coupon Offers: 70% Off', "Sam's Club Promo Codes and Membership Deals for November 2026"]) assert.equal(couponHead(t), true, t)
  for (const t of ['Nike: 30% Off With Promo Code', 'Rechtbank: kortingscodes zijn reclame', 'Couponing Is Back',
    'Acme Voucher Codes – 10% Off', 'Zalando Kortingscode: 20 procent korting', '', 'Zero coupons: 4% in 2026', 'Coupon rates: 5% in November 2026',
    'Bond coupons for 2026', 'Staatsobligaties coupons: 3 procent in 2026']) assert.equal(couponHead(t), false, t)
  for (const u of ['https://www.wired.com/story/nike-promo-code/', 'https://www.wired.com/story/nordvpn-coupon/', 'https://www.wired.com/story/valvoline-coupons/',
    'https://www.wired.com/story/airdoctor-coupon-code/', 'https://www.wired.com/story/t-mobile-business-promo-code/', 'https://www.wired.com/story/office-depot-promo-codes/',
    'https://www.wired.com/story/hydrow-discount-code/', 'https://www.wired.com/story/nike-promo-code-2/', 'https://www.wired.com/story/nike-promo-code?utm=1']) assert.equal(couponSlug(u), true, u)
  for (const u of ['https://www.wired.com/coupons/home-depot/', 'https://www.wired.com/story/promo-codes', 'https://www.wired.com/story/coupon',
    'https://techcrunch.com/2026/11/12/honey-sued-coupon-codes-creators/', 'https://www.example.test/news/ftc-sues-company-over-fake-coupon-codes',
    'https://www.ad.nl/koopjes/zalando-kortingscode~a1/', 'https://www.example.test/deals/acme-vouchers.html', 'https://www.wired.com/story/promo-code-scam/',
    'https://www.wired.com/story/dutch-zero-coupons', 'https://www.example.test/', 'geen link', '']) assert.equal(couponSlug(u), false, u)
  assert.equal(openingOf('Factor Promo Code: 50% Off'), 'Factor Promo Code')
  assert.equal(slugOf('https://www.ad.nl/koopjes/zalando-kortingscode~a1/'), 'zalando-kortingscode')
})

test('kortingscodes: geen gelabeld nieuwsstuk valt weg; wat wegvalt in de sets is gelabeld als deal', () => {
  const nieuws = labels.filter((x) => x.label === 'N')
  assert.ok(nieuws.length >= 1027, `${nieuws.length} nieuwskoppen`)
  // Strengst denkbaar: de Wired-regel op elk gelabeld stuk, van welke bron ook.
  assert.deepEqual(nieuws.filter((x) => isNoise({ title: x.title, link: x.url }, x.cats || [], wired)).map((x) => `${x.set}: ${x.title}`), [])
  const weg = labels.filter((x) => couponPage(x, wired))
  assert.ok(weg.length >= 8, `${weg.length} kortingscode-pagina's in de sets`)
  assert.deepEqual(weg.filter((x) => x.label !== 'W').map((x) => `${x.label}: ${x.title}`), [])
})

test('kortingscodes: in alle bewaarde feeds en sets (tests/fixtures) valt alleen een kortingscode-pagina weg', () => {
  const seen = new Map()
  for (const f of readdirSync(dir).filter((f) => /\.json(\.gz)?$/.test(f))) {
    const buf = readFileSync(new URL(f, dir))
    const data = JSON.parse((f.endsWith('.gz') ? gunzipSync(buf) : buf).toString('utf8'))
    ;(function walk(o) {
      if (!o || typeof o !== 'object') return
      if (Array.isArray(o)) return o.forEach(walk)
      const url = o.url || o.link
      if (typeof o.title === 'string' && typeof url === 'string') seen.set(`${o.title}|${url}`, { title: o.title, url, label: o.label, f })
      Object.values(o).forEach(walk)
    })(data)
  }
  assert.ok(seen.size > 5000, `${seen.size} stukken`)
  const weg = [...seen.values()].filter((x) => couponPage(x, wired)) // de Wired-regel op alles: het strengst
  // Alleen de live fixtures (Wired, ongelabeld) en stukken gelabeld als deal (W).
  assert.deepEqual(weg.filter((x) => !(x.label === 'W' || (/^(kortingscodes|wired-deals)-/.test(x.f) && !x.label))).map((x) => `${x.f}: ${x.title}`), [])
  assert.deepEqual(weg.filter((x) => x.label == null).map((x) => new URL(x.url).hostname).filter((h) => h !== 'www.wired.com'), [])
})

test('kortingscodes: een al bewaarde kortingscode-pagina komt niet terug in de Stroom; het nieuws wel', () => {
  const now = Date.parse('2026-11-12T08:00:00Z')
  const at = new Date(now - 36e5).toISOString()
  const page = { id: 'k1', source: 'wired', title: LIVE[0], url: live[0].url, publishedAt: at }
  const news = { id: 'n1', source: 'wired', title: 'Pete Hegseth Is About to Get His Ass Kicked', url: 'https://www.wired.com/story/pete-hegseth-is-about-to-get-his-ass-kicked/', publishedAt: at }
  assert.deepEqual(mergeSource([], [page, news], { now }).map((i) => i.id), ['n1'])
  const [g] = withLatest([{ id: 'wired', items: [] }], { wired: [page, news] }, { now })
  assert.deepEqual(g.items.map((i) => i.id), ['n1'])
  // Dezelfde kop en link van een bron die het niet aanzet, blijft.
  const elders = { ...page, id: 'k2', source: 'nos' }
  assert.deepEqual(mergeSource([], [elders, news], { now }).map((i) => i.id).sort(), ['k2', 'n1'])
  const [h] = withLatest([{ id: 'nos', items: [] }], { nos: [{ ...elders, source: undefined }] }, { now })
  assert.deepEqual(h.items.map((i) => i.id), ['k2'])
})

test('kortingscodes: een kortingscode-pagina neemt geen plek in het venster in', async () => {
  const news = [1, 2, 3].map((n) => ({ title: `Nieuwsstuk ${n} over de begroting`, url: `https://www.wired.com/story/nieuws-${n}/`, cats: ['Politics'] }))
  const got = await viaFeed(wired, [...live.slice(0, 5), ...news], 3)
  assert.deepEqual(got.map((i) => i.title), news.map((x) => x.title))
})
