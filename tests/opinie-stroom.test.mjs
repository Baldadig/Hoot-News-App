// Opinie in de Stroom (besluit Alex 10 november 2026): de server markeert opinie per bericht (`opinion: true`,
// shared/opinie.mjs), de Stroom toont daarmee de tab Opinie na Sport en vóór Buiten je bubbel. Een
// opiniestuk blijft in zijn rubriek en in Alles.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isOpinie, opinieInStroom } from '../shared/opinie.mjs'
import { rubriekRij, inRubriek, kiesRubriek, actieveRubriek, legeRegel, OPINIE } from '../src/lib/streamline.js'
import { toClient } from '../netlify/lib/build.mjs'

// Echte koppen en links uit tests/fixtures (live-feeds en snapshots van 30 oktober tot 9 november).
const corpus = JSON.parse(readFileSync(new URL('./fixtures/opinie-corpus.json', import.meta.url), 'utf8'))
const show = (i) => `${i.source} | ${i.title} | ${i.url}`

test('corpus: genoeg echte gevallen aan beide kanten', () => {
  assert.ok(corpus.opinie.length >= 30, `opinie: ${corpus.opinie.length}`)
  assert.ok(corpus.geen.length >= 40, `geen opinie: ${corpus.geen.length}`)
})

test('corpus: elk opiniestuk wordt herkend', () => {
  const mis = corpus.opinie.filter((i) => !isOpinie(i))
  assert.deepEqual(mis.map(show), [])
})

test('corpus: geen enkel nieuwsbericht, analyse, recensie of liveblog wordt opinie', () => {
  const fout = corpus.geen.filter((i) => isOpinie(i))
  assert.deepEqual(fout.map(show), [])
})

