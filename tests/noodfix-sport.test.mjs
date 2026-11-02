// Noodfix 2 november 2026: "The New York City Marathon in Photos and Videos" (NYT, Groot nieuws · 18 bronnen)
// stond bovenaan de algemene en Alex' persoonlijke Editie. De bundel (stke0dt) knoopte een F1-titel, een
// marathon en meer sport aan elkaar; de kop was een fotogalerij. Twee regels: sport herken je aan het
// verhaal (niet aan de kop), en een galerij is nooit de kop van een verhaal.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SNAP, BUNDLE, byId, storyOf, itemsOf, PERSONAS, composeFor, generalEntries } from './helpers/noodfix.mjs'
import { sportStory, isGallery, majorNews, allowedNews, exceptionalDutchSport } from '../shared/edition-policy.mjs'
import { leadCandidates, buildStories } from '../netlify/lib/stories.mjs'
import { profileOf } from '../shared/editor.mjs'

const bundle = storyOf(BUNDLE)
const catOf = new Map(SNAP.sources.map((s) => [s.id, s.cat]))
const idsOf = (ed) => ed.entries.map((e) => e.id)

test('fixture: de bundel is zoals de live feed hem leverde', () => {
  assert.equal(bundle.sourceCount, 18)
  assert.equal(bundle.leadId, 'q3vt2e')
  assert.equal(bundle.desk, null)
  assert.match(byId.get('q3vt2e').title, /in Photos and Videos/)
})

test('(a) de bundel wordt als sport herkend, met alle bekende stukken', () => {
  assert.equal(sportStory(bundle, itemsOf(bundle), catOf), true)
})

test('(a) ook zonder de sportstukken: een toestel dat alleen NYT, NRC en Volkskrant kent', () => {
  const mine = itemsOf(bundle).filter((i) => ['nyt', 'nrc', 'volkskrant'].includes(i.source))
  assert.ok(mine.length >= 2 && mine.length < 8)
  assert.equal(sportStory(bundle, mine, catOf), true)
  assert.equal(sportStory(bundle, mine), true)
})

test('(a) een server die de vlag zelf zet, wint', () => {
  assert.equal(sportStory({ ...bundle, sport: false }, itemsOf(bundle), catOf), false)
  assert.equal(sportStory({ sourceNames: ['NYT', 'NRC'], sport: true }, [], catOf), true)
})

test('(b) de bundel staat niet in de algemene Editie', () => {
  const ids = generalEntries().map((e) => e.id)
  assert.ok(ids.length > 0)
  assert.ok(!ids.includes(BUNDLE), ids.join(','))
})

for (const p of PERSONAS) {
  test(`(b) ${p.id}: de bundel staat niet in de persoonlijke Editie en is niet de #1`, () => {
    const ed = composeFor(p)
    assert.ok(ed.entries.length > 0)
    assert.ok(!idsOf(ed).includes(BUNDLE), idsOf(ed).join(','))
    assert.ok(!ed.entries.some((e) => e.leadId === 'q3vt2e'))
  })
}

test('(c) een galerij is nooit de kop als er een alternatief is', () => {
  const nyt = itemsOf(bundle).filter((i) => i.source === 'nyt')
  assert.ok(nyt.length >= 2 && nyt.some(isGallery))
  const order = leadCandidates(nyt, new Set(['nyt']), null, Date.parse(SNAP.meta.updatedAt))
  assert.equal(isGallery(order[0]), false)
  assert.equal(isGallery(order[order.length - 1]), true)
})

test('(c) galerij-vormen: kop en pad', () => {
  const t = (title, url = 'https://x.test/a') => ({ title, url })
  for (const x of [t('Rome in Photos'), t('Het weekend in Pictures'), t('Photos and Video from the march'), t('Slideshow: de dag'), t('Gallery of the year'), t('Amsterdam in beeld'), t('Fotoreportage uit Kyiv'), t('Fotoserie: de oogst'), t('x', 'https://nyt.test/interactive/2026/a.html'), t('x', 'https://x.test/slideshow/a'), t('x', 'https://x.test/gallery/a'), t('RAZEND', 'https://x.test/2026/the-marathon-in-photos-and-videos.html')]) assert.equal(isGallery(x), true, x.title + x.url)
  for (const x of [t('Rome stemt over de begroting'), t('Het museum opent een galerie met nieuwe kunst'), t('Parlement zet foto van minister op de agenda')]) assert.equal(isGallery(x), false, x.title)
})

