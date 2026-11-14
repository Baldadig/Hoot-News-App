// Internationale bronnen erbij (14 november 2026), naar aanleiding van de vraag van Alex: "Mis ik de Wall Street Journal?
// CNN, Washington Post etc?" Zie Hoot-design/bronnen-internationaal-2026-11-14/ONDERZOEK.md en BOUW-VERSLAG.md.
// De toetsen houden de algemene regels vast, per eigenschap van de bron:
//   1. elke nieuwe bron is Engelstalig, staat onder Internationaal en staat voor niemand ongevraagd aan;
//   2. elke uitgever heeft een land, en een uitgever met twee bronnen (France 24 en RFI) telt als één;
//   3. een opinieblad is opinie en telt niet mee in de drempels voor groot nieuws;
//   4. betaalde titels zeggen het, een inlogpagina alleen waar die bestaat;
//   5. de taalregel: wie geen Engelse bron koos, krijgt van deze bronnen geen kop in zijn Editie;
//   6. web en app tonen ze in dezelfde rubriek, de rekenkern op de iPhone kent ze, en de landing heeft hun logo;
//   7. geen land buiten Nederland en Vlaanderen krijgt zoveel nieuwsuitgevers dat een binnenlands verhaal daar in zijn eentje
//      de drempels voor groot nieuws haalt (keuring 14 november; daarom deze ronde geen Amerikaanse nieuwsbronnen).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { SOURCES, MAIN_IDS, OPINIE_IDS, MUSIC_IDS } from '../netlify/lib/sources.mjs'
import { opinieBron, isOpinie } from '../shared/opinie.mjs'
import { coverageOf, publisherOf, publisherCountry, majorNews } from '../shared/edition-policy.mjs'
import { FRONT_MIN, FRONT_BIG } from '../shared/editor.mjs'
import { composePersonal, languageRule } from '../src/lib/personal.js'
import { followGroups } from '../src/lib/follow-welcome.js'
import { SOURCE_CATS, STARTER } from '../src/lib/topics.js'

const byId = new Map(SOURCES.map((s) => [s.id, s]))
const NIEUWS = ['france24', 'rfi', 'euronews', 'abc-au', 'kyivindependent', 'haaretz', 'timesofisrael']
const OPINIE = ['vox', 'nationalreview', 'thefp', 'reason']
const NIEUW = [...NIEUWS, ...OPINIE]
const LAND = { vox: 'US', nationalreview: 'US', thefp: 'US', reason: 'US', france24: 'FR', rfi: 'FR', euronews: 'FR', 'abc-au': 'AU', kyivindependent: 'UA', haaretz: 'IL', timesofisrael: 'IL' }

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

test('opinie: Vox, National Review, The Free Press en Reason zijn helemaal opinie en tellen niet in de drempels', () => {
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

// De server telt per verhaal alle uitgevers uit de hele catalogus (sourceCount, publisherCount), voor elke lezer. Hoe meer
// nieuwsuitgevers één land in de catalogus heeft, hoe makkelijker een binnenlands verhaal uit dat land de drempels haalt
// (FRONT_MIN voor de opening, FRONT_BIG voor groot nieuws) en door het plafond voor buitenland heen komt. Zolang er geen regel
// is die de telling per land begrenst, heeft geen land buiten Nederland en Vlaanderen meer algemene nieuwsuitgevers
// (rubriek Internationaal, geen opinie) dan FRONT_MIN; zo blijft er afstand tot FRONT_BIG.
test('drempels: geen land buiten Nederland en Vlaanderen heeft meer nieuwsuitgevers dan FRONT_MIN', () => {
  assert.ok(FRONT_MIN < FRONT_BIG)
  const perLand = new Map()
  for (const s of SOURCES) {
    const land = publisherCountry(s.id)
    if (s.cat !== 'int' || !land || land === 'NL' || land === 'BE' || opinieBron(s.id)) continue
    if (!perLand.has(land)) perLand.set(land, new Set())
    perLand.get(land).add(publisherOf(s.id))
  }
  for (const [land, uitgevers] of perLand) assert.ok(uitgevers.size <= FRONT_MIN, `${land}: ${[...uitgevers].join(', ')}`)
  // Elke nieuwe nieuwsbron hoort bij een land en telt dus mee in deze toets.
  for (const id of NIEUWS) assert.ok(perLand.get(publisherCountry(id))?.has(publisherOf(id)), id)
})
