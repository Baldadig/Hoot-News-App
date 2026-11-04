// De verkiezingsnacht van 4 november 2026 (H7). Live feed van https://gethoot.app/api/feed om 06:33 (NL),
// meta.updatedAt 05:30 UTC: tests/fixtures/live-feed-2026-11-04-midterms.json.gz (meting:
// Hoot-design/woensdag-2026-11-04/midterms/METING.md). De midterms stonden in twaalf verhalen en openden de
// Editie niet; Engels en Nederlands kwamen niet samen; resultatenpagina's trokken aan de bundel; koppen van
// vóór de uitslag; de Nederlandse duiding hing los. De regels zijn algemeen (geen namen of landen): de
// titels hieronder wijzen alleen aan welk verhaal of stuk de toets bedoelt.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { buildStories, selectEdition, isLive, voteKind, votePlace, voteResultOf, centralItems, freshest, dutchFirst, leadPool, BACKGROUND_GAP, FAMILY_MAX } from '../netlify/lib/stories.mjs'
import { MAIN_IDS, SOURCES } from '../netlify/lib/sources.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { proposeSources } from '../src/lib/welcome.js'
import { newsRejection, lightKind, lightStory } from '../shared/edition-policy.mjs'
import { profileOf } from '../shared/editor.mjs'

