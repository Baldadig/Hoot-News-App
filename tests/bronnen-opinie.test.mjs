// Bronnen erbij (besluit Alex 13 november 2026): opiniebladen in de Stroom en de Selectie maar niet in de Editie, de
// regionale omroepen als één uitgever, een Selectie-onderwerp Geschiedenis en meer Nederlandstalige cultuur en media.
// Zie Hoot-design/bronnen-onderzoek-2026-11-13/BOUW-VERSLAG.md. De toetsen houden de algemene regels vast:
//   1. een opinieblad (`opinie` in de catalogus) is helemaal opinie: Stroom-tab Opinie, label Opinie, nooit een plek;
//   2. het telt niet mee in de drempels voor groot nieuws (coverageOf, het aantal bronnen van een verhaal) en bundelt
//      niet mee; het komt pas achteraf als lid bij een verhaal (Vergelijken);
//   3. een uitgever met meer bronnen (`publisher`) telt als één, en elke bron blijft apart te kiezen;
//   4. nieuwe bronnen staan voor niemand ongevraagd aan;
//   5. Geschiedenis werkt in de Selectie, op de server, het web en de iPhone;
//   6. elke feed, elk logo en elke inlogpagina is een geldige https-URL.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SOURCES, MAIN_IDS, OPINIE_IDS, MUSIC_IDS } from '../netlify/lib/sources.mjs'
import { isOpinie, opinieBron } from '../shared/opinie.mjs'
import { isOpinion } from '../shared/article-signals.mjs'
import { tabsVan } from '../shared/stroom-tabs.mjs'
import { coverageOf, publisherOf, publisherCountry, majorNews } from '../shared/edition-policy.mjs'
import { buildStories, selectForReader } from '../netlify/lib/stories.mjs'
import { profileOf } from '../shared/editor.mjs'
import { NL_HOME, VL_HOME } from '../netlify/lib/desks.mjs'
import { VAK_SOURCES, VAK_FIELDS, fieldOf } from '../netlify/lib/vak.mjs'
import { STARTER } from '../src/lib/topics.js'

const byId = new Map(SOURCES.map((s) => [s.id, s]))
const OPINIE = ['joop', 'groene', 'vn', 'sargasso', 'hpdetijd', 'wyniasweek', 'tpo', 'geenstijl', 'socialevraagstukken']
const OMROEPEN = ['nhnieuws', 'omroepwest', 'rijnmond', 'rtvutrecht', 'omroepgelderland', 'rtvoost', 'rtvnoord', 'rtvdrenthe', 'omropfryslan', 'omroepbrabant', 'l1', 'omroepzeeland']
const NIEUW = [...OPINIE, ...OMROEPEN, 'zembla', 'argos', 'rd', 'caribischnetwerk', 'duic', 'versbeton', 'apache', 'bruzz', 'humo', 'villamedia', 'mediacourant', 'cuttingedge', 'nieuwemuze']

test('opinieblad: elk stuk is opinie, ook met een gewone link en kop; de Stroom zet het onder Opinie', () => {
  assert.deepEqual([...OPINIE_IDS].sort(), [...OPINIE].sort())
  for (const id of OPINIE) {
    const it = { kind: 'article', source: id, title: 'Het kabinet moet nu kiezen', url: `https://www.example.nl/2026/11/13/het-kabinet-moet-kiezen/` }
    assert.ok(opinieBron(id) && isOpinie(it) && isOpinion(it), id)
    assert.deepEqual(tabsVan(it), ['opinie'], id)
  }
  // Een gewone nieuwsbron met dezelfde link en kop blijft nieuws; een Bluesky-post is nooit opinie.
  assert.ok(!isOpinie({ kind: 'article', source: 'nos', title: 'Het kabinet moet nu kiezen', url: 'https://nos.nl/artikel/1' }))
  assert.ok(!isOpinie({ kind: 'post', source: 'joop', title: 'x' }))
  // Een opinieblad is geen muziekbron en geen basisbron.
  for (const id of OPINIE) assert.ok(!MUSIC_IDS.has(id) && !MAIN_IDS.has(id), id)
})

test('drempels: een opinieblad telt niet als uitgever, tien opiniebladen maken nog geen groot nieuws', () => {
  const nieuws = [{ source: 'nos' }, { source: 'nrc' }]
  const opinie = OPINIE.map((source) => ({ source }))
  assert.deepEqual(coverageOf([...nieuws, ...opinie]), coverageOf(nieuws))
  assert.equal(coverageOf(opinie).publisherCount, 0)
  assert.equal(majorNews({}, [...nieuws, ...opinie]), majorNews({}, nieuws))
})

