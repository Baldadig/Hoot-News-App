// Internationale bronnen erbij (14 november 2026), naar aanleiding van de vraag van Alex: "Mis ik de Wall Street Journal?
// CNN, Washington Post etc?" Zie Hoot-design/bronnen-internationaal-2026-11-14/ONDERZOEK.md en BOUW-VERSLAG.md.
// De toetsen houden de algemene regels vast, per eigenschap van de bron:
//   1. elke nieuwe bron is Engelstalig, staat onder Internationaal en staat voor niemand ongevraagd aan;
//   2. elke uitgever heeft een land, en een uitgever met twee bronnen (France 24 en RFI) telt als één;
//   3. een opinieblad is opinie en telt niet mee in de drempels voor groot nieuws;
//   4. betaalde titels zeggen het, een inlogpagina alleen waar die bestaat;
//   5. de taalregel: wie geen Engelse bron koos, krijgt van deze bronnen geen kop in zijn Editie;
//   6. web en app tonen ze in dezelfde rubriek, de rekenkern op de iPhone kent ze, en de landing heeft hun logo;
//   7. de landenregel: per land buiten Nederland en Vlaanderen tellen hooguit FRONT_MIN uitgevers mee, zodat een binnenlands
//      verhaal van één buitenlands land in zijn eentje de drempels voor groot nieuws niet haalt (keuring 14 november,
//      bronnen-amerika).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { SOURCES, MAIN_IDS, OPINIE_IDS, MUSIC_IDS } from '../netlify/lib/sources.mjs'
import { opinieBron, isOpinie } from '../shared/opinie.mjs'
import { coverageOf, publisherOf, publisherCountry, majorNews, majorGeneralNews, newsRejection, countedPublishers, COUNTRY_MAX } from '../shared/edition-policy.mjs'
import { FRONT_MIN, FRONT_BIG } from '../shared/editor.mjs'
import { composePersonal, languageRule } from '../src/lib/personal.js'
import { followGroups } from '../src/lib/follow-welcome.js'
import { SOURCE_CATS, STARTER } from '../src/lib/topics.js'

const byId = new Map(SOURCES.map((s) => [s.id, s]))
const NIEUWS = ['france24', 'rfi', 'euronews', 'abc-au', 'kyivindependent', 'haaretz', 'timesofisrael']
const OPINIE = ['vox', 'nationalreview', 'thefp']
const NIEUW = [...NIEUWS, ...OPINIE]
const LAND = { vox: 'US', nationalreview: 'US', thefp: 'US', france24: 'FR', rfi: 'FR', euronews: 'FR', 'abc-au': 'AU', kyivindependent: 'UA', haaretz: 'IL', timesofisrael: 'IL' }

test('nieuwe bronnen: Engelstalig, onder Internationaal, voor niemand ongevraagd aan', () => {
  for (const id of NIEUW) {
    const s = byId.get(id)
    assert.ok(s, id)
    assert.equal(s.cat, 'int', id)
    assert.equal(s.lang, 'en', id)
    for (const k of ['pick', 'base', 'for', 'forTopic', 'music']) assert.equal(s[k], undefined, `${id}.${k}`)
    assert.ok(!MAIN_IDS.has(id) && !MUSIC_IDS.has(id), id)
    assert.ok(!STARTER.some((g) => g.ids.includes(id)), id)
  }
  // De standaardlezer (zonder onboarding) volgt nog steeds precies de basisbronnen.
  assert.deepEqual([...MAIN_IDS].sort(), ['atlantic', 'economist', 'nos', 'nrc', 'nyt', 'theverge', 'volkskrant', 'wired'])
  // Niet dood (zie ONDERZOEK.md): geen WSJ of CNN in de catalogus.
  assert.ok(!SOURCES.some((s) => s.urls.some((u) => /feeds\.a\.dj\.com|rss\.cnn\.com|wsj\.com/.test(u))))
})

test('elke uitgever heeft een land; France 24 en RFI zijn één uitgever', () => {
  for (const id of NIEUW) assert.equal(publisherCountry(id), LAND[id], id)
  assert.equal(publisherOf('france24'), 'france-medias-monde')
  assert.equal(publisherOf('rfi'), 'france-medias-monde')
  assert.deepEqual(coverageOf([{ source: 'france24' }, { source: 'rfi' }]), { publisherCount: 1, publisherCountries: ['FR'] })
  assert.equal(coverageOf([{ source: 'france24' }, { source: 'rfi' }, { source: 'lemonde' }]).publisherCount, 2)
  // Elk apart te kiezen: twee bronnen in de catalogus.
  assert.notEqual(byId.get('france24').urls[0], byId.get('rfi').urls[0])
})

