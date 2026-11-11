// Plek 01 opent met nieuws (Redacteur ronde 3a, keuring 6 november 2026: "Opinie is nooit een hoofdartikel").
// De algemene Editie van vrijdagochtend opende met de NYT-beschouwing "Trump Tried to Undermine the Nation's
// Elections. It Didn't Work." als kop van de midterms-bundel. Een opiniestuk mag lid zijn van een verhaal, maar
// nooit de kop van plek 01; heeft het verhaal geen nieuws, dan opent een ander verhaal.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isOpinion, verdictTitle } from '../shared/article-signals.mjs'
import { openWithNews, selectEdition } from '../netlify/lib/stories.mjs'

test('opinie: herkend aan soort, pad, rubriek en label in de kop', () => {
  for (const it of [
    { type: 'opinie', url: 'https://example.org/x' },
    { url: 'https://www.nytimes.com/2026/11/05/opinion/maga-trump-midterms.html' },
    { url: 'https://www.volkskrant.nl/columns-van-de-dag/we-hebben-de-ganzen-zien-vertrekken~b8650eae/' },
    { url: 'https://www.volkskrant.nl/columns-opinie/sta-ook-open~b1/' },
    { url: 'https://www.trouw.nl/columnisten/iets~b2/' },
    { url: 'https://www.theguardian.com/commentisfree/2026/nov/05/x' },
    { url: 'https://www.theatlantic.com/ideas/2026/11/democrats-ai-midterms-regulation/689320/' },
    { url: 'https://www.aljazeera.com/features/2026/10/31/x', section: 'Opinion' },
    { url: 'https://www.gelderlander.nl/x', title: 'Opinie: De Gelderse miljardenpot moet open' },
  ]) assert.ok(isOpinion(it), JSON.stringify(it))
  for (const it of [
    { url: 'https://www.nytimes.com/2026/11/05/us/election-deniers-midterms-trump.html', title: 'Trump Tried to Undermine the Nation’s Elections. It Didn’t Work.' },
    { url: 'https://www.carbonbrief.org/analysis-chinas-clean-tech-exports', title: 'Analysis: China’s clean-tech exports in 2026' },
    { url: 'https://nos.nl/l/2637376', title: 'KLM-vlucht kreeg bommelding' },
    { url: 'https://www.theatlantic.com/politics/2026/11/midterms/689311/', title: 'This Won’t Be Easy for Democrats' },
  ]) assert.ok(!isOpinion(it), JSON.stringify(it))
})

test('beschouwende kop: twee zinnen met een oordeel als slot', () => {
  assert.ok(verdictTitle({ title: 'Trump Tried to Undermine the Nation’s Elections. It Didn’t Work.' }))
  assert.ok(verdictTitle({ title: 'Republicans Tried to Turn the Cheesecake Factory Against Democrats. It Flopped.' }))
  for (const title of ['KL461 niet uit Boekarest vertrokken wegens technisch mankement', 'Paus: "Vrede is mogelijk."', 'Wat gebeurt er dan in de lucht en op de grond?', 'Dit is een kop. En dit'])
    assert.ok(!verdictTitle({ title }), title)
})

const it = (id, source, title, extra = {}) => ({ id, kind: 'article', source, sourceName: source, title, summary: `${title}.`, image: 'https://example.org/b.jpg', publishedAt: '2026-11-06T03:00:00.000Z', url: `https://example.org/${id}`, topics: [], ...extra })

test('openWithNews: nieuwe kop uit het nieuws van het verhaal, opinie-alleen schuift naar achteren', () => {
  const items = {
    a1: it('a1', 'atlantic', 'Democrats Have No Coherent Plan for AI', { url: 'https://www.theatlantic.com/ideas/2026/11/x/1/' }),
    a2: it('a2', 'nyt', 'Trump Tried to Undermine the Nation’s Elections. It Didn’t Work.'),
    a3: it('a3', 'bbc', 'White House denies Hegseth and Rubio to leave jobs after Republican election losses'),
    b1: it('b1', 'nyt', 'MAGA Finally Gets What It Deserves', { type: 'opinie' }),
    b2: it('b2', 'volkskrant', 'De gok is te groot', { url: 'https://www.volkskrant.nl/columns-opinie/x~b/' }),
    c1: it('c1', 'nos', 'KLM-vlucht kreeg bommelding'),
  }
  const itemsOf = (e) => e.ids.map((id) => items[id])
  const pick = (xs) => xs[0]
  // Plek 1 heeft alleen opinie: het eerste verhaal met nieuws opent, de rest houdt zijn volgorde.
  let entries = [{ kind: 'story', id: 'B', leadId: 'b1', ids: ['b1', 'b2'] }, { kind: 'story', id: 'A', leadId: 'a1', ids: ['a1', 'a2', 'a3'], title: 'x' }, { kind: 'item', id: 'c1', ids: ['c1'] }]
  openWithNews(entries, { itemsOf, pick })
  assert.deepEqual(entries.map((e) => e.id), ['A', 'B', 'c1'])
  // De kop van plek 1 was opinie: het nieuws zonder beschouwende kop wordt de kop, ook in `title`.
  assert.equal(entries[0].leadId, 'a3')
  assert.equal(entries[0].title, items.a3.title)
  // Een beschouwende kop wijkt alleen voor een gewone nieuwskop; zonder die blijft hij staan.
  entries = [{ kind: 'story', id: 'D', leadId: 'a2', ids: ['a2', 'a1'] }]
  openWithNews(entries, { itemsOf, pick })
  assert.equal(entries[0].leadId, 'a2')
  // Niets dan opinie: niets te kiezen, de volgorde blijft.
  entries = [{ kind: 'story', id: 'B', leadId: 'b1', ids: ['b1', 'b2'] }]
  openWithNews(entries, { itemsOf, pick })
  assert.equal(entries[0].leadId, 'b1')
})

