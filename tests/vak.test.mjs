import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vakWeek, isReading, cleanTitle, fieldOf, sameSubject, isArticleLink, composeVak, mergePool, VAK_SOURCES, ogImageFrom, wantsOgImage, addOgImages } from '../netlify/lib/vak.mjs'
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