const FIX = JSON.parse(readFileSync(new URL('./fixtures/column-in-editie-2026-11-13.json', import.meta.url), 'utf8'))
const OPTS = { mainIds: new Set(['nrc']), keys: true, extended: true }
// Dezelfde koppen als het nieuws, uit drie opiniebladen: zo sterk mogelijk verbonden met het verhaal.
const echo = (items, ids) => items.slice(0, ids.length).map((i, k) => ({ ...i, id: 'op' + k, source: ids[k], sourceName: byId.get(ids[k]).name, url: `https://www.example.nl/opinie-${k}/`, publishedAt: '2026-11-13T19:00:00.000Z' }))

test('verhalen: een opinieblad bundelt niet mee, komt achteraf als lid erbij, en verandert niets aan het nieuws', () => {
  const zonder = buildStories(FIX.items, {}, OPTS)
  const op = echo(FIX.items.filter((i) => i.source !== 'nrc'), ['joop', 'geenstijl', 'tpo'])
  const met = buildStories([...FIX.items, ...op], {}, OPTS)
  assert.equal(met.length, zonder.length)
  for (const [a, b] of zonder.map((st, k) => [st, met[k]])) {
    // Alles van het verhaal komt uit het nieuws: id, kop, bronnen, uitgevers, tijden, rubriek, kenmerken.
    assert.deepEqual({ ...b, itemIds: b.itemIds.slice(0, a.itemIds.length) }, a)
    // De opiniestukken staan achteraan, voor Vergelijken (met het label Opinie).
    assert.deepEqual(b.itemIds.slice(a.itemIds.length).sort(), ['op0', 'op1', 'op2'])
  }
  // Eén nieuwsstuk met drie opiniebladen erover is geen verhaal: dat blijft een los stuk.
  const los = FIX.items.find((i) => i.source === 'telegraaf')
  assert.equal(buildStories([los, ...echo([los, los, los], ['joop', 'geenstijl', 'tpo'])], {}, OPTS).length, 0)
})

test('Editie: een stuk van een opinieblad draagt geen plek, ook niet als je het blad volgt', () => {
  const NOW = Date.parse('2026-11-13T19:50:00Z')
  const followed = new Set(['joop', 'telegraaf'])
  const prof = profileOf({ interests: ['sport'], followed })
  // Los stuk.
  const los = { id: 'j1', kind: 'article', source: 'joop', sourceName: 'Joop', title: 'Het kabinet laat de boeren in de steek', summary: 'Een gewone intro.', image: 'https://example.org/a.jpg', url: 'https://www.joop.nl/politiek/het-kabinet-laat-de-boeren-in-de-steek', publishedAt: '2026-11-13T17:00:00Z', topics: [] }
  const audit = []
  const out = selectForReader([], [los], { mainIds: followed, now: NOW, size: 10, prof, audit })
  assert.ok(!out.some((e) => (e.leadId || e.id) === 'j1'))
  assert.ok(audit.some((a) => a.id === 'j1' && a.reason === 'vorm-of-bron-niet-toegelaten'), JSON.stringify(audit))
  // In een verhaal: zijn je eigen stukken alleen die van het opinieblad, dan geen plek; met je nieuwsbron wel, met het
  // nieuws als kop.
  const op = echo(FIX.items.filter((i) => i.source !== 'nrc'), ['joop'])
  const [st] = buildStories([...FIX.items, ...op], {}, OPTS)
  // De pool van de lezer: alleen de stukken van zijn eigen bronnen (zoals op het toestel).
  const eigen = (ids) => [...FIX.items, ...op].filter((i) => ids.has(i.source))
  const alleenJoop = selectForReader([st], eigen(new Set(['joop'])), { mainIds: new Set(['joop']), now: NOW, size: 10, prof: profileOf({ interests: ['sport'], followed: new Set(['joop']) }) })
  assert.equal(alleenJoop.length, 0)
  const pool = eigen(followed)
  const ook = selectForReader([st], pool, { mainIds: followed, now: NOW, size: 10, prof })
  assert.equal(ook.length, 1)
  assert.notEqual(byId.get(pool.find((i) => i.id === ook[0].leadId).source)?.opinie, true)
})

test('regionale omroepen: samen één uitgever (zoals de NOS-secties), Nederlands, en elk apart te kiezen', () => {
  assert.equal(OMROEPEN.length, 12)
  for (const id of OMROEPEN) {
    const s = byId.get(id)
    assert.equal(s.cat, 'regio', id)
    assert.equal(publisherOf(id), 'regionale-omroep', id)
    assert.equal(publisherCountry(id), 'NL', id)
    assert.ok(NL_HOME.has(id), id)
  }
  // Tien omroepen over één verhaal: één uitgever. Met de NOS erbij: twee.
  const tien = OMROEPEN.slice(0, 10).map((source) => ({ source }))
  assert.deepEqual(coverageOf(tien), { publisherCount: 1, publisherCountries: ['NL'] })
  assert.equal(coverageOf([...tien, { source: 'nos' }]).publisherCount, 2)
  assert.equal(majorNews({}, tien), false)
  // Andere bronnen houden hun eigen uitgever.
  assert.equal(publisherOf('duic'), 'duic')
  assert.equal(publisherOf('nos-sport'), 'nos')
})