test('de gemiste Telegraaf-column van Valentijn Driessen', () => {
  const vd = corpus.opinie.filter((i) => i.author === 'Valentijn Driessen')
  assert.equal(vd.length, 2)
  for (const i of vd) {
    assert.match(i.url, /telegraaf\.nl\/sport\/voetbal\//) // geen /opinie/ in de link
    assert.ok(isOpinie(i), i.title)
  }
})

test('eigen naam boven de kop telt alleen als het precies de auteur is', () => {
  const base = { source: 'telegraaf', url: 'https://www.telegraaf.nl/sport/voetbal/x/1.html' }
  assert.ok(isOpinie({ ...base, title: 'Valentijn Driessen: ’Onrust ligt op de loer’', author: 'Valentijn Driessen' }))
  assert.ok(!isOpinie({ ...base, title: 'Arne Slot: ’We moeten beter verdedigen’', author: 'Valentijn Driessen' })) // een citaat
  assert.ok(!isOpinie({ ...base, title: 'Trump: ’We winnen’', author: 'Trump' })) // één woord is geen naam
  assert.ok(!isOpinie({ ...base, title: 'Valentijn Driessen: ’…’' })) // zonder auteur geen signaal
})

test('een woord in de slug is geen map: geen signaal', () => {
  assert.ok(!isOpinie({ title: 'x', url: 'https://example.org/news/keeps-opinion-to-himself' }))
  assert.ok(!isOpinie({ title: 'x', url: 'https://example.org/story/four-tet-remixes-the-durutti-column/' }))
  assert.ok(!isOpinie({ title: 'x', url: 'https://example.org/news/1024649/xbox-coo-comments' }))
  assert.ok(isOpinie({ title: 'x', url: 'https://www.ad.nl/voetbal/column-sjoerd-mossou-het-is-tijd~a1b2c3d4/' }))
  assert.ok(isOpinie({ title: 'x', url: 'https://www.dvhn.nl/meningen/columns/klopt/163735278.html' }))
})

test('analyse is geen opinie: ook niet Al Jazeera /news-analysis/ of "Analysis:"', () => {
  assert.ok(!isOpinie({ title: 'Fake polls expose vulnerabilities', url: 'https://www.aljazeera.com/news-analysis/2026/10/31/fake-polls' }))
  assert.ok(!isOpinie({ title: 'Analyse: wat het kabinet nu moet', url: 'https://nos.nl/artikel/2589999-analyse' }))
  assert.ok(!isOpinie({ title: 'Analysis: China’s clean-tech exports', url: 'https://www.carbonbrief.org/analysis-chinas-clean-tech' }))
})

test('label in de kop, rubriek uit de rss, en een Bluesky-post nooit', () => {
  assert.ok(isOpinie({ title: 'Column Sjoerd Mossou | Het is tijd', url: 'https://example.org/a/1' }))
  assert.ok(isOpinie({ title: 'Opinie: Chili kiest voor zijn ouderen', url: 'https://example.org/a/2' }))
  assert.ok(isOpinie({ title: 'COLUMN. Wat een week', url: 'https://example.org/a/3' }))
  assert.ok(!isOpinie({ title: 'Column. Wat een week', url: 'https://example.org/a/3b' })) // alleen de Belgische hoofdletters
  assert.ok(!isOpinie({ title: 'LIVE Formule 1 | Uitstekende start voor Ferrari', url: 'https://example.org/a/4' }))
  assert.ok(isOpinie({ title: 'Iets', url: 'https://example.org/a/5', section: 'Commentaar' }))
  assert.ok(isOpinie({ title: 'Iets', url: 'https://example.org/a/6', type: 'opinie' }))
  assert.ok(!isOpinie({ kind: 'post', title: '', summary: 'Opinie: …', url: 'https://bsky.app/profile/x/post/1' }))
})

test('de server zet `opinion: true` op een column, en niets op nieuws', () => {
  const column = corpus.opinie.find((i) => i.author === 'Valentijn Driessen')
  const nieuws = corpus.geen.find((i) => /news-analysis/.test(i.url))
  const c = toClient({ id: 'a', kind: 'article', ...column })
  const n = toClient({ id: 'b', kind: 'article', ...nieuws })
  assert.equal(c.opinion, true)
  assert.equal('opinion' in n, false) // compact: geen veld, dus geen extra omvang
  assert.equal(opinieInStroom(c), true)
  assert.equal(opinieInStroom(n), false)
  assert.equal(opinieInStroom({ type: 'opinie' }), true) // een feed van vóór het veld
})

const labels = (rij) => rij.items.map((r) => r.label)

test('tabvolgorde: Alles … Sport, dan Opinie, Buiten je bubbel als laatste', () => {
  assert.deepEqual(labels(rubriekRij({ hasBubble: true, hasOpinie: true })), ['Alles', 'Politiek', 'Binnenland', 'Wereld', 'Economie', 'Tech', 'Wetenschap', 'Cultuur', 'Sport', 'Opinie', 'Buiten je bubbel'])
  assert.deepEqual(labels(rubriekRij({ interests: ['politiek', 'wereld'], hasBubble: true, hasOpinie: true })), ['Alles', 'Politiek', 'Wereld', 'Opinie', 'Buiten je bubbel'])
  assert.deepEqual(labels(rubriekRij({ interests: ['tech'], hasOpinie: true })), ['Alles', 'Tech', 'Opinie'])
})

test('Opinie alleen als er opiniestukken zijn; een oude link houdt de tab zichtbaar', () => {
  assert.ok(!labels(rubriekRij({ hasBubble: true })).includes('Opinie'))
  assert.deepEqual(labels(rubriekRij({ interests: ['sport'], filters: { rubriek: OPINIE } })), ['Alles', 'Sport', 'Opinie'])
})

test('Opinie is een rubriek-tab: kiezen, actief, lege regel', () => {
  const tab = rubriekRij({ hasOpinie: true }).items.find((r) => r.label === 'Opinie')
  assert.equal(tab.sig, 'rubriek=opinie')
  const next = kiesRubriek({ bron: 'telegraaf', rubriek: 'sport', onderwerp: '', soort: '' }, tab)
  assert.deepEqual(next, { bron: 'telegraaf', rubriek: 'opinie', onderwerp: '', soort: '' })
  assert.equal(actieveRubriek(next), 'rubriek=opinie')
  assert.equal(legeRegel({ namen: ['NOS'], rubriek: 'Opinie' }), 'Nog geen opinie van NOS vandaag.')
  assert.equal(legeRegel({ rubriek: 'Opinie' }), 'Nog geen opinie vandaag.')
})

test('een opiniestuk staat ook in zijn rubriek en in Alles; nieuws niet onder Opinie', () => {
  const sport = { cat: 'sport' }
  const column = { id: 'c', source: 'telegraaf', title: 'Valentijn Driessen: ’Onrust bij Feyenoord’', topics: ['voetbal'], opinion: true }
  const nieuws = { id: 'n', source: 'telegraaf', title: 'Feyenoord wint van Ajax', topics: ['voetbal'] }
  assert.equal(inRubriek(column, '', sport), true) // Alles
  assert.equal(inRubriek(column, 'sport', sport), true) // zijn rubriek
  assert.equal(inRubriek(column, OPINIE, sport), true) // Opinie
  assert.equal(inRubriek(nieuws, '', sport), true)
  assert.equal(inRubriek(nieuws, 'sport', sport), true)
  assert.equal(inRubriek(nieuws, OPINIE, sport), false)
  // Over het hele corpus: elk opiniestuk onder Opinie, geen enkel nieuwsbericht.
  const stroom = [...corpus.opinie, ...corpus.geen].map((i, k) => toClient({ id: String(k), kind: 'article', ...i }))
  assert.equal(stroom.filter((i) => inRubriek(i, OPINIE)).length, corpus.opinie.length)
  assert.equal(stroom.filter((i) => inRubriek(i, '')).length, stroom.length)
})
