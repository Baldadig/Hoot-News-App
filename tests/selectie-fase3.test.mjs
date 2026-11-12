// Selectie · fase 3 · Selectie opschonen: leesvoer in plaats van nieuws van de week, het gewicht van de schrijver
// beslist in de nieuwsrijke onderwerpen, niets uit de Editie van die week in de top, en minder Belgisch nieuws.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composeVak, isReading, LEESVOER, VAK_SOURCES, vakRange, editieSlotIds, vakWeek, vakLang } from '../netlify/lib/vak.mjs'
import { ARCHIVED_SOURCES } from '../netlify/lib/vakBronnen.mjs'
import { editieItems } from '../netlify/lib/vakRefresh.mjs'
import { editionCacheKey, EDITOR_REVISION } from '../shared/editor-version.mjs'

const NOW = Date.parse('2026-11-12T10:00:00Z') // donderdag; de volle Vakweek is die van 2 t/m 9 november
const IN_WEEK = '2026-11-05T09:00:00Z'
const S = (id, kind, fields, more = {}) => ({ id: 'vak:' + id, name: id, kind, fields, urls: ['https://' + id + '.example.nl/feed'], cat: 'vak', lang: 'nl', ...more })
const it = (id, source, title, more = {}) => ({ id, source, sourceName: source.slice(4), title, summary: 'Een eigen intro van de schrijver over dit stuk.', url: `https://example.nl/${id}`, publishedAt: IN_WEEK, ...more })
const topOf = (out, f) => out.fields.find((x) => x.id === f).top.map((e) => e.id)

test('leesvoer: de vijf onderwerpen met veel nieuws', () => {
  assert.deepEqual([...LEESVOER].sort(), ['economie', 'film', 'muziek', 'politiek', 'sport'])
})

test('nieuwsfeeds van kranten en Belgisch nieuws zijn uit de Selectie, en staan in het archief', () => {
  const ids = new Set(VAK_SOURCES.map((s) => s.id))
  const weg = ['nos-politiek', 'vk-politiek', 'trouw-politiek', 'knack-politiek', 'nos-sport', 'vk-sport', 'trouw-sport', 'demorgen-sport', 'knack-sport', 'sporza', 'guardian-sport', 'vi', 'wielerflits', 'athletic', 'vk-economie', 'fd', 'tijd']
  for (const id of weg) {
    assert.ok(!ids.has('vak:' + id), id + ' hoort niet meer in de Selectie')
    assert.ok(ARCHIVED_SOURCES.some((s) => s.id === 'vak:' + id), id + ' staat in het archief')
  }
  // NOS en NU.nl Economie blijven, maar niet bij Economie.
  for (const id of ['nos-economie', 'nu-economie']) assert.deepEqual(VAK_SOURCES.find((s) => s.id === 'vak:' + id).fields, ['vastgoed', 'geld'])
  // Sporza alleen nog voor wielrennen.
  assert.ok(ids.has('vak:sporza-wielrennen'))
  // Geen Belgische bron meer bij Politiek, Sport en Economie, behalve Sporza Wielrennen.
  const be = VAK_SOURCES.filter((s) => /\.be$/.test(new URL(s.urls[0]).hostname) && s.fields.some((f) => ['politiek', 'sport', 'economie'].includes(f)))
  assert.deepEqual(be.map((s) => s.id), ['vak:sporza-wielrennen'])
  // Het archief wordt niet opgehaald en heeft geen dubbele id's met de Selectie.
  assert.equal(ARCHIVED_SOURCES.filter((s) => ids.has(s.id)).length, 0)
})

test('elk leesvoer-onderwerp houdt genoeg bronnen, met een vakexpert en Nederlandse bronnen', () => {
  for (const f of LEESVOER) {
    const mine = VAK_SOURCES.filter((s) => s.fields.includes(f))
    assert.ok(mine.length >= 6, `${f}: ${mine.length} bronnen`)
    assert.ok(mine.filter((s) => vakLang(s) === 'nl').length >= 3, f + ': minstens drie Nederlandstalige bronnen')
  }
  for (const f of ['politiek', 'economie', 'sport']) assert.ok(VAK_SOURCES.some((s) => s.fields.includes(f) && s.kind === 'expert'), f + ': een expert')
  // Helden staat op .media maar schrijft Nederlands.
  assert.equal(vakLang(VAK_SOURCES.find((s) => s.id === 'vak:helden')), 'nl')
})

