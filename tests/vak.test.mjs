import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vakWeek, isReading, podcastLabel, cleanTitle, fieldOf, sameSubject, isArticleLink, composeVak, mergePool, VAK_SOURCES, ogImageFrom, wantsOgImage, addOgImages, loadVakItems, vakLang } from '../netlify/lib/vak.mjs'
import { normalizePrefs } from '../src/lib/prefs.js'

// Meta Newsroom staat niet meer bij de bronnen (paste zelden); als bedrijfsblog blijft hij handig in de test.
const META = { id: 'vak:meta', name: 'Meta Newsroom', kind: 'officieel', fields: ['paid-social'], urls: ['https://about.fb.com/feed/'], cat: 'vak', filter: true }
const SOURCES = [...VAK_SOURCES, META]
const src = (id) => SOURCES.find((s) => s.id === 'vak:' + id)

test('de week loopt van maandag 07:00 tot maandag 07:00 (Amsterdam), ook rond de wintertijd', () => {
  // Vrijdag 23 oktober 2026: de laatste Vakweek is die van 12 t/m 18 oktober (week 42 begint op 12/10).
  const w = vakWeek(Date.parse('2026-10-23T10:00:00Z'))
  assert.equal(w.from, '2026-10-12T05:00:00.000Z') // 07:00 zomertijd
  assert.equal(w.to, '2026-10-19T05:00:00.000Z')
  assert.equal(w.next, '2026-10-26T06:00:00.000Z') // na de klokwissel: 07:00 = 06:00 UTC
  assert.equal(w.id, '2026-W42')
  // Maandag 06:59 is nog de oude week, 07:00 de nieuwe.
  assert.equal(vakWeek(Date.parse('2026-10-26T05:59:00Z')).id, '2026-W42')
  assert.equal(vakWeek(Date.parse('2026-10-26T06:00:00Z')).id, '2026-W43')
})

test('alleen leesstukken: geen podcast, webinar, nieuwsoverzicht of lijstje', () => {
  assert.equal(isReading({ title: 'Choose an Audience for Each Ad Creative' }), true)
  assert.equal(isReading({ title: 'Smashing Podcast Episode 12 with Jane' }), false)
  assert.equal(isReading({ title: 'Join our webinar on Advantage+' }), false)
  assert.equal(isReading({ title: '12 Best Figma Plugins for 2026' }), false)
  assert.equal(isReading({ title: 'Updating to ChatGPT Sites and Industry News' }), false)
  assert.equal(cleanTitle('Google Ads Introduces Channel Prioritization via @sejournal, @brookeosmundson'), 'Google Ads Introduces Channel Prioritization')
})

test('vakgebied: een brede bron telt alleen mee als het stuk erbij past', () => {
  assert.equal(fieldOf({ title: 'Meta Adds Automatic Customer Exclusions' }, src('jonloomer')), 'paid-social')
  assert.equal(fieldOf({ title: 'Meta makes advertisers responsible for AI ad edits' }, src('adweek')), 'merk') // Adweek telt alleen bij Merk & reclame
  assert.equal(fieldOf({ title: 'Nepversie van WhatsApp ruim 500.000 keer gedownload' }, src('emerce')), null) // platform, geen adverteren
  assert.equal(fieldOf({ title: 'Google Ads Introduces Channel Prioritization' }, src('sej-paid')), 'paid-social') // Online adverteren: ook zoekadvertenties
  assert.equal(fieldOf({ title: 'New book celebrates the lost graphics of holiday brochures' }, src('creativereview')), null)
  assert.equal(fieldOf({ title: 'Apple Music’s new brand identity is ‘made by sound’' }, src('creativereview')), 'design')
  assert.equal(fieldOf({ title: 'A simple guide to calm UI' }, src('sidebar')), 'ux')
  assert.equal(fieldOf({ title: 'Everyone is starting over' }, src('sidebar')), null)
})