test('opinie: Vox, National Review en The Free Press zijn helemaal opinie en tellen niet in de drempels', () => {
  for (const id of OPINIE) {
    assert.ok(OPINIE_IDS.has(id) && opinieBron(id), id)
    assert.ok(isOpinie({ kind: 'article', source: id, title: 'What the election means', url: 'https://www.example.com/2026/11/14/what-the-election-means/' }), id)
  }
  for (const id of NIEUWS) assert.ok(!opinieBron(id), id)
  const nieuws = [{ source: 'nyt' }, { source: 'bbc' }, { source: 'haaretz' }]
  const met = [...nieuws, ...OPINIE.map((source) => ({ source }))]
  assert.deepEqual(coverageOf(met), coverageOf(nieuws))
  assert.equal(majorNews({}, met), majorNews({}, nieuws))
})

test('betaald en inloggen: betaalde titels zeggen het, een inlogpagina alleen waar hij antwoordt', () => {
  const BETAALD = ['haaretz', 'vox', 'nationalreview', 'thefp']
  for (const id of NIEUW) assert.equal(byId.get(id).paid === true, BETAALD.includes(id), id)
  // Gemeten met de eigen UA op 14 november: nationalreview.com geeft een 403.
  assert.equal(byId.get('nationalreview').login, undefined)
  for (const id of ['haaretz', 'vox', 'thefp']) assert.equal(new URL(byId.get(id).login).protocol, 'https:', id)
  for (const id of NIEUW.filter((x) => !BETAALD.includes(x))) assert.equal(byId.get(id).login, undefined, id)
})

