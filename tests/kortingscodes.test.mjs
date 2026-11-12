// Redacteur · kortingscodes (12 november 2026). Besluit van Alex: kortingscode-pagina's uit de Stroom, en dus nooit in de
// Editie. Generiek en dubbel (netlify/lib/kortingscode.mjs): de kop opent met "<naam> <kortingscodewoord>" én de slug is
// "<naam>-<kortingscodewoord>". Reden bij de telling: 'kortingscode'. Norm: er valt nooit nieuws weg; bij twijfel blijft het staan.
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

test('kortingscodes: beide moeten gelden; kop alleen of slug alleen weert niets', () => {
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
    'Bol Kortingscodes voor december', 'Acme Voucher Codes – 10% Off']) assert.equal(couponHead(t), true, t)
  for (const t of ['Promo codes scam: police warn', 'Kortingscode-fraude: politie pakt bende op', 'Rechtbank: kortingscodes zijn reclame',
    'Honey sued over coupon codes by YouTube creators', 'Fake coupon codes for Black Friday flood TikTok', 'Kortingscodes op TikTok blijken nep',
    'Why one two three four five coupons', 'Couponing Is Back', 'Lovehoney Coupon Offers: 70% Off', 'Nep-kortingscodes via Telegram', '']) assert.equal(couponHead(t), false, t)
  // slug: hooguit 4 woorden en dan het woord, als laatste
  for (const u of ['https://www.wired.com/story/nike-promo-code/', 'https://www.wired.com/story/nordvpn-coupon/', 'https://www.wired.com/story/valvoline-coupons/',
    'https://www.wired.com/story/airdoctor-coupon-code/', 'https://www.wired.com/story/t-mobile-business-promo-code/', 'https://www.ad.nl/koopjes/zalando-kortingscode~a1/',
    'https://www.example.test/deals/acme-vouchers.html', 'https://www.example.test/x/acme-voucher-codes?utm=1']) assert.equal(couponSlug(u), true, u)
  for (const u of ['https://www.wired.com/coupons/home-depot/', 'https://techcrunch.com/2026/11/12/honey-sued-coupon-codes-creators/',
    'https://www.example.test/news/ftc-sues-company-over-fake-coupon-codes', 'https://www.nu.nl/binnenland/6418005/kortingscode-fraude.html',
    'https://www.example.test/coupon', 'https://www.example.test/', 'geen link', '']) assert.equal(couponSlug(u), u === 'https://www.example.test/coupon', u)
  assert.equal(openingOf('Factor Promo Code: 50% Off'), 'Factor Promo Code')
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