test('nieuwe bronnen staan voor niemand ongevraagd aan, en hebben hun land', () => {
  for (const id of NIEUW) {
    const s = byId.get(id)
    assert.ok(s, id)
    for (const k of ['pick', 'base', 'for', 'forTopic']) assert.equal(s[k], undefined, `${id}.${k}`)
    assert.ok(!MAIN_IDS.has(id), id)
    assert.ok(!STARTER.some((g) => g.ids.includes(id)), id)
  }
  // De standaardlezer (zonder onboarding) volgt precies de basisbronnen.
  assert.deepEqual([...MAIN_IDS].sort(), ['3voor12', 'atlantic', 'economist', 'nos', 'nrc', 'nyt', 'theverge', 'volkskrant', 'wired'].filter((id) => !MUSIC_IDS.has(id)).sort())
  for (const id of ['apache', 'bruzz', 'humo']) assert.ok(VL_HOME.has(id) && publisherCountry(id) === 'BE', id)
  for (const id of ['zembla', 'argos', 'rd', 'caribischnetwerk', 'duic', 'versbeton', ...OPINIE]) assert.equal(publisherCountry(id), 'NL', id)
})

test('Geschiedenis: een onderwerp van de Selectie, met bronnen, op de server, het web en de iPhone', () => {
  const f = VAK_FIELDS.find((x) => x.id === 'geschiedenis')
  assert.deepEqual(f && { domain: f.domain, label: f.label }, { domain: 'cultuur', label: 'Geschiedenis' })
  const bronnen = VAK_SOURCES.filter((s) => s.fields.includes('geschiedenis'))
  assert.ok(bronnen.length >= 3, bronnen.map((s) => s.id).join(', '))
  assert.ok(bronnen.every((s) => s.lang === 'nl'), 'Nederlandstalig')
  assert.equal(fieldOf({ title: 'Hoe de VOC Batavia bestuurde' }, bronnen[0]), 'geschiedenis')
  // De iPhone kent elk onderwerp van de server (Instellingen, Selectie).
  const swift = readFileSync(new URL('../ios/Hoot/Views/SettingsView.swift', import.meta.url), 'utf8')
  for (const x of VAK_FIELDS) assert.ok(swift.includes(`("${x.id}", "${x.label}"`), x.id)
})

test('Selectie: opinie van links tot rechts, en Nederlandstalige cultuur, taal en media', () => {
  const ids = new Set(VAK_SOURCES.map((s) => s.id))
  for (const id of ['joop', 'hpdetijd', 'wyniasweek', 'tpo', 'socialevraagstukken', 'nederlandrechtsstaat', 'oneworld', 'opiniez', 'dewereldmorgen', 'uitpers', 'groene', 'vn', 'sargasso'])
    assert.ok(ids.has('vak:' + id), id)
  for (const id of ['mediacourant', 'cuttingedge', 'nieuwemuze', 'placedelopera', 'jazzism', 'neerlandistiek', 'hardhoofd', 'filosofie', 'theaterkrant', 'delagelanden', 'nemokennislink'])
    assert.ok(ids.has('vak:' + id), id)
  // Nederlandstalig, ook op een .com- of .net-domein.
  for (const id of ['opiniez', 'delagelanden', 'hardhoofd', 'historiek']) assert.equal(VAK_SOURCES.find((s) => s.id === 'vak:' + id).lang, 'nl', id)
})

test('elke feed, elk logo en elke inlogpagina is een geldige https-URL; elke bron heeft een merkkleur en een beeld', () => {
  const https = (u, what) => {
    const url = new URL(u)
    assert.equal(url.protocol, 'https:', what)
    assert.ok(url.hostname.includes('.'), what)
  }
  for (const s of [...SOURCES, ...VAK_SOURCES]) {
    for (const u of s.urls) if (NIEUW.includes(s.id) || s.id.startsWith('vak:')) new URL(u) // gooit bij een ongeldige URL
    if (s.logo) https(s.logo, s.id + ' logo')
    if (s.login) https(s.login, s.id + ' login')
  }
  for (const id of NIEUW) {
    const s = byId.get(id)
    for (const u of s.urls) https(u, id)
    assert.match(s.color || '', /^#[0-9A-F]{6}$/i, id)
    assert.ok(s.logo || s.bsky || s.x, id + ' heeft een merkbeeld')
    readFileSync(new URL(`../landing/bronnen/${id}.webp`, import.meta.url)) // het logo voor de landing
  }
  // Betaalde titels zeggen het.
  for (const id of ['groene', 'vn', 'hpdetijd', 'tpo', 'rd', 'apache', 'humo']) assert.equal(byId.get(id).paid, true, id)
})
