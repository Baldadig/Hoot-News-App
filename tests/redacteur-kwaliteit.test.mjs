// Inhoudelijke kwaliteit van De Redacteur (4 november 2026): lichte stukken (games, cultuur en
// entertainment, lifestyle, consumententech) horen niet in de gewone plekken van wie dat gebied niet
// koos, en niet in de algemene Editie, tenzij algemene nieuwsuitgevers het groot nieuws vinden.
// Aanleiding: GTA VI en Elder Scrolls VI op plek 3 en 4 van de algemene Avondeditie van 3 november en
// Martha Stewart op 09 van een schone beginnerseditie. Geen titels of namen in de regels; de
// regressies hieronder gebruiken de bewaarde live feed (tests/fixtures/live-feed-2026-11-04.json.gz).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lightKind, lightStory, lightChosen, majorGeneralNews, newsRejection, editionStoryCount } from '../shared/edition-policy.mjs'
import { profileOf } from '../shared/editor.mjs'
import { relinkEdition, buildStories, selectEdition } from '../netlify/lib/stories.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { loadLive, liveGeneral, liveBeginner, beginnerFollowed } from '../scripts/redacteur-live.mjs'

const live = loadLive()
const general = liveGeneral(live)
const titleOf = (id) => general.byId.get(id)?.title || ''

test('soort: games, cultuur, lifestyle en consumententech aan bron, onderwerp, URL-rubriek en kopvorm', () => {
  const a = (o) => ({ id: 'x', kind: 'article', source: 'nyt', title: 'Een kop', topics: [], ...o })
  assert.equal(lightKind(a({ source: 'theverge', url: 'https://www.theverge.com/games/1/gta', topics: ['games'] })), 'games')
  assert.equal(lightKind(a({ source: 'eurogamer' })), 'games')
  assert.equal(lightKind(a({ url: 'https://www.nytimes.com/2026/11/03/style/martha-stewart-at-home.html' })), 'cultuur')
  assert.equal(lightKind(a({ source: 'wired', url: 'https://www.wired.com/review/ipad-mini-2026/', topics: ['tech', 'gadgets'] })), 'consument')
  assert.equal(lightKind(a({ source: 'nos', title: 'NOS-podcast uitgeroepen tot beste dagelijkse podcast' })), 'cultuur')
  // Een harde nieuwsreden of een politiek onderwerp houdt het nieuws.
  assert.equal(lightKind(a({ source: 'theverge', url: 'https://www.theverge.com/games/2/x', title: 'EU fines Valve over Steam region locks', topics: ['games'] })), null)
  assert.equal(lightKind(a({ url: 'https://www.nytimes.com/2026/11/03/well/mind/x.html', topics: ['vs-politiek'] })), null)
  assert.equal(lightKind(a({ url: 'https://www.nytimes.com/2026/11/03/world/europe/x.html' })), null)
  // Een podcast als vorm is geen licht onderwerp (The Atlantic over het internet en AI).
  assert.equal(lightKind(a({ source: 'atlantic', url: 'https://www.theatlantic.com/podcasts/2026/10/rebuild-the-internet/1/', topics: ['ai', 'tech'] })), null)
})

test('verhaal: een echte meerderheid van de uitgevers; story.light van de server wint', () => {
  const it = (id, source, o = {}) => ({ id, kind: 'article', source, sourceName: source, title: 'Kop', topics: [], ...o })
  // Eén licht stuk naast één nieuwsstuk (een verkeerde bundel) blijft nieuws.
  assert.equal(lightStory({}, [it('a', 'foreignpolicy', { topics: ['middenoosten'] }), it('b', 'quietus')]), null)
  assert.equal(lightStory({}, [it('a', 'eurogamer'), it('b', 'gamespot'), it('c', 'theverge')]), 'games')
  // Wat het toestel niet heeft, telt via de catalogus alleen als games- of cultuursite.
  assert.equal(lightStory({ sourceNames: ['The Verge', 'Eurogamer', 'GameSpot', 'Tweakers'] }, [it('c', 'theverge', { url: 'https://www.theverge.com/news/1/x' })]), 'games')
  assert.equal(lightStory({ light: null, sourceNames: ['Eurogamer', 'GameSpot'] }, [it('c', 'theverge')]), null)
  assert.equal(lightStory({ light: 'cultuur' }, [it('c', 'nos')]), 'cultuur')
})

