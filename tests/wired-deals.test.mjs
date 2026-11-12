// Redacteur · wired-deals (11 november 2026). Besluit van Alex: Wired-deals gaan uit de Stroom, alleen op Wired's eigen
// markering. Per bron (sources.mjs: `dealsCategory`), nu alleen Wired, op de feedcategorie "Gear / Deals", en alleen als de
// feed het stuk uitsluitend zo indeelt (die rubriek en hoogstens "Gear"). Nooit op een woord in de kop of de link.
// Norm: er valt nooit nieuws weg; bij twijfel blijft het staan.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isNoise, noiseReason, sourceDeal, loadSource } from '../netlify/lib/rss.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

const fixture = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')).items
const wired = SOURCES.find((s) => s.id === 'wired')
const live = fixture('wired-deals-2026-11-11.json')
const labels = [...fixture('editie-filters-sets.json'), ...fixture('ruis-labels.json')]

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const xmlItem = (x) => `<item><title>${esc(x.title)}</title><link>${esc(x.url)}</link>${(x.cats || []).map((c) => `<category>${esc(c)}</category>`).join('')}</item>`
async function viaFeed(src, items) {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Proef</title>${items.map(xmlItem).join('\n')}</channel></rss>`
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    const r = await loadSource({ ...src, urls: ['https://example.test/feed'] }, Promise.resolve({}), { limit: Infinity })
    assert.equal(r.ok, true, r.error)
    return r.items
  } finally {
    globalThis.fetch = orig
  }
}

// Alles wat in de ruwe Wired-RSS van 11 november wegvalt (hoofdfeed 16, tag/deals 3 erbij): allemaal deals of promocodes.
const WEG = [
  'The 22 Best Early Black Friday Deals: Our Ultimate Picks (2026)',
  'Early Black Friday Deals Under $100 (2026)',
  'Best Buy Discount Codes: 60% Off',
  'Ulta Promo Codes: Up to 20% Off in November 2026',
  'Google Workspace Promo Codes: 14% Off for November 2026',
  'Noom Promo Codes: 50% Off Best Deals for November 2026',
  'Vivid Seats Promo Codes and Deals: Get 10% Off',
  'T-Mobile Promo Codes: 25% Off | November 2026',
  'Best Early Amazon Black Friday Deals (2026)',
  'Kitchen Gear From Our Place Is Steeply Discounted',
  'Rover Promo Codes and Referral Deals for November 2026',
  'Naturepedic Promo Codes: Get 20% Off Plus Free Pillows',
  "Sam's Club Promo Codes and Membership Deals for November 2026",
  'Office Depot Coupons: $20 Off November 2026',
  'Valvoline Coupons and Promo Codes for November 2026',
  'Barkbox Promo Codes and Discounts: Up to 50% Off',
  'Ecoflow Rapid Pro Power Bank Deal: Save $80',
  'Best Skylight Calendar Alternative on Sale: Save $100 on Everblog HomeCal (2026)',
  'Quince’s Merino Wool Tee Doesn’t Cost a Fortune',
]

test('wired-deals: Wired heeft de instelling, geen andere bron', () => {
  assert.equal(wired.dealsCategory, 'Gear / Deals')
  assert.deepEqual(SOURCES.filter((s) => s.dealsCategory).map((s) => s.id), ['wired'])
})

test('wired-deals: uit de live Wired-RSS valt precies de lijst weg, allemaal op de eigen markering', async () => {
  const weg = live.filter((x) => isNoise({ title: x.title, link: x.url }, x.cats, wired))
  assert.deepEqual(weg.map((x) => x.title).sort(), [...WEG].sort())
  for (const x of weg) assert.equal(noiseReason({ title: x.title, link: x.url }, x.cats, wired), 'bron-aanbod', x.title)
  // Ook door de echte ophaalroute (rss-parser, loadSource).
  const got = new Set((await viaFeed(wired, live)).map((i) => i.title))
  assert.deepEqual(live.filter((x) => !got.has(x.title)).map((x) => x.title).sort(), [...WEG].sort())
})

test('wired-deals: Wired-journalistiek over deals en prijzen blijft (Gear / Deals mét een andere rubriek)', () => {
  for (const title of ['$1,200 Off the iPhone Duo? Here’s How Carrier Deals Actually Work', 'The New M6 MacBook Pro Has a Serious Price Problem']) {
    const x = live.find((i) => i.title === title)
    assert.ok(x && x.cats.includes('Gear / Deals'), title)
    assert.equal(isNoise({ title: x.title, link: x.url }, x.cats, wired), false, title)
  }
})

test('wired-deals: geen gelabeld nieuwsstuk valt weg, ook niet met de categorieën uit de feed', () => {
  const nieuws = labels.filter((x) => x.label === 'N')
  const cats = new Map(live.map((x) => [x.url, x.cats]))
  const weg = nieuws.filter((x) => isNoise({ title: x.title, link: x.url }, cats.get(x.url) || x.cats || [], wired))
  assert.deepEqual(weg.map((x) => `${x.set}: ${x.title}`), [])
  // De twee gelabelde Wired-nieuwsstukken met Gear / Deals in de feed zitten er echt in.
  assert.ok(nieuws.filter((x) => (cats.get(x.url) || []).includes('Gear / Deals')).length >= 2)
})

test('wired-deals: een Wired-nieuwsstuk met "deal" in de kop maar zonder markering blijft', async () => {
  const items = [
    { title: 'The 2,000-Nit OLED in Apple’s New MacBook Is a Big Deal', url: 'https://www.wired.com/story/the-2000-nit-oled-in-apples-new-macbook-pro-is-a-big-deal/', cats: ['Gear', 'Gear / Gear News and Events'] },
    { title: 'Black Friday Deals Are Getting Worse. The FTC Wants to Know Why', url: 'https://www.wired.com/story/ftc-black-friday-deals-probe/', cats: ['Business', 'Business / Regulation'] },
    { title: 'Microsoft’s $20 Billion Deal for an AI Startup Draws EU Scrutiny', url: 'https://www.wired.com/story/microsoft-ai-deal-eu/', cats: ['Business', 'Business / Artificial Intelligence'] },
    { title: 'Prime Day Deals Explained', url: 'https://www.wired.com/story/deals/prime-day-explained/', cats: [] }, // woord in link of kop telt niet
    { title: 'Home Depot Promo Codes: 30% Off in November 2026', url: 'https://www.wired.com/story/home-depot-promo-code/', cats: ['Gear'] }, // geen markering: blijft (een gemiste deal mag)
  ]
  for (const x of items) assert.equal(isNoise({ title: x.title, link: x.url }, x.cats, wired), false, x.title)
  assert.equal((await viaFeed(wired, items)).length, items.length)
})

test('wired-deals: een andere bron met "Business / Deals" of zelfs "Gear / Deals" blijft (de regel is per bron)', async () => {
  const ft = SOURCES.find((s) => s.id === 'ft') || { id: 'andere', name: 'Andere', cat: 'business', lang: 'en' }
  const items = [
    { title: 'Private equity deals hit record as rates fall', url: 'https://www.example.test/companies/pe-deals', cats: ['Business', 'Business / Deals'] },
    { title: 'Merger talks collapse', url: 'https://www.example.test/companies/merger', cats: ['Deals'] },
    { title: 'Ook hier: Gear / Deals', url: 'https://www.example.test/gear/x', cats: ['Gear', 'Gear / Deals'] },
  ]
  for (const src of [ft, { id: 'zonder' }, null]) for (const x of items) assert.equal(isNoise({ title: x.title, link: x.url }, x.cats, src), false, `${src?.id}: ${x.title}`)
  assert.equal((await viaFeed(ft, items)).length, items.length)
  // En bij Wired valt een overnamerubriek ook niet onder "Gear / Deals".
  assert.equal(isNoise({ title: items[0].title, link: items[0].url }, items[0].cats, wired), false)
})

test('wired-deals: sourceDeal kijkt alleen naar de exacte rubriek en haar bovenrubriek', () => {
  const src = { dealsCategory: 'Gear / Deals' }
  assert.equal(sourceDeal(src, ['Gear / Deals']), true)
  assert.equal(sourceDeal(src, [' gear ', 'GEAR / DEALS']), true)
  assert.equal(sourceDeal(src, ['Gear', 'Gear / Deals', 'Gear / Products / Phones']), false)
  assert.equal(sourceDeal(src, ['Gear', 'Gear / Deals', 'Business']), false)
  assert.equal(sourceDeal(src, ['Gear / Deals / Extra']), false)
  assert.equal(sourceDeal(src, ['Deals']), false)
  assert.equal(sourceDeal(src, ['Gear']), false)
  assert.equal(sourceDeal(src, []), false)
  assert.equal(sourceDeal({}, ['Gear', 'Gear / Deals']), false)
  assert.equal(sourceDeal(null, ['Gear', 'Gear / Deals']), false)
})