test('weging: in de leesvoer-onderwerpen beslist het gewicht van de schrijver, niet hoeveel bronnen erover schreven', () => {
  const sources = [S('expert', 'expert', ['politiek', 'merk']), S('a', 'vakblad', ['politiek', 'merk']), S('b', 'vakblad', ['politiek', 'merk']), S('c', 'vakblad', ['politiek', 'merk']), S('d', 'community', ['politiek', 'merk'])]
  const nieuws = 'Kabinet wankelt na akkoord over belastingplan met oppositie'
  const pool = (f) => [
    it(f + '1', 'vak:a', nieuws), it(f + '2', 'vak:b', nieuws), it(f + '3', 'vak:c', nieuws),
    it(f + '4', 'vak:expert', 'Waarom kiezers zich achtergesteld voelen: een analyse van groepsgevoel'),
    it(f + '5', 'vak:d', 'Een blog over gemeenteraden en lokale democratie'),
  ]
  // Elke bron heeft één onderwerp per stuk (het eerste); twee pools, één per onderwerp.
  const polS = sources.map((s) => ({ ...s, fields: ['politiek'] }))
  const merkS = sources.map((s) => ({ ...s, fields: ['merk'] }))
  const pol = composeVak(pool('p'), { now: NOW, sources: polS })
  const merk = composeVak(pool('m'), { now: NOW, sources: merkS })
  // Politiek: de expert eerst, ook al schreven drie vakbladen over het kabinet.
  assert.deepEqual(topOf(pol, 'politiek')[0], 'p4')
  assert.ok(pol.fields.find((x) => x.id === 'politiek').top[1].why.includes('3 vakbronnen schreven erover'), 'bij gelijke stand telt het aantal bronnen nog')
  // Merk (geen leesvoer-onderwerp): drie bronnen over hetzelfde wint het nog van de expert.
  assert.equal(topOf(merk, 'merk')[0], 'm1')
})

test('weging: bij gelijk gewicht telt het aantal bronnen', () => {
  const sources = [S('a', 'vakblad', ['sport']), S('b', 'vakblad', ['sport']), S('c', 'vakblad', ['sport'])]
  const pool = [
    it('s1', 'vak:a', 'Een lang interview met de schaatscoach over de nieuwe generatie'),
    it('s2', 'vak:b', 'Wat de trainerswissel bij de club betekent voor de jeugdopleiding'),
    it('s3', 'vak:c', 'Wat de trainerswissel bij de club betekent voor de jeugdopleiding', { url: 'https://example.nl/s3' }),
  ]
  assert.equal(topOf(composeVak(pool, { now: NOW, sources }), 'sport')[0], 's2')
})

test('geen herhaling uit de Editie: dezelfde link of hetzelfde verhaal komt niet in de top, wel eronder', () => {
  const sources = [S('a', 'vakblad', ['politiek']), S('b', 'vakblad', ['politiek']), S('c', 'vakblad', ['politiek']), S('d', 'vakblad', ['politiek'])]
  const pool = [
    it('e1', 'vak:a', 'Pro en Volt drijven een wig in de coalitie van Jetten'),
    it('e2', 'vak:b', 'Hoe de Tweede Kamer het asielbeleid wil herschrijven'),
    it('e3', 'vak:c', 'De gemeente als proeftuin voor burgerberaden'),
    it('e4', 'vak:d', 'Waarom de Eerste Kamer steeds vaker dwarsligt'),
  ]
  const editie = [
    { title: 'Iets heel anders', url: 'https://example.nl/e3?utm_source=hoot' }, // zelfde link
    { title: 'Coalitie Jetten wankelt: Pro en Volt drijven wig', url: 'https://nos.nl/artikel/1' }, // zelfde verhaal
  ]
  const zonder = composeVak(pool, { now: NOW, sources })
  const met = composeVak(pool, { now: NOW, sources, editie })
  assert.equal(topOf(zonder, 'politiek').length, 3)
  const top = topOf(met, 'politiek')
  assert.ok(!top.includes('e1') && !top.includes('e3'), 'wat in de Editie stond, staat niet in de top')
  assert.deepEqual(top.sort(), ['e2', 'e4'])
  const more = met.fields.find((x) => x.id === 'politiek').more.map((e) => e.id)
  assert.ok(more.includes('e1') && more.includes('e3'), 'onder de top mag het wel')
  // Twee gedeelde woorden ("wins", "prize") zijn geen zelfde verhaal, drie (John, Harrison, Booker) wel.
  const prijs = [it('p1', 'vak:a', 'Chicago ’68 wins 2026 Summit Award, Space-Biff! takes memorial prize'), it('p2', 'vak:b', 'Does M John Harrison’s Booker win mean science fiction is accepted?'), it('p3', 'vak:c', 'Een gewone kop over gemeenten'), it('p4', 'vak:d', 'Nog een kop over de Kamer')]
  const booker = composeVak(prijs, { now: NOW, sources, editie: [{ title: 'M. John Harrison’s ‘The End of Everything’ Wins Booker Prize', url: 'https://nyt.com/x' }] })
  assert.ok(topOf(booker, 'politiek').includes('p1'), 'een bordspelprijs is geen Booker Prize')
  assert.ok(!topOf(booker, 'politiek').includes('p2'), 'John, Harrison en Booker: hetzelfde verhaal')
  // Een kop die maar één gewoon woord deelt, is geen zelfde verhaal.
  const los = composeVak(pool, { now: NOW, sources, editie: [{ title: 'Kamer stemt over begroting', url: 'https://nos.nl/x' }] })
  assert.equal(topOf(los, 'politiek').length, 3)
})