test('hetzelfde onderwerp: zeldzame gedeelde woorden, niet alleen "Meta" en "AI"', () => {
  const df = new Map([['meta', 12], ['ads', 9], ['apple', 2], ['music', 2], ['linkedin', 3]])
  assert.equal(sameSubject({ title: 'The new, handmade Apple Music logo leans into the science of sound' }, { title: 'Apple Music’s new brand identity is ‘made by sound’' }, df), true)
  assert.equal(sameSubject({ title: 'LinkedIn’s B2B Audiences Are Now Available On CTV Via Google DV360' }, { title: 'LinkedIn job-title targeting reaches Google DV360 CTV buys in the US' }, df), true)
  assert.equal(sameSubject({ title: 'Meta says shopping is Muse’s primary use case' }, { title: 'Meta offers creative targeting for ads' }, df), false)
})

test('Sidebar: een link naar alleen een homepage (product, tool) of een verkorte link telt niet', () => {
  assert.equal(isArticleLink('https://www.doc.cc/articles/fastest-gun'), true)
  assert.equal(isArticleLink('https://lightbulbcomputer.com/'), false)
  assert.equal(isArticleLink('https://bit.ly/abc123'), false)
})

test('samenstellen: drie per vak, afwisselend, bedrijfsblog alleen met bijval, met redenen', () => {
  const now = Date.parse('2026-10-23T10:00:00Z')
  const at = '2026-10-14T09:00:00.000Z'
  const it = (id, source, title, extra = {}) => ({ id, source: 'vak:' + source, sourceName: src(source).name, title, summary: 'Intro van de schrijver.', url: `https://example.org/${id}`, publishedAt: at, ...extra })
  const pool = [
    it('a', 'jonloomer', 'Choose an Audience for Each Ad Creative', { author: 'Jon Loomer' }),
    it('b', 'jonloomer', 'Restriction Period for Political Ads on Facebook', { author: 'Jon Loomer' }),
    it('c', 'adexchanger', 'LinkedIn’s B2B Audiences Are Now Available On CTV Via Google DV360'),
    it('d', 'ppcland', 'LinkedIn job-title targeting reaches Google DV360 CTV buys for advertisers'),
    it('e', 'meta', 'Meta launches new tools for small business advertisers'),
    it('f', 'socialmediatoday', 'Instagram tests new ad format in Reels'),
    it('old', 'socialmediatoday', 'TikTok ads update from last month', { publishedAt: '2026-09-01T09:00:00.000Z' }),
  ]
  const d = composeVak(pool, { now, sources: SOURCES })
  const ps = d.fields.find((f) => f.id === 'paid-social')
  assert.equal(ps.top.length, 3)
  assert.equal(ps.top[0].id, 'c') // twee vakbronnen schreven erover
  assert.match(ps.top[0].why[0], /2 vakbronnen/)
  assert.equal(ps.top[0].also[0].sourceName, 'PPC Land')
  assert.ok(!ps.top.some((e) => e.id === 'e')) // Meta Newsroom zonder bijval: niet in de top
  assert.equal(ps.top.filter((e) => e.source === 'vak:jonloomer').length, 1) // hooguit één per bron
  assert.ok(![...ps.top, ...ps.more].some((e) => e.id === 'old'))
  assert.equal(d.preview, false)
  // Pas sinds woensdag aan het verzamelen: dan een voorproefje over de afgelopen zeven dagen.
  const pre = composeVak(pool, { now, since: '2026-10-21T10:00:00.000Z', sources: SOURCES })
  assert.equal(pre.preview, true)
})

test('voorraad: nieuwe stukken erbij, ouder dan zestien dagen eruit', () => {
  const now = Date.parse('2026-10-23T10:00:00Z')
  const pool = mergePool([{ id: 'x', publishedAt: '2026-09-01T00:00:00Z' }, { id: 'y', publishedAt: '2026-10-20T00:00:00Z' }], [{ id: 'y', publishedAt: '2026-10-20T00:00:00Z' }, { id: 'z', publishedAt: '2026-10-22T00:00:00Z' }], now)
  assert.deepEqual(pool.map((i) => i.id).sort(), ['y', 'z'])
})

