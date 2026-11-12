// Het voorstel bovenaan de bronnenstap (shared/voorstel.mjs, 1.1.1): opgebouwd uit je interesses, kort,
// gratis en Nederlands voorop, een betaalde of buitenlandse bron alleen als die er duidelijk bij hoort.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { voorstel, voorstelJSON, fit, VOORSTEL_MAX } from '../shared/voorstel.mjs'
import { INTERESTS } from '../src/lib/topics.js'
import { SOURCES } from '../netlify/lib/sources.mjs'

const byId = new Map(SOURCES.map((s) => [s.id, s]))
const ids = (p) => p.map((x) => x.id)
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('zonder interesses: geen voorstel (dan de vaste Basis)', () => {
  assert.equal(voorstel(SOURCES, []), null)
  assert.equal(voorstelJSON(JSON.stringify({ sources: SOURCES })), 'null')
})

test('alleen Sport: NOS en Nederlandse, gratis sportbronnen', () => {
  const p = voorstel(SOURCES, ['sport'])
  assert.deepEqual(ids(p), ['nos', 'nos-sport', 'vi'])
  assert.ok(p.every((x) => !byId.get(x.id).paid && byId.get(x.id).lang === 'nl'))
  assert.equal(p[1].why, 'Past bij Sport')
})

test('Sport met het onderwerp wielrennen: WielerFlits in plaats van VI', () => {
  assert.deepEqual(ids(voorstel(SOURCES, ['sport'], ['wielrennen'])), ['nos', 'nos-sport', 'wielerflits'])
})

test('Tech en Wetenschap: Tweakers (Nederlands, gratis); Wetenschap heeft geen Nederlandse bron, NU.nl vult aan', () => {
  const p = voorstel(SOURCES, ['tech', 'wetenschap'])
  assert.deepEqual(ids(p), ['nos', 'tweakers', 'nu'])
  assert.ok(p.every((x) => !byId.get(x.id).paid))
  // Met Engels aan (je volgt al een Engelstalige bron) komt de gratis wetenschapsbron terug.
  assert.deepEqual(ids(voorstel(SOURCES, ['tech', 'wetenschap'], [], { english: true })), ['nos', 'tweakers', 'quanta'])
})

test('Wereld en Economie: gratis voorop en aan, NYT erbij met Abonnement maar niet aangezet (r5-voorstel-betaald), met Engels aan', () => {
  const p = voorstel(SOURCES, ['wereld', 'economie'], [], { english: true })
  assert.deepEqual(ids(p), ['nos', 'guardian', 'nos-economie', 'nyt'])
  const nyt = p.find((x) => x.id === 'nyt')
  assert.equal(nyt.why, 'Past bij Wereld en Economie')
  assert.equal(nyt.on, false, 'betaald: staat in Voor jou, maar je zet hem zelf aan')
  assert.ok(p.filter((x) => x.on).every((x) => !byId.get(x.id).paid), 'alvast aan is alleen gratis')
})

test('alleen Economie: de gratis NOS Economie aan, FD erbij maar uit (r5-economiebron)', () => {
  const p = voorstel(SOURCES, ['economie'])
  assert.deepEqual(p, [
    { id: 'nos', why: 'Het nieuws van de dag', on: true },
    { id: 'nos-economie', why: 'Past bij Economie', on: true },
    { id: 'fd', why: 'Past bij Economie', on: false },
  ])
  const eco = byId.get('nos-economie')
  assert.equal(eco.paid, undefined)
  assert.equal(eco.lang, 'nl')
  assert.deepEqual(eco.urls, ['https://feeds.nos.nl/nosnieuwseconomie'])
})

test('Politiek en Binnenland: alleen NU.nl erbij, RTL Nieuws alleen in het gratis begin (r5-politiek-rtl)', () => {
  for (const set of [['politiek'], ['binnenland'], ['politiek', 'binnenland']]) {
    const p = voorstel(SOURCES, set)
    assert.ok(ids(p).includes('nu'), set.join('+'))
    assert.ok(!ids(p).includes('rtl'), `${set.join('+')}: geen RTL Nieuws`)
  }
  assert.equal(voorstel(SOURCES, ['politiek']).find((x) => x.id === 'nu').why, 'Snel het politieke nieuws')
  assert.equal(voorstel(SOURCES, ['binnenland']).find((x) => x.id === 'nu').why, 'Snel het binnenlandse nieuws')
  // Een betaalde bron komt alleen in Voor jou als de catalogus hem aanraadt: geen regionale krant.
  assert.ok(voorstel(SOURCES, ['binnenland']).every((x) => !byId.get(x.id).paid))
})

test('altijd een gratis bron voorop, nooit meer dan vijf, elke bron één keer, nooit "Omdat je"', () => {
  const all = INTERESTS.map((i) => i.id)
  for (const set of [all, ['politiek'], ['cultuur', 'sport'], ['economie'], ['binnenland', 'wereld']]) {
    const p = voorstel(SOURCES, set)
    assert.equal(p[0].id, 'nos')
    assert.ok(p.length <= VOORSTEL_MAX)
    assert.equal(new Set(ids(p)).size, p.length)
    assert.ok(p.every((x) => x.why && !/^Omdat je/.test(x.why)))
    assert.ok(p.every((x) => x.on === !byId.get(x.id).paid), 'alleen gratis alvast aan')
    const firstOff = p.findIndex((x) => !x.on)
    assert.ok(firstOff < 0 || p.slice(firstOff).every((x) => !x.on), 'de gratis bronnen voorop')
  }
})

test('een Vlaamse of Nederlandse krant past niet bij een interesse; sport niet bij Tech', () => {
  const tech = INTERESTS.find((i) => i.id === 'tech')
  assert.equal(fit(byId.get('nrc'), tech), 0)
  assert.equal(fit(byId.get('standaard'), tech), 0)
  assert.equal(fit(byId.get('nos-sport'), tech), 0)
})