test('geen liveblog, kijkwijzer of audio van een tekstbron in de Selectie', () => {
  assert.equal(isReading({ title: 'England vs Croatia live updates: Line-ups from Nations League' }), false)
  assert.equal(isReading({ title: 'LIVE | Premier sluit aanpassing coalitieakkoord niet uit' }), false)
  assert.equal(isReading({ title: 'How to watch Louisville vs. Ball State: TV channel and streaming options' }), false)
  assert.equal(isReading({ title: 'Minnesota Wild vs. Toronto Maple Leafs: The latest from Michael Russo' }), false)
  assert.equal(isReading({ title: 'Live Event with Heather Cox Richardson' }), false)
  // Uitzendoverzichten van Nieuwsuur zijn een programma, geen leesvoer.
  assert.equal(isReading({ title: '12/11 in Nieuwsuur: Cruciaal debat over de begroting • Hybride oorlog • Zelda' }), false)
  assert.equal(isReading({ title: '7/11 in Nieuwsuur: De toekomst van het minderheidskabinet • Hybride oorlog' }), false)
  assert.equal(isReading({ title: 'Waarom het minderheidskabinet in Nieuwsuur onder vuur ligt: een analyse' }), true)
  assert.equal(isReading({ title: 'Het leven na de topsport: een interview met Femke Kok' }), true)
  const krugman = VAK_SOURCES.find((s) => s.id === 'vak:krugman')
  assert.equal(isReading({ title: 'Climates of Treason', mediaType: 'audio/mpeg', summary: 'Intro' }, krugman), false)
  assert.equal(isReading({ title: 'The Texas Miracle', summary: 'Intro' }, krugman), true)
  // Bij andere bronnen blijft de regel van fase 1: audio met een eigen intro mag.
  const intro = 'Paul Krugman schrijft over verraad aan het klimaat en wat dat betekent voor het beleid van de komende jaren.'
  assert.equal(isReading({ title: 'Climates of Treason', mediaType: 'audio/mpeg', summary: intro }, krugman), false)
  assert.equal(isReading({ title: 'Climates of Treason', mediaType: 'audio/mpeg', summary: intro }, VAK_SOURCES.find((s) => s.id === 'vak:noahpinion')), true)
})

test('de dagdelen van de Editie in de week van de Selectie', () => {
  const ids = editieSlotIds(vakWeek(NOW))
  assert.equal(ids[0], '2026-11-02-ochtend')
  assert.ok(ids.includes('2026-11-08-avond') && ids.includes('2026-11-09-ochtend'))
  assert.ok(!ids.some((id) => id.startsWith('2026-11-10')))
  const { preview, wk } = vakRange(NOW, '2026-11-11T00:00:00Z')
  assert.equal(preview, true)
  const pids = editieSlotIds(wk)
  assert.equal(pids[0], '2026-11-05-ochtend')
  assert.equal(pids.at(-1), '2026-11-12-avond')
})

test('de stukken uit de bewaarde Edities van de week, welke revisie ook, alleen uit die week', async () => {
  const wk = vakWeek(NOW)
  const store = new Map([
    [editionCacheKey('2026-11-04-ochtend'), { builtAt: '2026-11-04T05:30:00Z', entries: [{ id: 'x' }], items: [{ id: 'x', title: 'Kop één', url: 'https://nos.nl/1' }, { id: 'y', title: 'Kop twee', url: 'https://nu.nl/2' }] }],
    [editionCacheKey('2026-11-05-middag', 'oud'), { builtAt: '2026-11-05T11:00:00Z', entries: [{ id: 'z' }], items: [{ id: 'z', title: 'Kop drie', url: 'https://nos.nl/3' }, { id: 'v', title: 'Kop één, nog eens', url: 'https://nos.nl/1' }] }],
    ['edition-revision-2026-11-05-middag', 'oud'],
    [editionCacheKey('2026-11-09-avond'), { builtAt: '2026-11-09T17:00:00Z', entries: [{ id: 'w' }], items: [{ id: 'w', title: 'Na de week', url: 'https://nos.nl/9' }] }],
  ])
  assert.notEqual(EDITOR_REVISION, 'oud')
  const items = await editieItems(wk, async (k) => store.get(k) ?? null)
  assert.deepEqual(items.map((i) => i.title).sort(), ['Kop drie', 'Kop twee', 'Kop één'])
  // Een kapotte opslag: geen Edities, geen fout.
  assert.deepEqual(await editieItems(wk, async () => { throw new Error('weg') }), [])
})
