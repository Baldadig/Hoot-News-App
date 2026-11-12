// Redacteur · kortingscodes (12 november 2026). Besluit van Alex: kortingscode-pagina's uit de Stroom, en dus nooit in de
// Editie. Generiek en drievoudig (netlify/lib/kortingscode.mjs): de kop opent met "<naam> <kortingscodewoord>", de slug is
// "<naam>-<kortingscodewoord>" én na de dubbele punt staat een aanbod (korting, gratis verzending of een periode), geen zin. Reden bij de telling: 'kortingscode'. Norm: er valt nooit nieuws weg; bij twijfel blijft het staan.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { isNoise, noiseReason, loadSource } from '../netlify/lib/rss.mjs'
import { mergeSource, withLatest } from '../netlify/lib/stream.mjs'
import { couponPage, couponHead, couponSlug, openingOf, slugOf, tailOf } from '../netlify/lib/kortingscode.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

const dir = new URL('./fixtures/', import.meta.url)
const fixture = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')).items
const live = fixture('kortingscodes-2026-11-12.json')
const labels = [...fixture('editie-filters-sets.json'), ...fixture('ruis-labels.json')]
const wired = SOURCES.find((s) => s.id === 'wired')
const nos = SOURCES.find((s) => s.id === 'nos') || { id: 'nos', name: 'NOS', cat: 'nl', lang: 'nl' }

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

test('kortingscodes: de 32 aanvalskoppen uit keuring 1 en de 11 gelabelde valkuilen blijven, bij elke bron', async () => {
  assert.equal(AANVAL.length, 32)
  assert.equal(VALKUILEN.length, 11)
  for (const x of [...AANVAL, ...VALKUILEN]) {
    assert.equal(couponPage(x), false, x.title)
    for (const src of [wired, nos, null]) assert.equal(noiseReason({ title: x.title, link: x.url }, [], src), null, `${src?.id}: ${x.title}`)
  }
  const uniek = new Map([...AANVAL, ...VALKUILEN].map((x) => [x.url, x]))
  assert.equal((await viaFeed(nos, [...uniek.values()])).length, uniek.size)
})

test('kortingscodes: dezelfde onderwerpkop met een aanbod achter de dubbele punt valt wel weg (alle drie)', () => {
  // Vorm 1 en 2 gelijk aan de aanvalskoppen; alleen de staart verschilt. Zo zie je dat de staart het verschil maakt.
  assert.equal(couponPage({ title: 'Temu Coupons: 30% Off | November 2026', url: 'https://www.reuters.com/technology/temu-coupons' }), true)
  assert.equal(couponPage({ title: 'Temu coupons: EU opens formal investigation', url: 'https://www.reuters.com/technology/temu-coupons' }), false)
  assert.equal(couponPage({ title: 'Kortingscodes: 20 procent korting', url: 'https://nos.nl/artikel/2641111-acm-kortingscodes' }), true)
  assert.equal(couponPage({ title: 'Kortingscodes: ACM tikt webwinkels op de vingers', url: 'https://nos.nl/artikel/2641111-acm-kortingscodes' }), false)
  // Obligaties nooit, ook niet met een periode of percentage.
  assert.equal(couponPage({ title: 'Zero Coupons: 4% in November 2026', url: 'https://fd.nl/x/zero-coupons' }), false)
  assert.equal(couponPage({ title: 'Bond Coupons: 5% for 2026', url: 'https://www.ft.com/content/bond-coupons' }), false)
})

test('kortingscodes: de 12 live kortingscode-pagina\'s vallen weg, op reden kortingscode, bij elke bron', async () => {
  assert.deepEqual(live.map((x) => x.title).sort(), [...LIVE].sort())
  for (const x of live) {
    assert.equal(couponPage(x), true, x.title)
    for (const src of [wired, nos, null]) assert.equal(noiseReason({ title: x.title, link: x.url }, x.cats, src), 'kortingscode', `${src?.id}: ${x.title}`)
  }
  // Ook door de echte ophaalroute (rss-parser, loadSource): er blijft niets van over.
  assert.deepEqual(await viaFeed(wired, live), [])
})

test('kortingscodes: nieuws over kortingscodes en de tegenvoorbeelden blijven', async () => {
  for (const x of BLIJFT) {
    assert.equal(couponPage(x), false, x.title)
    for (const src of [wired, nos, null]) assert.equal(isNoise({ title: x.title, link: x.url }, [], src), false, `${src?.id}: ${x.title}`)
  }
  assert.equal((await viaFeed(nos, BLIJFT)).length, new Set(BLIJFT.map((x) => x.url)).size)
})

test('kortingscodes: kop (met aanbod) en slug moeten allebei gelden; kop alleen of slug alleen weert niets', () => {
  const kop = 'Nike Promo Codes and Discounts: 30% for November 2026'
  assert.equal(couponHead(kop), true)
  assert.equal(couponSlug('https://www.wired.com/story/nike-promo-code/'), true)
  assert.equal(couponPage({ title: kop, url: 'https://www.wired.com/story/nike-earnings-q3/' }), false)
  assert.equal(couponPage({ title: 'Nike Reports Lower Sales', url: 'https://www.wired.com/story/nike-promo-code/' }), false)
  assert.equal(couponPage({ title: kop, link: 'https://www.wired.com/story/nike-promo-code/' }), true) // feeditem: link
  assert.equal(couponPage({ title: kop }), false)
  assert.equal(couponPage({}), false)
  assert.equal(couponPage(null), false)
})