test('groot nieuws voor een licht verhaal telt alleen algemene nieuwsuitgevers', () => {
  const gamesSites = { sourceNames: ['The Verge', 'Eurogamer', 'GameSpot', 'IGN', 'Polygon', 'Tweakers'] }
  assert.equal(majorGeneralNews(gamesSites, []), false)
  const wide = { sourceNames: ['NOS', 'NRC', 'de Volkskrant', 'NYT', 'The Guardian', 'BBC'] }
  assert.equal(majorGeneralNews(wide, []), true)
})

test('toelating: licht alleen voor wie het gebied koos; Buiten je bubbel mag licht zijn', () => {
  // Een Nederlandse bron (zoals vermoedelijk bij Martha Stewart, "Binnenland/Wonen"): het internationale
  // plafond speelt dan niet, alleen de soort.
  const sources = [{ id: 'volkskrant', cat: 'nl' }]
  const martha = [{ id: 'm', kind: 'article', source: 'volkskrant', sourceName: 'de Volkskrant', title: 'Op bezoek bij een lifestyle-icoon', url: 'https://www.volkskrant.nl/lifestyle/op-bezoek~b1/', topics: ['wonen'] }]
  const nieuw = profileOf({ sources })
  const cultuur = profileOf({ sources, interests: ['cultuur'] })
  assert.equal(newsRejection(nieuw, {}, martha), 'licht-buiten-interesse')
  assert.equal(newsRejection(cultuur, {}, martha), null)
  assert.equal(newsRejection(nieuw, {}, martha, null, { bubble: true }), null)
  assert.equal(lightChosen(profileOf({ sources, interests: ['tech'], topics: ['ai'] }), 'games'), false)
  assert.equal(lightChosen(profileOf({ sources, interests: ['tech'], topics: ['games'] }), 'games'), true)
})

test('live, algemene Avondeditie 3 november: geen games- of cultuurverhaal in de genummerde plekken', () => {
  const titles = general.entries.map((e) => titleOf(e.leadId || e.id))
  assert.equal(general.entries.length, 10)
  for (const t of titles) assert.ok(!/GTA|Elder Scrolls|Juan Atkins/i.test(t), t)
  // Het gamesverhaal bestaat wel en is licht, maar niet groot nieuws volgens algemene uitgevers.
  const gta = general.stories.find((s) => s.itemIds.some((id) => /GTA VI/.test(titleOf(id))))
  assert.equal(gta.light, 'games')
  // Plekken uit de aanvulling hebben hun eigen rubriek: geen VS-verhaal zonder rubriek.
  const accepteert = general.entries.find((e) => /Accepteert president Trump/.test(titleOf(e.leadId || e.id)))
  assert.equal(accepteert?.desk, 'vs')
})

test('live, schone beginnerseditie: geen licht stuk, tien plekken, bubbel apart', () => {
  const ed = liveBeginner(live)
  const items = new Map(ed.items.map((i) => [i.id, i]))
  const regular = ed.entries.filter((e) => e.desk !== 'bubbel')
  assert.equal(editionStoryCount(ed.entries), 10)
  for (const e of regular) assert.ok(!/podcast/i.test(items.get(e.leadId || e.id)?.title || ''), items.get(e.leadId || e.id)?.title)
  assert.equal(ed.entries.at(-1).desk, 'bubbel')
})

