// Redacteur · ruis (11 november 2026). De ophaalfilter (isNoise, netlify/lib/rss.mjs) weert alleen nog wat zeker geen nieuws
// is, op een harde aanwijzing van de uitgever: reclame (feedcategorie, reclamerubriek, reclamelabel vooraan), persberichten,
// puzzels, versie-overzichten, eigen acties, lege en dubbele items. Nooit op een woord in de kop. Eis van Alex: er valt nooit
// nieuws onterecht weg, niet uit de Stroom en niet uit de Editie; een gemiste deal of reclame is acceptabel.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isNoise, noiseReason, loadSource } from '../netlify/lib/rss.mjs'
import { toClient } from '../netlify/lib/build.mjs'
import { excludedFromEdition, hardMark } from '../shared/editie-filter.mjs'
import { weakSignal } from '../netlify/lib/editie-ai.mjs'

const read = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')).items
const all = [...read('editie-filters-sets.json'), ...read('ruis-labels.json')]
const nieuws = all.filter((x) => x.label === 'N')

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const xmlItem = (x) => `<item><title>${esc(x.title)}</title><link>${esc(x.url)}</link><description>${esc(x.summary)}</description>${(x.cats || []).map((c) => `<category>${esc(c)}</category>`).join('')}</item>`
async function viaFeed(items) {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Proef</title>${items.map(xmlItem).join('\n')}</channel></rss>`
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    const r = await loadSource({ id: 'proef', name: 'Proef', cat: 'nl', lang: 'nl', urls: ['https://example.test/feed'] }, Promise.resolve({}), { limit: Infinity })
    assert.equal(r.ok, true, r.error)
    return r.items
  } finally {
    globalThis.fetch = orig
  }
}

test('ruis: geen enkele gelabelde nieuwskop valt bij het ophalen weg (alle keuringen, corpora en AI-keuring 1 en 2)', async () => {
  assert.ok(nieuws.length >= 1027, `${nieuws.length} nieuwskoppen`)
  assert.deepEqual(nieuws.filter((x) => isNoise({ title: x.title, link: x.url })).map((x) => `${x.set}: ${x.title}`), [])
  // Ook door de echte ophaalroute (rss-parser, loadSource): elke nieuwslink komt terug.
  const unique = [...new Map(nieuws.map((x) => [x.url, x])).values()]
  const got = new Set((await viaFeed(unique)).map((i) => i.url))
  assert.deepEqual(unique.filter((x) => !got.has(x.url)).map((x) => `${x.set}: ${x.title}`), [])
})

test('ruis: de koppen die de oude woordfilter weerde, staan nu in de Stroom', () => {
  for (const [title, url] of [
    ['ACM start onderzoek naar nepkortingen bij vijf grote webwinkels voor Black Friday', 'https://nos.nl/artikel/2643101-acm'],
    ['EU regulators warn retailers over fake Black Friday discounts', 'https://www.example.test/world/eu-black-friday'],
    ['FTC sues Amazon over Prime Day ‘deal’ badges', 'https://www.example.test/tech/ftc-prime-day'],
    ['Bitcoin slides 30% off record high', 'https://www.example.test/markets/bitcoin'],
    ['Kortingscode-fraude: politie pakt bende op', 'https://www.example.test/binnenland/kortingscode-fraude'],
    ['Techbeurs Nasdaq veert weer op na massale uitverkoop', 'https://www.rtl.nl/nieuws/economie/artikel/5663566/techbeurs'],
    ['Checks and Balance newsletter: What comes next after the midterms?', 'https://www.economist.com/united-states/2026/11/07/checks-and-balance-newsletter'],
  ]) assert.equal(isNoise({ title, link: url }), false, title)
  // Een feedcategorie die een onderwerp is, weert niet (Politico: "Software", The Guardian: "Shopping", "Advertising").
  assert.equal(isNoise({ title: 'EU needs a system to respond to AI incidents', link: 'https://www.politico.eu/article/eu-ai-incidents/' }, ['Artificial Intelligence', 'Software']), false)
  assert.equal(isNoise({ title: 'Gotta buy ’em all: Pokémon card collecting', link: 'https://www.theguardian.com/games/2026/nov/07/pokemon' }, ['Pokémon', 'Collecting', 'Shopping']), false)
  assert.equal(isNoise({ title: 'Ad agencies brace for AI', link: 'https://www.theguardian.com/media/2026/nov/07/ads' }, ['Advertising']), false)
  assert.equal(isNoise({ title: 'Deal', link: 'https://www.example.test/a' }, ['Deals']), false) // ook een overnamecategorie
})

test('ruis: echte reclame en geen-berichten blijven uit de Stroom', async () => {
  const weg = [
    { title: 'Evolving metal extraction processes', url: 'https://www.technologyreview.com/2026/11/10/1147726/evolving-metal-extraction-processes/', cats: ['Engineering', 'sponsored'], waarom: 'categorie' },
    { title: 'How Health Systems Can Spot Risk Before a Crisis', url: 'https://www.politico.eu/sponsored-content/how-health-systems-can-spot-risk/', waarom: 'rubriek' },
    { title: 'Een miljoen Bijbels. En dat ene meisje.', url: 'https://www.nd.nl/partnercontent/partnercontent/1336804/nbg-een-miljoen-bijbels', waarom: 'rubriek' },
    { title: 'De beste reis van je leven', url: 'https://www.example.test/advertorial/reizen-naar-japan', waarom: 'rubriek' },
    { title: 'Zo bespaar je energie', url: 'https://www.example.test/partner/energie-besparen', waarom: 'rubriek' },
    { title: 'Advertentie: zo kies je de beste hypotheek', url: 'https://www.example.test/geld/hypotheek', waarom: 'label' },
    { title: 'Sponsored | The future of cloud', url: 'https://www.example.test/tech/cloud', waarom: 'label' },
    { title: 'Partner content: groen wonen', url: 'https://www.example.test/wonen/groen', waarom: 'label' },
    { title: 'Sign up for the Breakdown newsletter: our free rugby email', url: 'https://www.theguardian.com/sport/2016/aug/18/sign-up-to-the-breakdown', cats: ['Rugby union', 'Newsletter sign-up'], waarom: 'categorie' },
    { title: 'Sudoku', url: 'https://www.nrc.nl/puzzels/sudoku/2026/11/11/', waarom: 'rubriek' },
    { title: 'Software-update - Visual Studio Code 1.146.0', url: 'https://tweakers.net/downloads/79036/visual-studio-code-11460.html', cats: ['Software'], waarom: 'rubriek' },
    { title: '.Actie - Vijf tweakers testten een ssd: maak kans op een exemplaar!', url: 'https://tweakers.net/plan/4872/ssd-actie.html', cats: ['.actie'], waarom: 'categorie' },
    { title: 'The Atlantic Announces New Staff Writers', url: 'https://www.theatlantic.com/press-releases/2026/11/hiring-news/684900/', waarom: 'rubriek' },
  ]
  for (const x of weg) assert.equal(noiseReason({ title: x.title, link: x.url }, x.cats || []), x.waarom, x.title)
  const nieuwsProef = { title: 'Kabinet valt over stikstof', url: 'https://nos.nl/artikel/1-kabinet', summary: 'De coalitie is gevallen.' }
  const got = await viaFeed([...weg, nieuwsProef, nieuwsProef, { title: '', url: 'https://example.test/leeg' }, { title: 'Kapot', url: 'javascript:alert(1)' }])
  // Alleen het nieuws, één keer (dubbel weg), zonder lege of kapotte items.
  assert.deepEqual(got.map((i) => i.title), ['Kabinet valt over stikstof'])
})

test('ruis: alleen een rubriek telt, nooit de slug; een reclamelabel alleen vooraan', () => {
  for (const [title, url] of [
    ['Ex-partner van zanger aangehouden', 'https://www.example.nl/show/ex-partner-van-zanger'],
    ['Persbericht van ministerie bleek onjuist', 'https://www.example.nl/politiek/persbericht-ministerie-onjuist'],
    ['Downloads van illegale films nemen toe', 'https://www.example.nl/tech/downloads-illegale-films'],
    ['Puzzel rond formatie wordt groter', 'https://www.example.nl/politiek/puzzel-formatie'],
    ['Commerce secretary resigns', 'https://www.example.test/politics/2026/11/11/commerce-secretary-resigns'],
    ['Sponsored content on TikTok under EU scrutiny', 'https://www.example.test/tech/sponsored-content-tiktok'],
    ['Waarom advertentie-inkomsten van kranten dalen', 'https://www.example.nl/media/advertenties-kranten'],
    ['Ondernemers: “Partner content is de toekomst”', 'https://www.example.nl/media/partner-content-toekomst'],
  ]) assert.equal(isNoise({ title, link: url }), false, title)
})

test('ruis: in de Editie weert alleen A (harde aanwijzing); geen gelabelde nieuwskop valt weg, op de bekende randgevallen na', async () => {
  const unique = [...new Map(nieuws.map((x) => [x.url, x])).values()]
  const byUrl = new Map(unique.map((x) => [x.url, x]))
  const items = (await viaFeed(unique)).map((i) => {
    const x = byUrl.get(i.url)
    return toClient({ ...i, ...(x.borrowedFrom ? { borrowedFrom: x.borrowedFrom } : {}) })
  })
  const weg = items.filter((i) => excludedFromEdition(i)).map((i) => `${byUrl.get(i.url).set}: ${i.title}`)
  // Alleen de randgevallen van AI-keuring 1 en 2 (bekende ontwerprisico's van A, geen eis en vastgelegd in AI-VERSLAG.md en
  // AI-KEURING-2.md: "/deals/" als eerste segment, "Podcast:" vooraan, een podcastrubriek of "Luister:" zonder eigen intro).
  assert.deepEqual(weg.filter((w) => !/^ai-k[12]-rand:/.test(w)), [])
  assert.ok(weg.length <= 5, weg.join('\n'))
})

test('ruis: wat de oude woordfilter als deal weerde, gaat nu naar de Editie-route: A of de AI (zwak signaal)', () => {
  // De oude woordregels, alleen hier als meetlat (niet meer in de code).
  const OUD = /\b(prime day|black friday|cyber monday|singles day|promo codes?|coupon codes?|gift guides?|best gifts?|gifts? for (him|her|men|women|kids|dads?|moms?))\b|\bbest\b.*\bdeals\b|\bdeals\b.*(\bsave\b|\$\d|\bunder \$)|\d+ ?(%|percent) off\b|\b(aanbiedingen?|in de aanbieding|kortingscodes?|dagdeals?|prijsfouten?|uitverkoop|koopjes|tijdelijk (goedkoper|in prijs verlaagd)|nu \d+ ?% korting)\b|\b\w+-deals\b/i
  const deals = all.filter((x) => x.label === 'W' && OUD.test(x.title))
  assert.ok(deals.length >= 100, `${deals.length}`)
  const art = (x) => ({ kind: 'article', ...x })
  assert.deepEqual(deals.filter((x) => !isNoise({ title: x.title, link: x.url }) && !hardMark(art(x)) && !weakSignal(art(x))).map((x) => x.title), [])
  // En voor de live koppen die de oude filter weerde (11 november, 20:00): allemaal een zwak signaal.
  for (const title of ['The 22 Best Early Black Friday Deals: Our Ultimate Picks (2026)', 'Home Depot Promo Codes: 30% Off in November 2026', 'Sharge’s eye-catching MacBook charger is over 25 percent off', 'Best Gifts for Hikers, Backpackers, Outdoorsy People (2026)', 'Kitchen Gear From Our Place Is Steeply Discounted', 'Visible Promo Codes and Coupons for November 2026']) assert.ok(weakSignal({ title }), title)
})