const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live-feed-2026-11-04-midterms.json.gz', import.meta.url))).toString('utf8'))
const now = Date.parse(feed.meta.updatedAt)
const all = new Map([...feed.related, ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
// Zoals de server: alle berichten die er toen waren, opnieuw gebundeld in de uitgebreide stand (build.mjs).
const articles = [...all.values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now).map(({ storyId, ...i }) => i)
const byId = new Map(articles.map((i) => [i.id, i]))
const stories = buildStories(articles, {}, { mainIds: MAIN_IDS, keys: true, extended: true })
const storyById = new Map(stories.map((s) => [s.id, s]))
const titleOf = (id) => all.get(id)?.title || ''
const storyWith = (re) => stories.find((s) => s.itemIds.some((id) => re.test(titleOf(id))))
const uitslag = storyWith(/^Enorme winst Democraten/)
const LANG = new Map(SOURCES.map((s) => [s.id, s.lang]))
const dutch = (id) => LANG.get(all.get(id)?.source) === 'nl'
// Een plek over de Amerikaanse stembus: de meerderheid van de stukken van het verhaal noemt de stembus.
const stembus = (e) => {
  const its = (e.kind === 'story' ? storyById.get(e.id)?.itemIds || feed.stories.find((s) => s.id === e.id)?.itemIds || [] : [e.id]).map((id) => all.get(id)).filter(Boolean)
  return its.filter((i) => voteKind(i) >= 1 && votePlace(i) === 'us').length * 2 > its.length
}

test('verkiezingsnacht: de uitslag is één bundel, Nederlands en Engels samen, met de deeluitslagen', () => {
  assert.ok(uitslag, 'uitslagbundel')
  assert.ok(uitslag.publisherCount >= 20, `${uitslag.publisherCount} uitgevers`)
  const langs = new Set(uitslag.itemIds.map((id) => LANG.get(all.get(id).source)))
  assert.ok(langs.has('nl') && langs.has('en'))
  const has = (re) => uitslag.itemIds.some((id) => re.test(titleOf(id)))
  // De Engelse uitslag, de losse Nederlandse duiding en de deeluitslagen (Senaatsraces, gouverneurs).
  for (const re of [/^Democrats clinch majority in Senate/, /^Een ‘blauwe golf’\?/, /^Democraten grijpen de macht/, /flips Iowa Senate seat/, /^Jon Ossoff wins Georgia Senate race/, /Keisha Lance Bottoms/, /^Kansas elects first Democratic senator/]) assert.ok(has(re), String(re))
  // Geen andere uitslagbundel ernaast.
  assert.equal(stories.filter((s) => voteResultOf(s.itemIds.map((id) => byId.get(id)))).length, 1)
  // Wat vóór het uitslagmoment verscheen, en wat niet over de stembus gaat, hoort er niet bij.
  for (const re of [/^6 Themes to Watch/, /^The Election Deniers Are in Retreat/, /^Trump Says U\.S\. to End \$4 Billion/, /^Here’s How to Watch NBC/]) assert.ok(!has(re), String(re))
})

test('verkiezingsnacht: resultatenpagina’s, meepraatpagina’s en draaiboeken zijn liveblogs', () => {
  const page = (title) => ({ title, url: 'https://example.org/x' })
  for (const t of ['Bekijk hier alle resultaten van de midterms in de Verenigde Staten', 'Vind hier alle resultaten van de Amerikaanse tussentijdse verkiezingen', 'Uitslagen midterms VS: bekijk hier de belangrijkste uitkomsten', 'Senaat in handen van de Democraten: bekijk hier de resultaten van de Amerikaanse midterms', 'Praat mee en stel jouw vragen over de Amerikaanse verkiezingen', 'Spoorboekje midterms 2026: de Amerikaanse verkiezingsnacht van uur tot uur', 'Midterm election 2026 results live: Trump left threatening ‘Veto’', 'Midterm Elections 2026: Live Results Map | Democrats Flip The Senate', 'Live briefing: Democrats take the Senate', 'Midterm elections 2026: all the news'])
    assert.ok(isLive(page(t)), t)
  for (const t of ['Kiezers praten mee over de toekomst van hun stad', 'Wat je hier ziet, is de nieuwe Senaat', 'Democraten heroveren Senaat en Huis van Afgevaardigden, Trump erkent verlies', 'The results are in for the new vaccine trial'])
    assert.ok(!isLive(page(t)), t)
  // En ze zitten in geen enkel verhaal.
  for (const st of stories) for (const id of st.itemIds) assert.ok(!isLive(byId.get(id)), titleOf(id))
})

test('verkiezingsnacht, algemene Editie: de uitslag opent, met een Nederlandse samenvattende kop, en versnippert niet', () => {
  const entries = selectEdition(stories, articles, { mainIds: MAIN_IDS, now })
  assert.ok(entries.length <= 10)
  assert.equal(entries[0].id, uitslag.id)
  const lead = entries[0].leadId
  assert.ok(dutch(lead), titleOf(lead))
  assert.ok(!/\?/.test(titleOf(lead)) && !isLive(all.get(lead)), titleOf(lead))
  // Hooguit FAMILY_MAX plekken over de stembus, en geen tweede uitslag (een losse race).
  const vote = entries.filter(stembus)
  assert.ok(vote.length <= FAMILY_MAX, vote.map((e) => titleOf(e.leadId || e.id)).join(' / '))
  for (const e of entries.slice(1)) assert.ok(!/\b(wins|flips|elects)\b.*\b(senate|seat|governor|senator)\b/i.test(titleOf(e.leadId || e.id)), titleOf(e.leadId || e.id))
  // De rest is het overige nieuws: het Spaanse ontslag en de ombudsman staan er, de rechtszaak van een
  // zanger (licht, Nederlands onder Buitenland) niet.
  const titles = entries.map((e) => titleOf(e.leadId || e.id))
  assert.ok(titles.some((t) => /Spaanse (transport)?minister/.test(t)), titles.join(' / '))
  assert.ok(titles.some((t) => /ombudsman/i.test(t)), titles.join(' / '))
  assert.ok(!titles.some((t) => /Borsato/.test(t)))
})

test('verkiezingsnacht, op de verhalen zoals de server ze had: één onderwerp, één gewicht', () => {
  // Ook zonder nieuwe bundeling opent de uitslag: het hoofd van de familie telt alle uitgevers van de familie.
  const entries = selectEdition(feed.stories, articles, { mainIds: MAIN_IDS, now })
  assert.equal(entries[0].id, 'sm2devs')
  assert.ok(entries.filter(stembus).length <= FAMILY_MAX)
  assert.ok(!entries.some((e) => /Borsato/.test(titleOf(e.leadId || e.id))))
})

// Vier lezers zoals in de meting: de negen basisbronnen plus wat het welkom voor hun interesses voorstelt.
const base = new Set(feed.sources.filter((s) => s.kind !== 'sociaal' && !s.optional).map((s) => s.id))
const followOf = (interests) => (interests.length ? new Set([...base, ...proposeSources(feed.sources.filter((s) => s.pick), interests)]) : base)
const general = selectEdition(stories, articles, { mainIds: MAIN_IDS, now })
const globalEd = { ...feed.edition, entries: [...general, ...feed.edition.entries.filter((e) => e.desk === 'bubbel')], items: [...new Set([...general.flatMap((e) => (e.kind === 'story' ? storyById.get(e.id).itemIds : [e.id])), ...feed.edition.items.map((i) => i.id)])].map((id) => all.get(id)).filter(Boolean) }
const storyOfItem = new Map(stories.flatMap((s) => s.itemIds.map((id) => [id, s.id])))
const items = feed.items.map(({ storyId, ...i }) => (storyOfItem.has(i.id) ? { ...i, storyId: storyOfItem.get(i.id) } : i))
const READERS = { beginner: [[], []], binnenpol: [['binnenland', 'politiek'], []], wereldvs: [['wereld', 'politiek'], ['vs-politiek', 'trump']], techeco: [['tech', 'economie'], []] }

test('verkiezingsnacht, persoonlijke Edities: de uitslag één keer, bovenaan (Binnenland opent Nederlands), Nederlandse kop', () => {
  for (const [name, [interests, topics]] of Object.entries(READERS)) {
    const ed = composePersonal({ global: globalEd, stories, items, sources: feed.sources, followed: followOf(interests), interests, topics, now, builtAt: feed.meta.updatedAt, previous: null })
    const regular = ed.entries.filter((e) => e.desk !== 'bubbel')
    assert.ok(regular.length <= 10, name)
    const k = regular.findIndex((e) => e.id === uitslag.id)
    if (interests.includes('binnenland')) {
      assert.equal(regular[0].desk, 'binnenland', name)
      assert.ok(k >= 0 && k <= 2, `${name}: plek ${k + 1}`)
    } else assert.equal(k, 0, `${name}: plek ${k + 1}`)
    assert.ok(dutch(regular[k].leadId), `${name}: ${titleOf(regular[k].leadId)}`)
    assert.ok(regular.filter(stembus).length <= FAMILY_MAX, name)
  }
})

test('stembus: stembusstuk, uitslagstuk en plaats, zonder namen', () => {
  const a = (title, summary = '', source = 'nos') => ({ id: title, title, summary, source, publishedAt: feed.meta.updatedAt })
  assert.equal(voteKind(a('Democrat Josh Turek flips Iowa Senate seat', '', 'aljazeera')), 2) // zetel + uitslag, zonder het woord verkiezing
  assert.equal(voteKind(a('Amerikanen naar de stembus, hier wordt het verschil gemaakt')), 1)
  assert.equal(voteKind(a('Feyenoord lijdt kansloze nederlaag tegen Internazionale')), 0)
  assert.equal(voteKind(a('Verstappen wins the race in Brazil', 'The election of the year', 'bbc-sport')), 0) // sportbron telt niet
  assert.equal(votePlace(a('Kansas elects first Democratic senator in almost a century', '', 'aljazeera')), 'us')
  assert.equal(votePlace(a('ANC faces anger as South Africans vote in local elections', '', 'guardian')) === 'us', false)
})

test('kop: geen vraag, geen achtergrond van vóór het nieuws, Nederlands voor, een samenvatting uit een grote bundel', () => {
  const t0 = Date.parse('2026-11-04T05:00:00Z')
  const at = (h) => new Date(t0 - h * 36e5).toISOString()
  const it = (id, source, title, h) => ({ id, source, title, publishedAt: at(h) })
  // Achtergrond: meer dan BACKGROUND_GAP ouder dan het nieuwste stuk.
  const old = it('o', 'wired', 'Our Risk, Their Reward: an interview ahead of the vote', BACKGROUND_GAP / 36e5 + 6)
  const fresh = it('f', 'npr', 'On a historic night, the mayor says the vote shows power', 1)
  assert.deepEqual(freshest([old, fresh]).map((i) => i.id), ['f'])
  assert.deepEqual(freshest([old]).map((i) => i.id), ['o']) // niets nieuwers: dan toch
  // Nederlands, dan Vlaams, dan de rest.
  assert.deepEqual(dutchFirst([it('e', 'nyt', 'Trump Says He Will Accept the Results', 1), it('v', 'hln', 'Trump feliciteert Democraten', 1), it('n', 'ad', 'Trump accepteert uitslag', 1)]).map((i) => i.id), ['n'])
  // Een vraag alleen als er niets anders is.
  const q = it('q', 'nrc', 'Accepteert president Trump een nederlaag?', 1)
  const s = it('s', 'nrc', 'Midterms: hoe een prediker Trump vleugellam kan maken', 2)
  assert.equal(leadPool([q, s], [q, s], t0)[0].id, 's')
  // Uit de grote uitslagbundel: de samenvattende kop, geen reportage of deelstuk.
  const its = uitslag.itemIds.map((id) => byId.get(id))
  const core = centralItems(its).map((i) => i.title)
  assert.ok(core.some((t) => /^Enorme winst Democraten/.test(t)), core.join(' / '))
  assert.ok(!core.some((t) => /^Feestende Texanen/.test(t)))
})

test('normen: één sportonderwerp in een grote bundel houdt de uitslag niet tegen; licht via de showrubriek', () => {
  const prof = profileOf()
  const st = { sourceCount: 3, publisherCount: 3, sourceNames: ['Al Jazeera', 'NPR', 'NOS'] }
  const its = [
    { id: 'a', source: 'aljazeera', title: 'Kansas elects first Democratic senator', topics: ['f1', 'vs-politiek'] },
    { id: 'b', source: 'npr', title: 'Adam Hamilton becomes the first Democratic senator from Kansas', topics: ['vs-politiek'] },
    { id: 'c', source: 'nos', title: 'Democraten winnen Senaat', topics: ['vs-politiek'] },
  ]
  assert.notEqual(newsRejection(prof, st, its, 'vs'), 'sport-niet-gekozen')
  assert.equal(newsRejection(prof, { sourceCount: 1 }, [its[0]], 'vs'), 'sport-niet-gekozen') // één los stuk blijft streng
  // De showrubriek van een krant is licht (Borsato bij de rechter: AD /show/, VRT muziek, HLN).
  const ad = { source: 'ad', title: 'Dat Borsato de duurste advocaten inhuurde is wel uit te leggen', url: 'https://www.ad.nl/show/dat-borsato~a67c6785/', topics: ['misdaad'] }
  assert.equal(lightKind(ad), 'cultuur')
  // Het verhaal zoals de server het had (HLN, VRT, AD): twee van de drie uitgevers brengen het als licht stuk.
  const borsato = feed.stories.find((s) => s.itemIds.some((id) => /^Marco Borsato opnieuw voor de rechter/.test(titleOf(id))))
  assert.equal(lightStory({}, borsato.itemIds.map((id) => all.get(id))), 'cultuur')
})