test('Martha-vorm: een lifestylestuk van een basisbron vult geen gewone plek bij een beginner; bij Cultuur toegelaten', () => {
  // Zonder het stuk zelf (het staat niet meer in de feed) een vorm met dezelfde kenmerken: Nederlandse
  // basisbron, onderwerp wonen, lifestyle-rubriek in de URL.
  const t = live.edition.builtAt
  const martha = { id: 'martha', kind: 'article', source: 'volkskrant', sourceName: 'de Volkskrant', title: 'In de boerderijkeuken van een lifestyle-icoon', summary: 'Een rondleiding door huis en tuin.', image: 'x', url: 'https://www.volkskrant.nl/lifestyle/in-de-boerderijkeuken~b2/', publishedAt: t, topics: ['wonen'] }
  // Twee basisbronnen brengen het (zoals een lifestyleverhaal dat rondgaat): op d05d0c7 stond het zo op plek 05
  // als "Rubriek Binnenland".
  const m2 = { ...martha, id: 'martha2', source: 'nrc', sourceName: 'NRC', url: 'https://www.nrc.nl/lifestyle/2026/11/03/boerderijkeuken-a1' }
  const st = { id: 'smartha', leadId: 'martha', itemIds: ['martha', 'martha2'], sourceCount: 3, publisherCount: 3, publisherCountries: ['NL'], sourceNames: ['de Volkskrant', 'NRC', 'RTL Nieuws'], latestAt: t, desk: 'binnenland' }
  const run = (o = {}) => composePersonal({ global: live.edition, stories: [...live.stories, st], items: [...live.items, martha, m2], sources: live.sources, followed: beginnerFollowed(live), interests: [], topics: [], now: Date.parse(t), builtAt: t, ...o })
  const ed = run()
  assert.ok(!ed.entries.some((e) => ['martha', 'martha2', 'smartha'].includes(e.leadId || e.id) || e.id === 'smartha'))
  assert.equal(editionStoryCount(ed.entries), 10) // de plek gaat naar nieuws, niet naar een gat
  // Voor wie Cultuur koos, is het stuk toegelaten (of het een plek krijgt, hangt van het gewicht af).
  const prof = profileOf({ sources: live.sources, interests: ['cultuur'], followed: beginnerFollowed(live) })
  assert.equal(newsRejection(prof, {}, [martha]), null)
})

test('vloer: haalt het nieuws de vier plekken niet, dan vult een licht stuk de laatste plek, achteraan', () => {
  const now = Date.parse('2026-11-04T05:00:00Z')
  const at = new Date(now - 36e5).toISOString()
  const mk = (id, source, title, o = {}) => ({ id, kind: 'article', source, sourceName: source, title, summary: `${title}.`, image: 'x', publishedAt: at, topics: [], ...o })
  const news = [mk('n1', 'nos', 'Gemeente Utrecht bouwt woningen'), mk('n2', 'nrc', 'Kabinet Jetten presenteert plan voor zorg'), mk('n3', 'nos', 'Rijkswaterstaat sluit brug bij Zwolle')]
  const light = [mk('l1', 'nos', 'Nieuwe talkshow van presentator start op zondag', { url: 'https://nos.nl/cultuur-media/1' })]
  const items = [...news, ...light]
  const global = { id: 'g', builtAt: at, entries: [{ kind: 'item', id: 'n1', desk: 'binnenland' }], items: [] }
  const sources = [{ id: 'nos', cat: 'nl', lang: 'nl', name: 'nos' }, { id: 'nrc', cat: 'nl', lang: 'nl', name: 'nrc' }]
  const ed = composePersonal({ global, stories: [], items, sources, followed: new Set(['nos', 'nrc']), now, builtAt: at })
  const ids = ed.entries.map((e) => e.leadId || e.id)
  assert.equal(ids.length, 4)
  assert.equal(ids.at(-1), 'l1')
})

test('relink: een los gebleven hoofdbericht krijgt zijn eigen rubriek, niet die van een vervallen bundel', () => {
  const lead = { id: 'smokkel', kind: 'article', source: 'nrc', title: 'De mensensmokkelaars die bootmigranten naar het VK brengen, wijken uit naar België', summary: '', url: 'https://www.nrc.nl/nieuws/2026/11/03/x' }
  const other = { id: 'kyiv', kind: 'article', source: 'nos', title: 'Gesprekken tussen VS, Oekraïne en Rusland in Abu Dhabi', summary: '' }
  const entries = [{ kind: 'story', id: 'oud', leadId: 'smokkel', desk: 'oekraine', itemIds: ['smokkel', 'kyiv'] }]
  const out = relinkEdition(entries, { stories: [], snapshot: [{ id: 'oud', itemIds: ['smokkel', 'kyiv'], sourceCount: 2 }], byId: new Map([[lead.id, lead], [other.id, other]]) })
  assert.equal(out[0].kind, 'item')
  assert.equal(out[0].desk, 'buitenland')
})