test('web en app gebruiken dezelfde regels: de rekenkern en de bronnenstap', () => {
  assert.match(read('src/lib/editionCore.js'), /export \{ voorstelJSON \} from '\.\.\/\.\.\/shared\/voorstel\.mjs'/)
  assert.match(read('ios/Hoot/Resources/edition-core.js'), /voorstelJSON/)
  assert.match(read('src/views/Welcome.jsx'), /voorstel\(pickable, interests, picked, \{ english \}\)/)
  assert.match(read('ios/Hoot/Views/WelcomeView.swift'), /EditionEngine\.shared\.voorstel/)
})

test('review G1, G2, G3 en G6: voorstel alvast aan, knop nooit dood, voorbeeld eerlijk, Stroom-einde op iOS', () => {
  const web = read('src/views/Welcome.jsx')
  assert.match(web, /\(plan \|\| \[\]\)\.filter\(\(p\) => p\.on\)\.map\(\(p\) => p\.id\)/, 'de eerste keer staat het gratis deel van Voor jou aan')
  assert.match(web, /label=\{plan \? 'Voor jou' : 'Basis'\}/)
  assert.match(web, /'Begin met het gratis begin'/)
  assert.doesNotMatch(web, /disabled=\{!mine\.length\}/)
  assert.match(web, /Ook uit \{sourceLine\(missing\)\}/)
  const ios = read('ios/Hoot/Views/WelcomeView.swift')
  assert.match(ios, /"Begin met het gratis begin"/)
  assert.match(ios, /Ook uit \\\(FollowList\.sourceLine\(missing\)\)/)
  for (const line of ['Alvast gevolgd. Uitzetten kan met één tik.', 'De gratis bronnen volg je alvast. Uitzetten kan met één tik.']) {
    assert.ok(ios.includes(line), `app: ${line}`)
    assert.ok(web.includes(line), `web: ${line}`)
  }
  assert.match(ios, /title: voorstel == nil \? "Basis" : "Voor jou"/)
  assert.match(read('ios/Hoot/Views/StreamView.swift'), /Text\("Je bent bij\."\)/)
})

// Week · 4 (taal volgt bronkeuze): een nieuw profiel krijgt alleen Nederlandse bronnen, dus een Nederlandse eerste Editie.
test('een nieuw profiel: nooit een Engelstalige bron, voor geen enkele interesse of combinatie', () => {
  const all = INTERESTS.map((i) => i.id)
  const sets = [...all.map((i) => [i]), all, ['wereld', 'economie'], ['tech', 'wetenschap'], ['politiek', 'wereld']]
  for (const set of sets) {
    const p = voorstel(SOURCES, set)
    assert.ok(p.every((x) => (byId.get(x.id).lang || 'nl') === 'nl'), `${set.join('+')}: ${ids(p)}`)
    assert.equal(p[0].id, 'nos')
    assert.ok(p.length >= 3 || set.every((i) => ['politiek', 'binnenland'].includes(i)), `${set.join('+')}: minstens drie`)
  }
  assert.deepEqual(ids(voorstel(SOURCES, ['wereld'])), ['nos', 'nu', 'rtl'])
  assert.deepEqual(ids(voorstel(SOURCES, ['wetenschap'])), ['nos', 'nu', 'rtl'])
  assert.deepEqual(ids(voorstel(SOURCES, ['politiek'])), ['nos', 'nu'], 'RTL Nieuws blijft weg bij Politiek (r5-politiek-rtl)')
  assert.deepEqual(ids(voorstel(SOURCES, ['sport'])), ['nos', 'nos-sport', 'vi'], 'wat al Nederlands was, blijft')
})

test('Engels aan geeft het voorstel van voor Week · 4, ook via de rekenkern van de app', () => {
  const en = voorstel(SOURCES, ['wereld'], [], { english: true })
  assert.deepEqual(ids(en), ['nos', 'guardian', 'bbc'])
  const viaJSON = JSON.parse(voorstelJSON(JSON.stringify({ sources: SOURCES, interests: ['wereld'], english: true })))
  assert.deepEqual(ids(viaJSON), ids(en))
  const zonder = JSON.parse(voorstelJSON(JSON.stringify({ sources: SOURCES, interests: ['wereld'] })))
  assert.deepEqual(ids(zonder), ['nos', 'nu', 'rtl'])
  assert.match(read('src/views/Welcome.jsx'), /voorstel\(pickable, interests, picked, \{ english \}\)/)
  assert.match(read('ios/Hoot/Views/WelcomeView.swift'), /voorstel\(sources: store\.newsSources, interests: interests, topics: picked, english: english\)/)
})

test('de eerste Editie van een nieuw profiel is Nederlands: de voorbeeldregels in de bronnenstap komen uit Nederlandse bronnen', async () => {
  const { previewLines } = await import('../src/lib/follow-welcome.js')
  const items = SOURCES.map((s, n) => ({ id: `i${n}`, source: s.id, sourceName: s.name, title: `Kop ${s.id}`, kind: 'article', publishedAt: `2026-11-12T0${n % 9}:00:00Z` }))
  for (const set of [['wereld'], ['wetenschap'], ['tech', 'wetenschap'], ['wereld', 'economie']]) {
    const mine = voorstel(SOURCES, set).filter((x) => x.on).map((x) => x.id)
    const lines = previewLines(items, SOURCES, mine, 4)
    assert.ok(lines.length > 0)
    assert.ok(lines.every((l) => byId.get(l.source.id).lang === 'nl'), `${set.join('+')}: ${lines.map((l) => l.source.id)}`)
  }
})
