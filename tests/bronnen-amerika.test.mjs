// Amerikaans nieuws erbij (14 november 2026), besluit van Alex: "Wapo, Axios en ProPublica zijn gerenommeerde bronnen.
// Als deze een kwalitatieve feed hebben, mogen ze erbij. Fox, denk voor Nederland niet interessant." Zie
// Hoot-design/bronnen-internationaal-2026-11-14/AMERIKA-VERSLAG.md. De landenregel zelf staat in
// tests/bronnen-internationaal.test.mjs. Hier:
//   1. Axios en ProPublica: Engelstalig, Internationaal, Amerikaans, gratis, voor niemand ongevraagd aan;
//   2. alleen bronnen met een kwalitatieve feed: Fox, CBS, PBS en Semafor (besluit Alex) staan er niet in. The Washington
//      Post kwam er later bij, met een eigen wachttijd en beeld via Bluesky (tests/wapo.test.mjs);
//   3. de intro uit de feed: geen WordPress-regel "The post … appeared first on …", geen bijschrift bij een foto of grafiek.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SOURCES, MAIN_IDS, MUSIC_IDS } from '../netlify/lib/sources.mjs'
import { opinieBron } from '../shared/opinie.mjs'
import { publisherCountry, internationalNews } from '../shared/edition-policy.mjs'
import { introOf } from '../netlify/lib/rss.mjs'
import { followGroups } from '../src/lib/follow-welcome.js'
import { STARTER } from '../src/lib/topics.js'

const byId = new Map(SOURCES.map((s) => [s.id, s]))
const NIEUW = ['axios', 'propublica']