test('instelling: alleen bestaande vakgebieden', () => {
  assert.deepEqual(normalizePrefs({ vak: ['ux', 'onzin', 'paid-social'] }).vak, ['ux', 'paid-social'])
  assert.deepEqual(normalizePrefs({}).vak, [])
})

test('beeld van het artikel: og:image uit de head, geen automatisch titelkaartje, elk stuk één keer', async () => {
  assert.equal(ogImageFrom('<head><meta property="og:image" content="https://media.nngroup.com/a.png?x=1&amp;y=2"></head><body><meta property="og:image" content="https://x/nee.png"></body>'), 'https://media.nngroup.com/a.png?x=1&y=2')
  assert.equal(ogImageFrom('<head><meta content="https://b.org/c.jpg" name="twitter:image"></head>'), 'https://b.org/c.jpg')
  assert.equal(ogImageFrom('<head><meta property="og:image" content="https://maxschmitt.me/api/og?title=Calm"></head>'), null)
  assert.equal(wantsOgImage({ image: null }), true)
  assert.equal(wantsOgImage({ image: 'https://www.jonloomer.com/wp-content/uploads/2026/10/x-300x157.png' }), true) // postzegel
  assert.equal(wantsOgImage({ image: 'https://ppc.land/content/images/2026/10/x.jpg' }), false)
  assert.equal(wantsOgImage({ image: null, ogTried: true }), false)
  const pool = [{ url: 'https://a/1', image: null, publishedAt: '2026-10-20' }, { url: 'https://a/2', image: null, publishedAt: '2026-10-21' }]
  await addOgImages(pool, { load: async (u) => (u.endsWith('1') ? 'https://img/1.jpg' : null) })
  assert.equal(pool[0].image, 'https://img/1.jpg')
  assert.equal(pool[1].image, null)
  assert.ok(pool.every((i) => i.ogTried))
})

test('AI: stukken over modellen, tools en werkwijzen; geen dagelijkse overzichten of algemeen technieuws', () => {
  assert.equal(fieldOf({ title: 'Claude gets a new MCP connector for Figma' }, src('verge-ai')), 'ai')
  assert.equal(fieldOf({ title: 'Apple reports record iPhone sales' }, src('verge-ai')), null)
  assert.equal(fieldOf({ title: '30 Months on the Exponential (in Charts)' }, src('oneusefulthing')), 'ai') // vakexpert: alles telt
  assert.equal(fieldOf({ title: 'Meta brengt AI-advertentietools naar Instagram' }, src('emerce')), 'paid-social') // eerst paid social
  assert.equal(fieldOf({ title: 'Nieuwe AI-agenten voor klantenservice' }, src('emerce')), 'ai')
  assert.equal(isReading({ title: '[AINews] not much happened today' }), false)
  assert.equal(isReading({ title: 'Latest open artifacts (#25): DeepSeek V4.1' }), false)
  assert.equal(isReading({ title: 'AI Is Getting Good at Math. Here’s Why.' }), true)
})

test('E-commerce: webwinkelstukken; vaste rubrieken met een datum en ander nieuws van brede bronnen niet', () => {
  assert.equal(fieldOf({ title: 'Shopify, Vercel Arm Stores for AI Agents' }, src('practicalecommerce')), 'ecommerce')
  assert.equal(fieldOf({ title: 'NATSEC Roundtable No. 17: Nashville and Peter Thiel' }, src('2pm')), null)
  assert.equal(fieldOf({ title: 'Why holiday returns demand fresh thinking from online retailers' }, src('retaildive')), 'ecommerce')
  assert.equal(fieldOf({ title: 'Target names new CFO' }, src('retaildive')), null)
  assert.equal(fieldOf({ title: 'Zalando opent nieuw fulfilmentcentrum voor webwinkels' }, src('emerce')), 'ecommerce')
  assert.equal(isReading({ title: 'New Ecommerce Tools: October 21, 2026' }), false)
})

// ---- Domeinen en gezondheid van de bronnen ----
import { VAK_DOMAINS, VAK_FIELDS, vakByDomain } from '../shared/vak.mjs'
import { updateHealth, healthOf, sourcesToLoad, healthReport } from '../netlify/lib/vak.mjs'