// ---- Na review 4 november 2026 (RELEASE-REVIEW.md B1, B2, B3) ----
const deathNl = () => {
  const t = live.edition.builtAt
  const mk = (id, source, sourceName, url) => ({ id, kind: 'article', source, sourceName, title: 'Zanger Jan Voorbeeld (71) overleden', summary: 'De zanger was decennialang een van de bekendste artiesten van het land.', image: 'x', url, publishedAt: t, topics: ['muziek'] })
  const items = [
    mk('d1', 'nos', 'NOS', 'https://nos.nl/artikel/1-zanger-overleden'),
    mk('d2', 'rtl', 'RTL Nieuws', 'https://www.rtl.nl/boulevard/artikel/2/zanger-overleden'),
    mk('d3', 'telegraaf', 'De Telegraaf', 'https://www.telegraaf.nl/entertainment/3/zanger-overleden'),
    mk('d4', 'volkskrant', 'de Volkskrant', 'https://www.volkskrant.nl/cultuur-media/zanger-overleden~b4/'),
    mk('d5', 'ad', 'AD', 'https://www.ad.nl/show/zanger-overleden~a5/'),
    mk('d6', 'nu', 'NU.nl', 'https://www.nu.nl/muziek/6/zanger-overleden.html'),
    mk('d7', 'parool', 'Het Parool', 'https://www.parool.nl/kunst-media/zanger-overleden~b7/'),
  ]
  const st = { id: 'sdood', leadId: 'd1', itemIds: items.map((i) => i.id), sourceCount: 7, publisherCount: 7, publisherCountries: ['NL'], sourceNames: items.map((i) => i.sourceName), latestAt: t, desk: 'binnenland' }
  return { t, items, st }
}

test('B1: groot Nederlands cultuurnieuws (zeven NL-redacties) is groot genoeg voor een licht verhaal', () => {
  const { items, st } = deathNl()
  assert.equal(lightStory({}, items), 'cultuur')
  assert.equal(majorGeneralNews(st, items), true)
  // Vier algemene uitgevers is niet genoeg, en games- of cultuursites tellen niet mee.
  assert.equal(majorGeneralNews({ sourceNames: ['NOS', 'NRC', 'de Volkskrant', 'AD', 'IGN', 'Pitchfork', '3voor12'] }, []), false)
  // Een lezer met Politiek en Binnenland krijgt het verhaal gewoon toegelaten.
  const prof = profileOf({ sources: live.sources, interests: ['politiek', 'binnenland'] })
  assert.equal(newsRejection(prof, st, items), null)
})

test('B1: het verhaal komt in de algemene Editie en in de beginnerseditie', () => {
  const { t, items, st } = deathNl()
  const now = Date.parse(t)
  const all = new Map([...live.related, ...live.items, ...live.edition.items].map((i) => [i.id, i]))
  const articles = [...[...all.values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now), ...items]
  const stories = buildStories(articles, {}, { mainIds: MAIN_IDS })
  const entries = selectEdition(stories, articles, { mainIds: MAIN_IDS, now })
  const ids = entries.flatMap((e) => [e.leadId || e.id, ...(e.itemIds || [])])
  assert.ok(items.some((i) => ids.includes(i.id)), 'algemene Editie')
  // Persoonlijk: zoals het toestel rekent, met deze algemene Editie als basis.
  const byId = new Map(articles.map((i) => [i.id, i]))
  const global = { ...live.edition, entries: [...entries, ...live.edition.entries.filter((e) => e.desk === 'bubbel')], items: [...new Set(ids)].map((id) => byId.get(id)).filter(Boolean).concat(live.edition.items) }
  const ed = composePersonal({ global, stories: [...live.stories, st], items: [...live.items, ...items], sources: live.sources, followed: beginnerFollowed(live), interests: [], topics: [], now, builtAt: t })
  assert.ok(ed.entries.some((e) => e.id === 'sdood' || items.some((i) => i.id === (e.leadId || e.id) || (e.itemIds || []).includes(i.id))), 'beginnerseditie')
})