test('kortingscodes: de kop opent met de naam en het woord, de slug eindigt erop', () => {
  // kop: het woord in het openingsdeel, hooguit 4 woorden ervoor, erna niets, een opsomming of een periode
  for (const t of ['Wayfair Coupons: Up to 80% Off', 'Design Within Reach Promo Codes: 30% Off', 'Kortingscode: 20 procent korting bij Zalando',
    'Visible Promo Codes and Coupons for November 2026', 'B&H Photo Promo Codes and Deals This November 2026', 'Hydrow Discount Code | Save $150',
    'Bol Kortingscodes voor december', 'Acme Voucher Codes – 10% Off', 'Vitamix Promo Codes and Deals: $25 Off + Free Shipping',
    'NordVPN Coupons: 75% Off, Plus 3 Months Free in November 2026', 'Factor Promo Code: 50% Off Off Meal Prep', 'Acme Coupons: gratis verzending',
    'Acme Coupons: November 2026', 'Hydrow Discount Code: Save Up to $150 | November 2026', "Sam's Club Promo Codes and Membership Deals for November 2026"]) assert.equal(couponHead(t), true, t)
  for (const t of ['Promo codes scam: police warn', 'Kortingscode-fraude: politie pakt bende op', 'Rechtbank: kortingscodes zijn reclame',
    'Honey sued over coupon codes by YouTube creators', 'Fake coupon codes for Black Friday flood TikTok', 'Kortingscodes op TikTok blijken nep',
    'Why one two three four five coupons', 'Couponing Is Back', 'Lovehoney Coupon Offers: 70% Off', 'Nep-kortingscodes via Telegram', '',
    // geen aanbod achter de dubbele punt, of helemaal geen staart en geen periode
    'Coupons', 'Influencer promo codes', 'Temu coupons: EU opens formal investigation', 'Temu coupons: 90% off claims are fake, EU says',
    'Amazon coupons: $2 billion settlement', 'Shein coupons — EU fines retailer', 'Netflix promo codes in November 2026: the scam that steals your login',
    'Discount codes for November 2026 flood TikTok, most are fake', 'Grocery coupons and SNAP: what changes in 2026', 'Kortingscodes: ACM tikt webwinkels op de vingers',
    // obligaties
    'Zero coupons: 4% in 2026', 'Coupon rates: 5% in November 2026', 'Bond coupons for 2026']) assert.equal(couponHead(t), false, t)
  // slug: hooguit 4 woorden en dan het woord, als laatste
  for (const u of ['https://www.wired.com/story/nike-promo-code/', 'https://www.wired.com/story/nordvpn-coupon/', 'https://www.wired.com/story/valvoline-coupons/',
    'https://www.wired.com/story/airdoctor-coupon-code/', 'https://www.wired.com/story/t-mobile-business-promo-code/', 'https://www.ad.nl/koopjes/zalando-kortingscode~a1/',
    'https://www.example.test/deals/acme-vouchers.html', 'https://www.example.test/x/acme-voucher-codes?utm=1']) assert.equal(couponSlug(u), true, u)
  for (const u of ['https://www.wired.com/coupons/home-depot/', 'https://techcrunch.com/2026/11/12/honey-sued-coupon-codes-creators/',
    'https://www.example.test/news/ftc-sues-company-over-fake-coupon-codes', 'https://www.nu.nl/binnenland/6418005/kortingscode-fraude.html',
    'https://www.example.test/coupon', 'https://www.example.test/', 'geen link', '']) assert.equal(couponSlug(u), u === 'https://www.example.test/coupon', u)
  assert.equal(openingOf('Factor Promo Code: 50% Off'), 'Factor Promo Code')
  assert.equal(tailOf('Hydrow Discount Code: Save Up to $150 | November 2026'), 'Save Up to $150 | November 2026')
  assert.equal(tailOf('Visible Promo Codes and Coupons for November 2026'), '')
  assert.equal(slugOf('https://www.ad.nl/koopjes/zalando-kortingscode~a1/'), 'zalando-kortingscode')
})

test('kortingscodes: geen gelabeld nieuwsstuk valt weg; wat wegvalt in de sets is gelabeld als deal', () => {
  const nieuws = labels.filter((x) => x.label === 'N')
  assert.ok(nieuws.length >= 1027, `${nieuws.length} nieuwskoppen`)
  assert.deepEqual(nieuws.filter((x) => isNoise({ title: x.title, link: x.url }, x.cats || [], wired)).map((x) => `${x.set}: ${x.title}`), [])
  const weg = labels.filter((x) => couponPage(x))
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
  const weg = [...seen.values()].filter((x) => couponPage(x))
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
})

test('kortingscodes: een kortingscode-pagina neemt geen plek in het venster in', async () => {
  const news = [1, 2, 3].map((n) => ({ title: `Nieuwsstuk ${n} over de begroting`, url: `https://www.wired.com/story/nieuws-${n}/`, cats: ['Politics'] }))
  const got = await viaFeed(wired, [...live.slice(0, 5), ...news], 3)
  assert.deepEqual(got.map((i) => i.title), news.map((x) => x.title))
})