test('onderwerpen: elk hoort bij een bestaand domein, id\'s uniek, de eerste tien blijven', () => {
  const domains = new Set(VAK_DOMAINS.map((d) => d.id))
  for (const f of VAK_FIELDS) assert.ok(domains.has(f.domain), f.id)
  assert.equal(new Set(VAK_FIELDS.map((f) => f.id)).size, VAK_FIELDS.length)
  for (const id of ['paid-social', 'ux', 'design', 'ai', 'ecommerce', 'seo', 'merk', 'dev', 'product', 'ondernemen']) assert.ok(VAK_FIELDS.some((f) => f.id === id), id)
  assert.equal(vakByDomain().flatMap((d) => d.fields).length, VAK_FIELDS.length)
})

test('elke bron hoort bij bestaande onderwerpen; brede bronnen hebben een FITS-regel', () => {
  const ids = new Set(VAK_FIELDS.map((f) => f.id))
  for (const s of VAK_SOURCES) for (const f of s.fields) assert.ok(ids.has(f), `${s.id} → ${f}`)
  assert.equal(new Set(VAK_SOURCES.map((s) => s.id)).size, VAK_SOURCES.length, 'bron-id\'s uniek')
})

test('Selectie: alleen onderwerpen met bronnen', () => {
  const now = Date.parse('2026-10-20T10:00:00Z')
  const d = composeVak([], { now, sources: [{ id: 'vak:x', name: 'X', kind: 'vakblad', fields: ['film'], urls: [''] }] })
  assert.deepEqual(d.fields.map((f) => f.id), ['film'])
  assert.equal(d.fields[0].domain, 'cultuur')
})

test('gezondheid: kapot na een week zonder laden, stil na twee maanden zonder nieuws', () => {
  const t0 = Date.parse('2026-09-01T10:00:00Z')
  const day = 864e5
  let h = updateHealth({}, [{ id: 'a', ok: true, newest: '2026-08-31T10:00:00Z' }, { id: 'b', ok: true, newest: '2026-06-01T10:00:00Z' }], t0)
  assert.equal(healthOf(h.a, t0), 'ok')
  assert.equal(healthOf(h.b, t0), 'ok', 'net begonnen: nog geen oordeel')
  h = updateHealth(h, [{ id: 'a', ok: false, newest: null }, { id: 'b', ok: true, newest: '2026-06-01T10:00:00Z' }], t0 + 9 * day)
  assert.equal(healthOf(h.a, t0 + 9 * day), 'kapot')
  assert.equal(healthOf(h.b, t0 + 9 * day), 'stil')
  assert.equal(healthOf(undefined), 'nieuw')
  const report = healthReport(h, t0 + 9 * day, [{ id: 'a', name: 'A', fields: ['film'], urls: ['u'] }, { id: 'b', name: 'B', fields: ['film'], urls: ['v'] }])
  assert.deepEqual(report.fields, [{ id: 'film', label: 'Film & series', sources: 2, healthy: 0 }])
  assert.equal(report.paused.length, 2)
  // Een nieuwe bron (nog geen oordeel) telt als gezond, net als bij het ophalen (nachttest 14 november, A25).
  const nieuw = healthReport({}, t0, [{ id: 'c', name: 'C', fields: ['film'], urls: ['w'] }])
  assert.deepEqual(nieuw.fields, [{ id: 'film', label: 'Film & series', sources: 1, healthy: 1 }])
  assert.equal(nieuw.paused.length, 0)
})

test('op pauze: niet elk uur, wel op maandagochtend', () => {
  const day = 864e5
  const since = '2026-09-01T10:00:00Z'
  const health = { a: { since, lastOk: since }, b: { since, lastOk: '2026-10-25T10:00:00Z', newest: '2026-10-25T10:00:00Z' } }
  const sources = [{ id: 'a' }, { id: 'b' }]
  const tue = Date.parse('2026-10-27T10:00:00Z') // dinsdag
  assert.deepEqual(sourcesToLoad(health, tue, sources).map((s) => s.id), ['b'])
  const mon = Date.parse('2026-10-26T05:30:00Z') // maandag 06:30 in Amsterdam
  assert.deepEqual(sourcesToLoad(health, mon, sources).map((s) => s.id), ['a', 'b'])
  assert.ok(day)
})