test('(c) een verhaal waarvan alle stukken galerij zijn, komt niet in de Editie', () => {
  const g = byId.get('q3vt2e')
  const st = { id: 'sg', itemIds: ['q3vt2e'], sourceCount: 12, publisherCount: 12, publisherCountries: ['NL', 'US', 'GB'], ownCount: 1 }
  const prof = profileOf({ interests: ['wereld'], topics: [], followed: new Set(['nyt']), sources: SNAP.sources })
  assert.equal(allowedNews(prof, st, [g], null), false)
  assert.equal(majorNews(st, [g]), false)
})

test('(d) echt nieuws met veel uitgevers uit meerdere landen blijft Groot nieuws', () => {
  for (const id of ['s1hws9py', 'swm5zgm', 's1qa2iob']) {
    const st = storyOf(id)
    const items = itemsOf(st)
    assert.equal(sportStory(st, items, catOf), false, id)
    assert.equal(majorNews(st, items), true, id)
  }
  const ed = composeFor({ id: 'wereld', interests: ['wereld'] })
  assert.equal(ed.entries[0].id, 's1hws9py') // 14 uitgevers, het grootste echte nieuws van de fixture
  assert.ok(idsOf(ed).includes('swm5zgm'))
})

test('(d) een verhaal met 18 niet-sportuitgevers uit vijf landen is Groot nieuws voor iedereen', () => {
  const st = storyOf('s1hws9py')
  const wide = { ...st, sourceCount: 18, publisherCount: 18, publisherCountries: ['BE', 'GB', 'NL', 'QA', 'US'] }
  const prof = profileOf({ interests: ['politiek'], topics: [], followed: new Set(['nyt', 'nrc']), sources: SNAP.sources })
  assert.equal(majorNews(wide, itemsOf(st)), true)
  assert.equal(allowedNews(prof, wide, itemsOf(st), null), true)
})

test('(e) groot sportnieuws met Nederland, WK en finale in één kop blijft mogelijk', () => {
  const sport = (id, source, sourceName, title) => ({ id, kind: 'article', source, sourceName, title, summary: 's', url: `https://x.test/${id}`, topics: ['voetbal'], publishedAt: SNAP.meta.updatedAt })
  const items = [
    sport('w1', 'nos-sport', 'NOS Sport', 'Nederland wint de WK-finale na strafschoppen: Oranje wereldkampioen'),
    sport('w2', 'bbc-sport', 'BBC Sport', 'Netherlands win the World Cup final'),
    sport('w3', 'espn', 'ESPN', 'Dutch crowned world champions'),
    sport('w4', 'sporza', 'Sporza', 'Oranje kampioen'),
    sport('w5', 'guardian-sport', 'The Guardian Sport', 'Netherlands lift the trophy'),
    sport('w6', 'autosport', 'Autosport', 'Verstappen viert mee'),
  ]
  const st = { id: 'sw', itemIds: items.map((i) => i.id), sourceCount: 9, publisherCount: 9, publisherCountries: ['NL', 'GB', 'US', 'BE'], ownCount: 1, sourceNames: ['NOS Sport', 'BBC Sport', 'ESPN', 'Sporza', 'The Guardian Sport', 'Autosport', 'NOS', 'AD', 'NRC'] }
  assert.equal(sportStory(st, items, catOf), true)
  assert.equal(exceptionalDutchSport(st, items), true)
  const prof = profileOf({ interests: ['politiek'], topics: [], followed: new Set(['nos-sport']), sources: SNAP.sources })
  assert.equal(allowedNews(prof, st, items, null), true)
  // Zonder Nederland/WK/finale in één kop: weg.
  const plain = items.map((i, k) => ({ ...i, title: ['Antonelli wereldkampioen', 'Hamilton boos', 'Verstappen wint', 'Leclerc strafpunten', 'Piastri uit de punten', 'Norris sneller'][k] }))
  assert.equal(allowedNews(prof, st, plain, null), false)
})

test('bundelen met buildStories zet de sportvlag alleen op sportverhalen', () => {
  const articles = [...SNAP.items].filter((i) => i.kind === 'article')
  const stories = buildStories(articles, {}, { mainIds: new Set(['nyt', 'nrc']), keys: true })
  for (const st of stories) {
    const items = st.itemIds.map((id) => articles.find((a) => a.id === id))
    assert.equal(st.sport === true, sportStory({ ...st, sport: undefined }, items, catOf), st.id)
  }
  assert.ok(stories.some((s) => s.sport === true), 'de F1-stukken horen samen een sportverhaal te vormen')
})