test('feeds, kleur, merkbeeld en logo: elke nieuwe bron heeft ze', () => {
  for (const id of NIEUW) {
    const s = byId.get(id)
    for (const u of s.urls) {
      const url = new URL(u)
      assert.equal(url.protocol, 'https:', id)
      // Alleen de eigen feed van de uitgever: geen doorgeefluik.
      assert.ok(!/news\.google\.|rsshub|feedburner|rss\.app|fetchrss|feedly/i.test(url.hostname), `${id}: ${url.hostname}`)
    }
    assert.match(s.color || '', /^#[0-9A-F]{6}$/i, id)
    assert.ok(s.logo || s.bsky || s.x, id + ' heeft een merkbeeld')
    if (s.logo) assert.equal(new URL(s.logo).protocol, 'https:', id)
    readFileSync(new URL(`../landing/bronnen/${id}.webp`, import.meta.url)) // het eigen logo (landing/bronlogos.mjs)
  }
})

// De taalregel (besluit Alex, 7 november 2026): wie geen Engelse bron koos, krijgt nooit een Engelse bron in zijn Editie.
// Op een bewaarde live feed (7 november) nemen de nieuwe bronnen de plaats in van de Engelse nieuwsbronnen die er al waren:
// zo hebben ze verhalen, brede verhalen en plekken in de algemene Editie, en moet de regel echt iets doen.
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}`, import.meta.url))).toString('utf8'))
const RUIL = { nyt: 'haaretz', guardian: 'france24', bbc: 'euronews', aljazeera: 'timesofisrael', dw: 'rfi', atlantic: 'kyivindependent', lemonde: 'abc-au' }
const ruil = (it) => (it && RUIL[it.source] ? { ...it, source: RUIL[it.source], sourceName: byId.get(RUIL[it.source]).name } : it)
function geruild() {
  const feed = load('live-feed-2026-11-07.json.gz')
  const ed = feed.edition
  const sources = feed.sources.filter((s) => !RUIL[s.id]).concat(NIEUWS.map((id) => ({ ...byId.get(id), urls: undefined })))
  return {
    ...feed,
    sources,
    items: feed.items.map(ruil),
    related: (feed.related || []).map(ruil),
    edition: { ...ed, items: (ed.items || []).map(ruil), wide: (ed.wide || []).map((w) => ({ ...w, item: ruil(w.item) })), near: (ed.near || []).map((w) => ({ ...w, item: ruil(w.item) })) },
  }
}
const known = (feed, ed) => new Map([...feed.items, ...(feed.edition.items || []), ...(feed.edition.wide || []).map((w) => w.item), ...(feed.edition.near || []).map((w) => w.item), ...(ed?.items || [])].filter(Boolean).map((i) => [i.id, i]))
const compose = (feed, followed, extra = {}) => composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(followed), interests: [], topics: [], now: Date.parse(feed.edition.builtAt), builtAt: feed.edition.builtAt, ...extra })
const NL = ['nos', 'nu', 'nrc', 'volkskrant']

test('taalregel: een Nederlandse lezer zonder Engelse bron krijgt van de nieuwe bronnen geen kop', () => {
  const nl = languageRule({ followed: new Set(NL), sources: SOURCES })
  for (const id of NIEUW) assert.equal(nl.readable({ id: id + '-1', kind: 'article', source: id, title: 'A headline', topics: [] }), false, id)
  const feed = geruild()
  const nieuweKoppen = feed.edition.entries.filter((e) => NIEUW.includes(known(feed).get(e.leadId || e.id)?.source))
  assert.ok(nieuweKoppen.length >= 1, 'de algemene Editie heeft koppen van de nieuwe bronnen (anders toetst dit niets)')
  for (const [naam, followed, extra] of [['NL-startset', NL, {}], ['alleen NU.nl', ['nu'], {}], ['NL-startset, Wereld', NL, { interests: ['wereld', 'binnenland'] }]]) {
    const ed = compose(feed, followed, extra)
    const byId2 = known(feed, ed)
    for (const e of ed.entries) {
      const it = byId2.get(e.leadId || e.id)
      assert.ok(it, `${naam}: kop ${e.leadId || e.id} bekend`)
      assert.ok(!NIEUW.includes(it.source), `${naam}, ${e.desk}: "${it.title}" (${it.source})`)
    }
  }
})

test('taalregel: wie een nieuwe Engelse bron volgt, kan er wel een kop van krijgen', () => {
  const feed = geruild()
  const ed = compose(feed, [...NL, 'france24'], { interests: ['wereld'] })
  const byId2 = known(feed, ed)
  const en = languageRule({ followed: new Set([...NL, 'france24']), sources: SOURCES })
  assert.equal(en.readable({ id: 'x', kind: 'article', source: 'haaretz', title: 'A headline', topics: [] }), true)
  assert.ok(ed.entries.length > 0 && ed.entries.every((e) => byId2.get(e.leadId || e.id)))
})

test('welkom en Instellingen: de nieuwe bronnen staan onder Internationaal, op web en app met dezelfde rubrieken', () => {
  const int = followGroups(SOURCES).find((g) => g.cat === 'int')
  assert.equal(int.label, 'Internationaal')
  for (const id of NIEUW) assert.ok(int.sources.some((s) => s.id === id), id)
  // De app heeft dezelfde rubrieken in dezelfde volgorde (FollowList.cats in WelcomeView.swift).
  const swift = readFileSync(new URL('../ios/Hoot/Views/WelcomeView.swift', import.meta.url), 'utf8')
  const cats = swift.match(/static let cats: \[\(id: String, label: String\)\] = \[([\s\S]*?)\]/)[1]
  assert.deepEqual([...cats.matchAll(/\("([a-z]+)", "([^"]+)"\)/g)].map((m) => [m[1], m[2]]), SOURCE_CATS)
})

test('de rekenkern op de iPhone kent de nieuwe bronnen (taal, rubriek, opinie, uitgever en land)', () => {
  const core = readFileSync(new URL('../ios/Hoot/Resources/edition-core.js', import.meta.url), 'utf8')
  for (const id of [...NIEUW, 'france-medias-monde']) assert.ok(core.includes(`'${id}'`) || core.includes(`"${id}"`), id)
})

// De server telt per verhaal alle uitgevers uit de hele catalogus (sourceCount, publisherCount), voor elke lezer. Zonder
// grens zou een binnenlands verhaal van één buitenlands land makkelijker groot nieuws worden naarmate dat land meer
// uitgevers in de catalogus heeft. De landenregel (bronnen-amerika, 14 november 2026; COUNTRY_MAX in
// shared/edition-policy.mjs): per land buiten Nederland en Vlaanderen tellen hooguit FRONT_MIN uitgevers mee. De toetsen
// hieronder houden de regel zelf vast, los van welke bronnen er nu in de catalogus staan.
const nieuwsVan = (land) => [...new Set(SOURCES.filter((s) => publisherCountry(s.id) === land && !opinieBron(s.id)).map((s) => publisherOf(s.id)))]
const stukken = (ids) => ids.map((source, k) => ({ id: `${source}-${k}`, source, title: 'A headline' }))

test('landenregel: per buitenlands land tellen hooguit FRONT_MIN uitgevers, ook met de hele catalogus', () => {
  assert.equal(COUNTRY_MAX, FRONT_MIN)
  assert.ok(COUNTRY_MAX < FRONT_BIG)
  const landen = new Set(SOURCES.map((s) => publisherCountry(s.id)).filter((l) => l && l !== 'NL' && l !== 'BE'))
  assert.ok(landen.has('US') && landen.has('GB'))
  for (const land of landen) {
    const alle = nieuwsVan(land)
    const cov = coverageOf(stukken(alle))
    assert.equal(cov.publisherCount, Math.min(alle.length, COUNTRY_MAX), land)
    assert.ok(cov.publisherCount < FRONT_BIG, land)
    assert.equal(majorNews({}, stukken(alle)), false, `${land}: een verhaal van één buitenlands land is in zijn eentje geen groot nieuws`)
    assert.equal(majorNews({ ...cov, sourceCount: alle.length }, stukken(alle)), false, `${land}: ook niet met de telling van de server`)
  }
})

test('landenregel: een puur Amerikaans verhaal met alle Amerikaanse uitgevers haalt FRONT_BIG en het plafond voor buitenland niet', () => {
  const vs = nieuwsVan('US')
  assert.ok(vs.length > FRONT_BIG, 'de catalogus heeft meer Amerikaanse uitgevers dan FRONT_BIG (anders toetst dit niets)')
  const items = stukken(vs)
  assert.equal(coverageOf(items).publisherCount, FRONT_MIN)
  assert.equal(majorNews({}, items), false)
  // Een licht verhaal (majorGeneralNews, zes algemene nieuwsuitgevers) telt ook met de landenregel: alle Amerikaanse
  // uitgevers wegen niet zwaarder dan de zes Amerikaanse nieuwsuitgevers die er vóór deze ronde al waren.
  const eerder = stukken(['nyt', 'atlantic', 'newyorker', 'foreignpolicy', 'politico', 'npr'])
  assert.equal(majorGeneralNews({}, items), majorGeneralNews({}, eerder))
  // Wie Wereld niet koos, krijgt zo'n verhaal niet langs het plafond voor buitenland (groot nieuws mag dat wel).
  const binnenland = { interests: new Set(['binnenland']), family: { binnenland: 1 }, topicP: {}, favorites: new Set() }
  assert.equal(newsRejection(binnenland, coverageOf(items), items, 'vs'), 'internationaal-niet-groot-genoeg')
})

test('landenregel: een wereldverhaal met Nederland, Amerika en Groot-Brittannië telt zoals voorheen', () => {
  const wereld = stukken(['nos', 'nu', 'nrc', 'nyt', 'politico', 'npr', 'bbc', 'guardian'])
  assert.deepEqual(coverageOf(wereld), { publisherCount: 8, publisherCountries: ['GB', 'NL', 'US'] })
  assert.equal(majorNews({}, wereld), true)
  const klein = stukken(['nos', 'nyt', 'politico', 'bbc', 'guardian'])
  assert.equal(coverageOf(klein).publisherCount, 5)
  assert.equal(majorNews({}, klein), true, 'vijf uit minstens twee landen, zoals voorheen')
  // Met alle Amerikaanse uitgevers erbij tellen er zes Amerikaanse mee, naast de andere landen.
  const groot = stukken(['nos', 'bbc', ...nieuwsVan('US')])
  assert.equal(coverageOf(groot).publisherCount, 2 + FRONT_MIN)
  assert.equal(majorNews({}, groot), true)
  const binnenland = { interests: new Set(['binnenland']), family: { binnenland: 1 }, topicP: {}, favorites: new Set() }
  assert.notEqual(newsRejection(binnenland, coverageOf(wereld), wereld, 'vs'), 'internationaal-niet-groot-genoeg')
})

test('landenregel: Nederlands en Vlaams nieuws telt onbegrensd, precies als voorheen', () => {
  for (const land of ['NL', 'BE']) {
    const alle = nieuwsVan(land)
    assert.ok(alle.length > COUNTRY_MAX, `${land} heeft meer dan ${COUNTRY_MAX} uitgevers (anders toetst dit niets)`)
    assert.equal(coverageOf(stukken(alle)).publisherCount, alle.length, land)
    assert.equal(majorNews({}, stukken(alle)), true, land)
  }
  // Zonder buitenlands land boven de grens is de telling gelijk aan het aantal uitgevers.
  const ids = ['nos', 'nos-economie', 'rtl', 'nu', 'vrt', 'nyt', 'bbc', 'guardian', 'aljazeera']
  assert.equal(coverageOf(stukken(ids)).publisherCount, new Set(ids.map(publisherOf)).size)
  assert.equal(countedPublishers(ids.map(publisherOf)), new Set(ids.map(publisherOf)).size)
  // Een uitgever zonder bekend land telt gewoon mee; dubbelen tellen één keer.
  assert.equal(countedPublishers(['onbekend-a', 'onbekend-b', 'nyt', 'nyt']), 3)
})

test('landenregel: web, app en server rekenen met dezelfde regel', () => {
  const core = readFileSync(new URL('../ios/Hoot/Resources/edition-core.js', import.meta.url), 'utf8')
  assert.ok(core.includes('COUNTRY_MAX = FRONT_MIN') && core.includes('function countedPublishers('), 'de rekenkern van de app heeft de landenregel')
  const server = readFileSync(new URL('../netlify/lib/stories.mjs', import.meta.url), 'utf8')
  assert.ok(server.includes('...coverageOf(items)'), 'de server zet publisherCount met coverageOf')
  assert.ok(server.includes('countedPublishers(all) - countedPublishers(own)'), 'de familie van een verhaal telt met de landenregel')
})