test('veel bronnen: om het uur de helft, samen alles', () => {
  const sources = VAK_SOURCES
  const at = (h) => Date.parse(`2026-10-27T${String(h).padStart(2, '0')}:30:00Z`) // dinsdag
  const a = sourcesToLoad({}, at(9), sources).map((s) => s.id)
  const b = sourcesToLoad({}, at(10), sources).map((s) => s.id)
  assert.ok(a.length > sources.length * 0.35 && b.length > sources.length * 0.35)
  assert.equal(new Set([...a, ...b]).size, sources.length)
  assert.ok(!a.some((id) => b.includes(id)))
  assert.equal(isReading({ title: 'Sponsor SaaStr AI Annual 2027. Walk Out With 85+ Customer Meetings' }), false)
})

test('Geekcultuur: eigen bronnen, en de regel pakt sf, strips en bordspellen maar geen gewoon nieuws', () => {
  assert.ok(VAK_FIELDS.some((f) => f.id === 'geek' && f.domain === 'cultuur'))
  const geek = VAK_SOURCES.filter((s) => s.fields.includes('geek'))
  assert.ok(geek.length >= 10)
  assert.ok(geek.some((s) => /fantasywereld|9ekunst|speloptafel/.test(s.id)), 'Nederlands voorop')
  const io9 = src('io9')
  assert.equal(io9.filter, true)
  const fits = (title) => fieldOf({ title }, io9) === 'geek'
  for (const t of ['Andor Season 2 Proves Star Wars Still Has Something to Say', 'The Best Graphic Novels of the Year', 'Waarom bordspellen weer populair zijn', 'Inside the Worldcon Hugo Awards Controversy', 'The Dungeons & Dragons Movie Sequel Is Happening', 'Skibidi Toilet and the Rise of Brainrot']) assert.ok(fits(t), t)
  for (const t of ['Washington DC braces for shutdown', 'Israëlisch leger rukt op in de Gazastrook', 'Scientists marvel at rare comet', 'Stand-up comic cancels tour', 'Sand dunes are moving faster than expected', 'Kinderen gamen steeds meer']) assert.ok(!fits(t), t)
  // De dagelijkse linkrondes van File 770 vallen weg, ook al staat er sf in.
  assert.equal(fieldOf({ title: 'Pixel Scroll 10/29/26 The Fantasy of Science Fiction' }, src('file770')), null)
  // SF-based is San Francisco; sf-roman en sf-vereniging blijven sf.
  assert.ok(!fits('An SF-based startup raises $40 million'))
  assert.ok(fits('De beste sf-romans van dit jaar'))
  // Geen videoshow: Selectie is geschreven werk.
  assert.ok(!src('gamekings-nerd'))
  // Vaste linklijsten en digests van de ongefilterde bronnen tellen niet als stuk.
  for (const t of ['Free Comics and Gaga – This Week’s Links', "Spider-Man Turns 60 – This Week's Links", 'News Digest for October 24, 2026', 'Freebies, Sales, and Charity Bundles for October 19, 2026', 'RPG Print News – Dragonbane, Shadowdark and More', 'RPG Crowdfunding News – Mothership 2e']) assert.equal(isReading({ title: t }), false, t)
  assert.equal(isReading({ title: 'Why Print News Still Matters to Comics' }), true)
})