test('B2: geen valse licht-herkenning bij deals, mediapolitiek en harde nieuwswoorden', () => {
  const a = (o) => ({ id: 'x', kind: 'article', source: 'nos', title: 'Een kop', topics: [], ...o })
  assert.equal(lightKind(a({ source: 'volkskrant', title: 'Nvidia-deal met Saudi-Arabië', topics: ['bedrijven', 'ai'] })), null)
  assert.equal(lightKind(a({ source: 'nyt', title: 'EU and US reach trade deal' })), null)
  // Live in de fixture: NOS over Tsjechische protesten tegen de omroephervorming (onderwerp media, kale URL).
  const tsjechen = [...live.related, ...live.items].find((i) => /Tsjechen de straat op/.test(i.title))
  assert.ok(tsjechen)
  assert.equal(lightKind(tsjechen), null)
  // Media met een licht URL-pad blijft licht; een echte aanbieding via de URL ook.
  assert.equal(lightKind(a({ url: 'https://nos.nl/cultuur-media/1/nieuwe-talkshow', topics: ['media'] })), 'cultuur')
  assert.equal(lightKind(a({ source: 'theverge', url: 'https://www.theverge.com/deals/1/x', title: 'The best deals on headphones' })), 'consument')
  for (const title of ['Protest tegen nieuwe muziekwet', 'Overname van uitgeverij afgerond', 'Fusie van twee filmstudio’s', 'Honderden ontslagen bij streamingdienst', 'Rechter verbiedt concert', 'Staking bij omroep', 'Regering grijpt in bij publieke omroep'])
    assert.equal(lightKind(a({ url: 'https://www.ad.nl/show/x~a1/', title })), null, title)
})

test('B3: een gevolgde lichte bron telt in de persoonlijke Editie als gekozen voor haar eigen stukken', () => {
  const pitch = [{ id: 'p', kind: 'article', source: 'pitchfork', sourceName: 'Pitchfork', title: 'A new album review', url: 'https://pitchfork.com/reviews/albums/x/', topics: ['muziek'] }]
  const ign = [{ id: 'g', kind: 'article', source: 'ign', sourceName: 'IGN', title: 'A new trailer', url: 'https://www.ign.com/articles/x', topics: ['games'] }]
  const base = beginnerFollowed(live)
  const volgt = profileOf({ sources: live.sources, followed: new Set([...base, 'pitchfork', 'ign']) })
  const niet = profileOf({ sources: live.sources, followed: base })
  assert.equal(newsRejection(volgt, {}, pitch), null)
  assert.equal(newsRejection(volgt, {}, ign), null)
  assert.equal(newsRejection(niet, {}, pitch), 'licht-buiten-interesse')
  // Een basisbron (3voor12 volgt iedereen vanaf het begin) is geen eigen keuze.
  const drie = [{ id: 'd', kind: 'article', source: '3voor12', sourceName: '3voor12', title: 'Kijk terug: een band live', url: 'https://3voor12.vpro.nl/x', topics: ['muziek'] }]
  assert.equal(newsRejection(niet, {}, drie), 'licht-buiten-interesse')
  // Alleen voor stukken van díe bron: een lifestylestuk van een basisbron blijft buiten.
  const vk = [{ id: 'v', kind: 'article', source: 'volkskrant', sourceName: 'de Volkskrant', title: 'Op bezoek bij een lifestyle-icoon', url: 'https://www.volkskrant.nl/lifestyle/x~b1/', topics: ['wonen'] }]
  assert.equal(newsRejection(volgt, {}, vk), 'licht-buiten-interesse')
})

test('B3: de algemene Editie blijft streng voor licht nieuws van vakbronnen', () => {
  for (const t of general.entries.map((e) => titleOf(e.leadId || e.id))) assert.ok(!/GTA|Elder Scrolls|Juan Atkins/i.test(t), t)
})

