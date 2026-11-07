// De taalregel (besluit Alex, 7 november 2026): "Als iemand geen Engelse bronnen heeft geselecteerd, zou je ook nooit
// een Engelse bron in de Editie moeten ontvangen." Uitgewerkt: het gaat om de kop van een plek, per rubriek (wie IGN volgt,
// mag een Engelse kop bij Games krijgen, maar geen Engels nieuws); Vlaams telt als Nederlands, een Nederlandse kop gaat
// vóór. De bundel achter "+N bronnen" blijft heel. Zie de taalregel in src/lib/personal.js.
// Feeds: drie bewaarde live feeds (4 november nacht, de verkiezingsnacht, en 7 november ochtend: de paus in Uruguay kreeg
// bij "Waar iedereen over schrijft" de Engelse Al Jazeera-kop terwijl de VRT het in het Nederlands bracht).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { composePersonal, withoutDebug, languageRule } from '../src/lib/personal.js'
import { SOURCES } from '../netlify/lib/sources.mjs'
import { EDITION_FLOOR, editionStoryCount } from '../shared/edition-policy.mjs'

const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}`, import.meta.url))).toString('utf8'))
const FILES = ['live-feed-2026-11-04.json.gz', 'live-feed-2026-11-04-midterms.json.gz', 'live-feed-2026-11-07.json.gz']
const FEEDS = Object.fromEntries(FILES.map((f) => [f, load(f)]))
const NL = ['nos', 'nu', 'nrc', 'volkskrant']

const compose = (feed, followed, extra = {}) => composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(followed), interests: [], topics: [], now: Date.parse(feed.edition.builtAt), builtAt: feed.edition.builtAt, ...extra })
// Wat het toestel kent (zonder `related`: die stukken heeft een toestel niet).
const known = (feed, ed) => new Map([...feed.items, ...(feed.edition.items || []), ...(feed.edition.wide || []).map((w) => w.item), ...(feed.edition.near || []).map((w) => w.item), ...(ed?.items || [])].filter(Boolean).map((i) => [i.id, i]))
// Een kop is Nederlands als bron en stuk allebei Nederlands zijn (ook Vlaams).
const dutchHead = (feed, it) => {
  const lang = new Map(feed.sources.map((s) => [s.id, s.lang]))
  return lang.get(it.source) === 'nl' && (it.lang || 'nl') === 'nl'
}

test('taalregel per rubriek: wie IGN volgt, leest Engels bij Games, niet bij het nieuws; Vlaams is Nederlands', () => {
  const art = (source, extra = {}) => ({ id: `${source}-1`, kind: 'article', source, title: 'Een kop', topics: [], ...extra })
  const nl = languageRule({ followed: new Set(NL), sources: SOURCES })
  assert.equal(nl.readable(art('nyt')), false)
  assert.equal(nl.readable(art('polygon')), false)
  assert.equal(nl.readable(art('vrt')), true, 'Vlaams telt als Nederlands')
  assert.equal(nl.readable(art('rtl')), true, 'een Nederlandse bron die je niet volgt')
  assert.equal(nl.readable(art('parool', { lang: 'en' })), false, 'een Engelstalig Parool-stuk is Engels')
  assert.equal(nl.readable(art('politico-eu', { lang: 'nl' })), false, 'een anderstalige bron die de server Nederlands noemt')
  const ign = languageRule({ followed: new Set([...NL, 'ign']), sources: SOURCES })
  assert.equal(ign.readable(art('polygon')), true, 'Games: Engels mag')
  assert.equal(ign.readable(art('guardian', { topics: ['games'] })), true, 'een gamesstuk is Games, ook uit een nieuwsbron')
  assert.equal(ign.readable(art('nyt')), false, 'nieuws: geen Engels')
  assert.equal(ign.readable(art('theverge')), false, 'Tech is een andere rubriek')
  assert.equal(ign.readableIn(art('polygon'), 'nieuws'), false, 'in een nieuwsplek ook geen Engelse gamesbron')
  const guardian = languageRule({ followed: new Set([...NL, 'guardian']), sources: SOURCES })
  assert.equal(guardian.readable(art('nyt')), true)
  assert.equal(guardian.readable(art('bbc-sport')), false, 'Sport is een andere rubriek')
  assert.equal(guardian.readable(art('guardian', { topics: ['voetbal'] })), true, 'een bron die je volgt is altijd leesbaar')
  const bsky = languageRule({ followed: new Set([...NL, 'bsky:someone.bsky.social']), sources: [...SOURCES, { id: 'bsky:someone.bsky.social', cat: 'int', lang: 'en' }] })
  assert.equal(bsky.readable(art('nyt')), false, 'Bluesky telt niet mee')
})

const PROFILES = [
  ['alleen nu.nl', ['nu'], {}],
  ['NL-startset', NL, {}],
  ['NL-startset, Binnenland en Wereld', NL, { interests: ['binnenland', 'wereld'] }],
  ['NL + Tweakers, FD, NOS Economie', [...NL, 'tweakers', 'fd', 'nos-economie'], { interests: ['tech', 'economie'] }],
  ['NL + NOS Sport en VI', [...NL, 'nos-sport', 'vi'], { interests: ['binnenland', 'sport'] }],
  ['NL + IGN (Games)', [...NL, 'ign'], { interests: ['tech'], topics: ['games'] }],
]

for (const f of FILES) {
  for (const [name, followed, extra] of PROFILES) {
    test(`taalregel ${f}, ${name}: geen enkele plek met een kop van een anderstalige bron die je niet volgt`, () => {
      const feed = FEEDS[f]
      const ed = compose(feed, followed, extra)
      const byId = known(feed, ed)
      const mine = new Set(followed)
      for (const e of ed.entries) {
        const it = byId.get(e.leadId || e.id)
        assert.ok(it, `kop ${e.leadId || e.id} bekend`)
        if (mine.has(it.source)) continue
        assert.ok(dutchHead(feed, it), `${e.desk}: "${it.title}" (${it.source}) is geen Nederlandse kop`)
        assert.equal(e.title, it.title, 'de getoonde titel hoort bij de kop')
      }
      // De vloer wordt gehaald, of de Editie is eerlijk korter (met uitleg in _supply).
      assert.ok(editionStoryCount(ed.entries) >= EDITION_FLOOR || ed._supply, `${editionStoryCount(ed.entries)} plekken zonder _supply`)
    })
  }
}

test('taalregel: Waar iedereen over schrijft neemt het Nederlandstalige stuk uit hetzelfde verhaal (de paus, 7 november)', () => {
  const feed = FEEDS['live-feed-2026-11-07.json.gz']
  const byId = known(feed)
  const w = feed.edition.wide.find((x) => /Pope Leo/.test(x.item.title))
  assert.equal(w.item.source, 'aljazeera', 'de server koos de Engelse kop')
  const ed = compose(feed, NL)
  const e = ed.entries.find((x) => x.desk === 'breed')
  assert.equal(e.id, w.storyId, 'hetzelfde verhaal')
  assert.equal(byId.get(e.leadId).source, 'vrt')
  assert.match(e.title, /^Paus Leo XIV/)
  // Wie een Engelse nieuwsbron volgt, krijgt de kop van de server.
  const en = compose(feed, [...NL, 'guardian']).entries.find((x) => x.desk === 'breed')
  assert.equal(en.leadId, w.item.id)
})

test('taalregel: een breed verhaal met alleen Engelse stukken valt weg (en de plek gaat naar ander nieuws)', () => {
  const feed = FEEDS['live-feed-2026-11-07.json.gz']
  const byId = known(feed)
  const onlyEnglish = feed.edition.wide.filter((w) => feed.stories.find((s) => s.id === w.storyId)?.itemIds.every((id) => !byId.get(id) || !dutchHead(feed, byId.get(id))))
  // Een verzonnen breed verhaal van één Engels stuk vooraan: nooit gekozen door wie geen Engelse nieuwsbron volgt.
  const it = feed.items.find((i) => i.source === 'guardian' && i.kind === 'article') || [...byId.values()].find((i) => i.source === 'guardian')
  const fake = { storyId: 'verzonnen-breed', sourceCount: 40, topics: [], item: it }
  const global = { ...feed.edition, wide: [fake, ...onlyEnglish, ...feed.edition.wide] }
  const ed = compose({ ...feed, edition: global }, NL)
  assert.ok(!ed.entries.some((e) => e.id === 'verzonnen-breed' || e.leadId === it.id), 'het Engelse brede verhaal staat er niet in')
  for (const w of onlyEnglish) assert.ok(!ed.entries.some((e) => e.id === w.storyId), `${w.item.title} staat er niet in`)
})

test('taalregel: een aanvulling met een Engelse kop krijgt een Nederlandse kop uit hetzelfde verhaal', () => {
  const feed = FEEDS['live-feed-2026-11-07.json.gz']
  const byId = known(feed)
  // Wie alleen NU.nl volgt, wordt aangevuld uit de algemene Editie; daar hebben drie plekken een Engelse kop.
  const english = feed.edition.entries.filter((g) => g.kind === 'story' && !dutchHead(feed, byId.get(g.leadId)))
  assert.ok(english.length >= 1)
  const ed = compose(feed, ['nu'])
  const replaced = ed.entries.filter((e) => e.desk === 'extern' && english.some((g) => g.id === e.id))
  assert.ok(replaced.length >= 1, 'minstens één aanvulling uit een plek met een Engelse kop')
  for (const e of replaced) {
    const g = english.find((x) => x.id === e.id)
    assert.notEqual(e.leadId, g.leadId)
    assert.ok(dutchHead(feed, byId.get(e.leadId)))
    assert.ok(e.itemIds.includes(g.leadId), 'het Engelse stuk blijft in de bundel achter "+N bronnen"')
  }
  // Een Nederlandse kop gaat vóór een Vlaamse: is er een Nederlands stuk in het verhaal, dan is de kop niet Vlaams.
  const VL = new Set(feed.sources.filter((s) => s.cat === 'vl').map((s) => s.id))
  for (const e of replaced) {
    const members = feed.stories.find((s) => s.id === e.id).itemIds.map((id) => byId.get(id)).filter(Boolean)
    const nlFresh = members.filter((i) => dutchHead(feed, i) && !VL.has(i.source))
    if (VL.has(byId.get(e.leadId).source)) assert.equal(nlFresh.length, 0, `${e.title}: Vlaamse kop terwijl er een Nederlandse is`)
  }
})

test('taalregel: een Engels bubbelsignaal wordt overgeslagen', () => {
  const feed = FEEDS['live-feed-2026-11-07.json.gz']
  const it = [...known(feed).values()].find((i) => i.source === 'guardian' && i.kind === 'article')
  const signal = { id: it.id, terms: ['verzonnen'], storyId: it.storyId }
  const entries = feed.edition.entries.map((e) => (e.desk === 'bubbel' ? { kind: 'item', id: it.id, desk: 'bubbel', terms: signal.terms } : e))
  const global = { ...feed.edition, entries, bubble: [signal, ...(feed.edition.bubble || [])], items: [...feed.edition.items, it] }
  const ed = compose({ ...feed, edition: global }, NL)
  assert.ok(!ed.entries.some((e) => (e.leadId || e.id) === it.id), 'het Engelse bubbelstuk staat er niet in')
})

test('taalregel: Naast je bubbel slaat een Engelse kop zonder Nederlands stuk over', () => {
  const feed = FEEDS['live-feed-2026-11-04.json.gz']
  const byId = known(feed)
  // Geen trendsignaal (de bubbel valt terug op Naast je bubbel), met Engelse kandidaten vooraan.
  const near = [...(feed.edition.near || [])].sort((a, b) => Number(dutchHead(feed, a.item)) - Number(dutchHead(feed, b.item)))
  const global = { ...feed.edition, bubble: [], near }
  for (const followed of [NL, ['nu']]) {
    const ed = compose({ ...feed, edition: global }, followed, { interests: ['binnenland'] })
    const b = ed.entries.find((e) => e.desk === 'bubbel')
    if (b) assert.ok(followed.includes(byId.get(b.leadId || b.id).source) || dutchHead(feed, byId.get(b.leadId || b.id)), `${b.title}`)
  }
})

// Wie in elke rubriek een Engelse bron volgt, krijgt byte voor byte dezelfde Editie als vóór de taalregel. De afdrukken
// zijn vastgelegd met de code van 601c172 (ronde 8, zonder taalregel). Verandert de Redacteur later bewust, dan
// horen deze afdrukken mee te veranderen, net als de goldens.
const EN_ALL = ['guardian', 'bloomberg', 'theverge', 'nature', 'bbc-sport', 'variety', 'ign', 'nos', 'nrc']
const BEFORE = {
  'live-feed-2026-11-04.json.gz': '9eb3050a7442384a',
  'live-feed-2026-11-04-midterms.json.gz': 'b314df33e096d7f7',
  'live-feed-2026-11-07.json.gz': '1bddbb3c108810e8',
}
for (const f of FILES) {
  test(`taalregel ${f}: met een Engelse bron in elke rubriek precies dezelfde Editie als zonder de regel`, () => {
    const ed = compose(FEEDS[f], EN_ALL, { interests: ['binnenland', 'wereld', 'tech'] })
    assert.equal(createHash('sha256').update(JSON.stringify(withoutDebug(ed))).digest('hex').slice(0, 16), BEFORE[f])
  })
}