// Taal: een Engelstalig stuk bij een Nederlandse vakbron valt af (live op 31-10: ArchiNed 3 van de
// 30 in het Engels, de Archiprix-stukken; ManagementSite en Trendbeheer elk één).
const ARCHIPRIX = {
  title: 'Mountain Nomads Revitalizing the rural identity – Archiprix 2026',
  summary: 'After carrying out thorough fieldwork, Fabia Sainz Fernandez reimagined the local farm typology in Asturias (Spain) as a public and inclusive landscape.',
  url: 'https://www.archined.nl/2026/10/mountain-nomads-archiprix-2026/',
}
const DUTCH = {
  title: 'Het nieuwe stadhuis van Amsterdam krijgt een open plein aan de Amstel',
  summary: 'De architecten kozen voor een gebouw dat zich naar de stad opent, met een plein dat de hele dag toegankelijk is voor iedereen.',
  url: 'https://www.archined.nl/2026/10/stadhuis-amsterdam/',
}

test('taal: elke vakbron heeft een hoofdtaal; Nederlands op .nl/.be en de lijst daarbuiten', () => {
  assert.equal(src('archined').lang, 'nl')
  assert.equal(src('managementsite').lang, 'nl')
  assert.equal(src('trendbeheer').lang, 'nl') // .com, maar Nederlandstalig
  assert.equal(src('tweakers').lang, 'nl')
  assert.equal(src('archdaily').lang, 'en')
  assert.equal(src('hidde').lang, 'en') // Nederlander, schrijft in het Engels
  assert.equal(src('verfassungsblog').lang, null) // meertalig: geen hoofdtaal
  assert.ok(VAK_SOURCES.every((s) => s.lang !== undefined))
  assert.equal(vakLang({ id: 'vak:x', urls: ['https://www.voorbeeld.be/feed'] }), 'nl')
})

