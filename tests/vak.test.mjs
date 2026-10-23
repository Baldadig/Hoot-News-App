import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vakWeek, isReading, cleanTitle, fieldOf, sameSubject, isArticleLink, composeVak, mergePool, VAK_SOURCES } from '../netlify/lib/vak.mjs'
import { normalizePrefs } from '../src/lib/prefs.js'

const src = (id) => VAK_SOURCES.find((s) => s.id === 'vak:' + id)

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
  assert.equal(fieldOf({ title: 'Meta makes advertisers responsible for AI ad edits' }, src('adweek')), 'paid-social')
  assert.equal(fieldOf({ title: 'Nepversie van WhatsApp ruim 500.000 keer gedownload' }, src('emerce')), null) // platform, geen adverteren
  assert.equal(fieldOf({ title: 'Google Ads Introduces Channel Prioritization' }, src('sej-paid')), null) // zoekmachine, geen social
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
  const d = composeVak(pool, { now })
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
  const pre = composeVak(pool, { now, since: '2026-10-21T10:00:00.000Z' })
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