test('selectEdition: een verhaal van alleen opinie opent de Editie niet, en een opiniekop wijkt', () => {
  const mainIds = new Set(['atlantic', 'nyt', 'volkskrant', 'nos', 'bbc', 'guardian'])
  const now = Date.parse('2026-11-06T04:30:00.000Z')
  const op = [
    it('o1', 'atlantic', 'The Midterms Were a Verdict on Trumpism', { url: 'https://www.theatlantic.com/ideas/2026/11/o1/' }),
    it('o2', 'nyt', 'Trumpism Lost the Midterms', { url: 'https://www.nytimes.com/2026/11/05/opinion/o2.html' }),
    it('o3', 'volkskrant', 'De midterms zijn een oordeel over Trump', { url: 'https://www.volkskrant.nl/columns-opinie/o3~b/' }),
    it('o4', 'guardian', 'Trumpism has lost the midterms', { url: 'https://www.theguardian.com/commentisfree/2026/nov/05/o4' }),
  ]
  const nw = [
    it('n1', 'atlantic', 'Bomb Threats Are a Hybrid War', { url: 'https://www.theatlantic.com/ideas/2026/11/n1/', publishedAt: '2026-11-06T04:00:00.000Z' }),
    it('n2', 'nos', 'Bommelding op KLM-vlucht naar Tel Aviv', { image: null }),
    it('n3', 'bbc', 'Bomb threat on KLM flight to Tel Aviv', { image: null }),
  ]
  const pool = [...op, ...nw]
  const story = (id, xs) => ({ id, itemIds: xs.map((x) => x.id), leadId: xs[0].id, sourceCount: xs.length, publisherCount: xs.length, latestAt: '2026-11-06T04:00:00.000Z', desk: 'buitenland' })
  for (const x of op) x.storyId = 'SO'
  for (const x of nw) x.storyId = 'SN'
  const entries = selectEdition([story('SO', op), story('SN', nw)], pool, { mainIds, now })
  assert.equal(entries[0].id, 'SN')
  assert.ok(!['n1'].includes(entries[0].leadId), entries[0].leadId)
})

// Redacteur op de server (besluit Alex, 11 november 2026): de Editie rekent met dezelfde opinieherkenning als de tab
// Opinie (shared/opinie.mjs), plus de twee aanbevelingen van de keurder. Analyse is geen opinie.
test('Editie en tab Opinie: één herkenning', async () => {
  const { isOpinie } = await import('../shared/opinie.mjs')
  const corpus = JSON.parse((await import('node:fs')).readFileSync(new URL('./fixtures/opinie-corpus.json', import.meta.url), 'utf8'))
  for (const i of [...corpus.opinie, ...corpus.geen]) assert.equal(isOpinion(i), isOpinie(i), `${i.source} | ${i.title}`)
  assert.ok(isOpinion({ opinion: true, title: 'x', url: 'https://example.org/x' }), 'het veld van de server telt')
})

test('analyse is geen opinie, ook niet in de Editie (Al Jazeera /news-analysis/)', () => {
  assert.ok(!isOpinion({ title: 'Fake polls expose vulnerabilities in US elections ahead of midterms', url: 'https://www.aljazeera.com/news-analysis/2026/10/31/fake-polls-expose-vulnerabilities' }))
})

test('ingezonden brieven in /wat-u-zegt/ en de auteur achter de laatste "|" zijn opinie', () => {
  assert.ok(isOpinion({ title: 'Lezers: ’Peek & Cloppenburg zoveelste icoon dat uit binnenstad verdwijnt’', url: 'https://www.telegraaf.nl/wat-u-zegt/lezers-peek-cloppenburg/163880075.html' }))
  assert.ok(isOpinion({ title: 'How can playing for Manchester City fit into Marc Guéhi’s moral universe? | Barney Ronay', author: 'Barney Ronay', url: 'https://www.theguardian.com/football/2026/oct/30/x' }))
  // Niet de auteur, of maar één woord: geen signaal (een rubrieknaam of een citaat achter de streep).
  assert.ok(!isOpinion({ title: 'LIVE Formule 1 | Uitstekende start voor Ferrari', author: 'Redactie Sport', url: 'https://example.org/a' }))
  assert.ok(!isOpinion({ title: 'Iets gebeurd | Barney Ronay', author: 'Sean Ingle', url: 'https://example.org/b' }))
  assert.ok(!isOpinion({ title: 'Iets gebeurd | Ronay', author: 'Ronay', url: 'https://example.org/c' }))
})