test('taal: het Engelstalige Archiprix-stuk van ArchiNed valt af bij het ophalen', async () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>ArchiNed</title>${[ARCHIPRIX, DUTCH]
    .map((i) => `<item><title>${i.title}</title><link>${i.url}</link><description>${i.summary}</description><pubDate>Fri, 30 Oct 2026 09:00:00 GMT</pubDate></item>`)
    .join('')}</channel></rss>`
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    const { items } = await loadVakItems([src('archined')])
    assert.deepEqual(items.map((i) => i.title), [DUTCH.title])
  } finally {
    globalThis.fetch = orig
  }
})

test('taal: ook een Archiprix-stuk dat al in de voorraad stond (zonder offLang) komt niet in de Vakweek', () => {
  const now = Date.parse('2026-10-23T10:00:00Z')
  const at = '2026-10-14T09:00:00.000Z'
  const pool = [
    { id: 'en', source: 'vak:archined', sourceName: 'ArchiNed', publishedAt: at, ...ARCHIPRIX },
    { id: 'nl', source: 'vak:archined', sourceName: 'ArchiNed', publishedAt: at, ...DUTCH },
  ]
  const arch = composeVak(pool, { now, sources: SOURCES }).fields.find((f) => f.id === 'architectuur')
  const ids = [...arch.top, ...arch.more].map((e) => e.id)
  assert.deepEqual(ids, ['nl'])
})

import { settleVak } from '../src/lib/vak-refresh.js'
test('Selectie: een mislukte verversing blijft mislukt, ook als de opgeslagen Selectie blijft staan', () => {
  assert.deepEqual(settleVak('refreshing', false, true), { status: 'ready', refreshFailed: true })
  assert.deepEqual(settleVak('refreshing', false, false), { status: 'ready', refreshFailed: true })
  assert.deepEqual(settleVak('loading', false, true), { status: 'ready', refreshFailed: true })
  assert.deepEqual(settleVak('loading', false, false), { status: 'error', refreshFailed: true }) // niets om te tonen
  assert.deepEqual(settleVak('refreshing', true, true), { status: 'ready', refreshFailed: false })
})

// Selectie · deals · 1: deals en podcasts niet op een woord in de kop, alleen op een harde aanwijzing (hardMark, de regel
// van de Editie) of een vast podcastlabel in de kop.
test('Selectie: nieuws over deals, kortingen en podcasts blijft staan', () => {
  for (const title of [
    'OpenAI signs $10bn chip deal with Broadcom',
    'Wat de deal tussen Ahold en Bol betekent',
    'Black Friday deals drove record online sales',
    'Why ad discounts hurt your brand',
    'Will YouTube kill the podcast industry?',
    'NOS-podcast De Dag uitgeroepen tot beste dagelijkse podcast',
    'Russell Brand trial: Video shows push 10m views but audio still ‘king’ says Mail podcast chief',
    'Shopify Tax free discount will no longer reset annually',
  ]) assert.equal(isReading({ title, url: 'https://example.com/news/2026/11/' + title.length }), true, title)
  // Een gewone nieuwsrubriek "deals" dieper in het pad is geen dealrubriek.
  assert.equal(isReading({ title: 'Top 10 M&A deals of the year', url: 'https://www.reuters.com/markets/deals/top-10-ma-deals-2026-11-12/' }), true)
  // Een nieuwsbericht met een voorleesversie (audio-enclosure) en een eigen intro blijft.
  assert.equal(isReading({ title: 'Meta cuts CPMs for Reels ads', url: 'https://example.com/meta-cpm', mediaType: 'audio/mpeg', summary: 'Meta verlaagt de prijzen voor advertenties in Reels, meldt het bedrijf aan adverteerders.' }), true)
})

test('Selectie: een echte dealpagina en een podcastaflevering vallen weg', () => {
  assert.equal(isReading({ title: 'iPhone 18 Pro Max is nog maar net uit, maar nu al honderden euro’s goedkoper', url: 'https://www.iculture.nl/deals/iphone-18-pro-max-goedkoper/' }), false)
  assert.equal(isReading({ title: 'Google Pixel 11 Pro was nog nooit zó goedkoop', url: 'https://androidworld.nl/aanbiedingen/google-pixel-11-pro-laagste-prijs-ooit/' }), false)
  // iTunes-aflevering: altijd weg, ook met een eigen intro.
  assert.equal(isReading({ title: 'Designing for Agents — Zeno Rocha, Resend', url: 'https://latent.space/p/resend/', mediaType: 'audio/mpeg', podcastEpisode: '01:25:52', summary: 'Where does answer engine optimization (AEO) end and agent experience begin?' }), false)
  // Audio-enclosure zonder eigen intro.
  assert.equal(isReading({ title: 'EP108 Why Product Teams Slow Down as Companies Scale', url: 'https://www.productcoalition.com/p/ep108', mediaType: 'audio/mpeg', summary: 'Summary' }), false)
  assert.equal(isReading({ title: 'Podcast: Boeken FM geeft Himmler in New York een 7,6', url: 'https://www.tzum.info/2026/11/podcast-boeken-fm/' }), false)
  // Een podcastrubriek zonder eigen intro.
  assert.equal(isReading({ title: 'De kamer van Klok: Laura Bromet is de nieuwe vijand van rechts', url: 'https://www.volkskrant.nl/luister/de-kamer-van-klok-laura-bromet~b6a0919f/' }), false)
})

test('Selectie: een vast podcastlabel in de kop, niet het woord in een zin', () => {
  for (const t of [
    'Discovery & The 4 Risks – All Things Product Podcast with Teresa Torres & Petra Wille',
    'Canon and Nikon Cine Both Getting Nice Upgrades | The PetaPixel Podcast',
    'AI & Tech-podcast | Naïeve AI-projecten doen kosten oplopen',
    '🎧 Distrifood Podcast: De rekening van voedselzekerheid',
    'Podcast #422 livestream: Dragonlance TV, D&D comics',
    'The Low Culture Podcast: The Walker Brothers’ Nite Flights',
  ]) assert.equal(podcastLabel(t), true, t)
  for (const t of [
    'Charlie Sheen Launches Weekly Interview Podcast With Fox’s Red Seat Ventures',
    'Thoughts from the 2026 London Podcast Show',
    'From the MAICON Stage to Your Podcast Feed',
    'Russell Brand trial: Video shows push 10m views but audio still ‘king’ says Mail podcast chief',
    'Spotify’s ‘Memberships’ Turns Podcast Fans Into Paying Members',
    'Video Podcast: why brands now film every episode',
    'The Podcast Boom: who pays for it?',
  ]) assert.equal(podcastLabel(t), false, t)
})