test('Axios en ProPublica: Engelstalig, Internationaal, Amerikaans, gratis en voor niemand ongevraagd aan', () => {
  for (const id of NIEUW) {
    const s = byId.get(id)
    assert.ok(s, id)
    assert.equal(s.cat, 'int', id)
    assert.equal(s.lang, 'en', id)
    assert.equal(publisherCountry(id), 'US', id)
    assert.ok(!opinieBron(id), id + ' is nieuws, geen opinie')
    for (const k of ['pick', 'base', 'for', 'forTopic', 'music', 'paid', 'login']) assert.equal(s[k], undefined, `${id}.${k}`)
    assert.ok(!MAIN_IDS.has(id) && !MUSIC_IDS.has(id), id)
    assert.ok(!STARTER.some((g) => g.ids.includes(id)), id)
    assert.equal(s.urls.length, 1, id)
    const url = new URL(s.urls[0])
    assert.equal(url.protocol, 'https:', id)
    assert.ok(/(^|\.)(axios\.com|propublica\.org)$/.test(url.hostname), `${id}: de eigen feed van de uitgever (${url.hostname})`)
    assert.match(s.color, /^#[0-9A-F]{6}$/i, id)
    assert.ok(s.bsky || s.x, id)
    readFileSync(new URL(`../landing/bronnen/${id}.webp`, import.meta.url))
  }
  const int = followGroups(SOURCES).find((g) => g.cat === 'int')
  for (const id of NIEUW) assert.ok(int.sources.some((s) => s.id === id), id)
})

test('alleen een kwalitatieve feed: geen Fox, CBS, PBS of Semafor', () => {
  const weg = /foxnews\.com|cbsnews\.com|pbs\.org|semafor\.com/
  assert.ok(!SOURCES.some((s) => s.urls.some((u) => weg.test(u))))
  for (const id of ['fox', 'cbs', 'pbs', 'semafor']) assert.equal(byId.get(id), undefined, id)
})

test('een stuk van Axios of ProPublica zonder herkende plaats telt voor het plafond als buitenland', () => {
  for (const source of NIEUW) {
    const items = [{ id: source + '-1', source, title: 'Senate Democrats pick a new leader', summary: 'The vote was close.', topics: [] }]
    assert.equal(internationalNews(items), true, source)
  }
})

test('intro: de WordPress-regel "The post … appeared first on …" is geen intro; dan telt de artikeltekst zonder foto', () => {
  const title = 'Members of Georgia’s Election Board Have Been Coordinating With an Activist Network'
  const it = {
    content: `<p>The post <a href="https://www.propublica.org/article/x">${title}</a> appeared first on <a href="https://www.propublica.org">ProPublica</a>.</p>`,
    contentSnippet: `The post ${title} appeared first on ProPublica.`,
    contentEncoded: '<figure><img src="https://www.propublica.org/a.jpg"><figcaption><small>A board meeting in Atlanta. (Photo: Someone for ProPublica)</small></figcaption></figure><p>In the run-up to the midterms, members of the board were coordinating with an activist group.</p>',
  }
  assert.equal(introOf(it, title), 'In the run-up to the midterms, members of the board were coordinating with an activist group.')
  // Achter een echte samenvatting geplakt: alleen de regel valt weg.
  const achter = { contentSnippet: `A real summary of what happened today. The post ${title} appeared first on Example News.` }
  assert.equal(introOf(achter, title), 'A real summary of what happened today.')
  // Een gewone intro blijft precies zoals hij was.
  assert.equal(introOf({ contentSnippet: 'The postal service raised prices on Friday.' }, 'Stamps'), 'The postal service raised prices on Friday.')
})

test('intro: een bijschrift bij een grafiek bovenaan ("Data: …; Chart: …") hoort niet bij de intro', () => {
  const it = { contentSnippet: 'Data: FactSet; Chart: Courtenay Brown/Axios\nInflation is no longer confined to a handful of trouble spots.\nWhy it matters: …' }
  assert.match(introOf(it, 'Fed faces tougher inflation fight'), /^Inflation is no longer confined/)
  const twee = { contentSnippet: 'Note: Figures compare average daily readings.\nData: Gallup; Chart: Someone/Axios\nVoters feel better about the economy.' }
  assert.match(introOf(twee, 'Sentiment'), /^Voters feel better/)
  // "Data:" midden in een zin, of zonder regeleinde, blijft staan.
  assert.match(introOf({ contentSnippet: 'Data: the new oil is cheap, says a report.' }, 'Data'), /^Data: the new oil/)
})

test('de landenregel ook voor lichte verhalen: uit één buitenlands land eist groot licht nieuws een tweede land (dubbelcheck A8)', async () => {
  const { majorGeneralNews, majorNews } = await import('../shared/edition-policy.mjs')
  const it = (source) => ({ id: source, source, title: 'Taylor Swift brengt verrassingsalbum uit', topics: ['muziek'] })
  const VS = ['nyt', 'atlantic', 'newyorker', 'politico', 'npr', 'axios', 'propublica', 'foreignpolicy']
  // Zes, zeven of acht Amerikaanse redacties: geen groot licht nieuws, en ook geen groot nieuws.
  for (const n of [6, 7, 8]) {
    assert.equal(majorGeneralNews({}, VS.slice(0, n).map(it)), false, `${n} Amerikaans`)
    assert.equal(majorNews({}, VS.slice(0, n).map(it)), false, `${n} Amerikaans (majorNews)`)
  }
  // Met een tweede land wel, zoals de regel van vijf uit twee landen.
  assert.equal(majorGeneralNews({}, [...VS.slice(0, 4), 'guardian'].map(it)), true)
  assert.equal(majorGeneralNews({}, [...VS.slice(0, 6), 'bbc'].map(it)), true)
  // Nederland en Vlaanderen: zes uit één land blijft genoeg, vijf niet (de Dutch Podcast Awards).
  assert.equal(majorGeneralNews({}, ['nos', 'nu', 'rtl', 'telegraaf', 'parool', 'ad'].map(it)), true)
  assert.equal(majorGeneralNews({}, ['nos', 'rtl', 'telegraaf', 'parool', 'ad'].map(it)), false)
  assert.equal(majorGeneralNews({}, ['vrt', 'standaard', 'demorgen', 'hln', 'nieuwsblad', 'gva'].map(it)), true)
})

test('de familiebonus telt begrensd met de landenregel, net als de drempel (dubbelcheck A9)', async () => {
  const { familyBonus } = await import('../netlify/lib/stories.mjs')
  const own = new Set(['nos', 'nu'])
  // Acht Amerikaanse uitgevers erbij tellen als zes.
  assert.equal(familyBonus(own, new Set([...own, 'nyt', 'atlantic', 'newyorker', 'politico', 'npr', 'axios', 'propublica', 'foreignpolicy'])), 6)
  // Nederlandse en gemengde families tellen zoals voorheen.
  assert.equal(familyBonus(own, new Set([...own, 'rtl', 'nrc', 'volkskrant'])), 3)
  assert.equal(familyBonus(own, new Set([...own, 'nyt', 'guardian', 'rtl'])), 3)
})
