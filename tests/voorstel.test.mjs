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

test('Tech en Wetenschap: Tweakers (Nederlands, gratis) en een gratis wetenschapsbron', () => {
  const p = voorstel(SOURCES, ['tech', 'wetenschap'])
  assert.deepEqual(ids(p), ['nos', 'tweakers', 'quanta'])
  assert.ok(p.every((x) => !byId.get(x.id).paid))
})

test('Wereld en Economie: een sterke internationale bron erbij (NYT), en een gratis', () => {
  const p = voorstel(SOURCES, ['wereld', 'economie'])
  assert.deepEqual(ids(p), ['nos', 'nyt', 'guardian'])
  assert.equal(p[1].why, 'Past bij Wereld en Economie')
  assert.ok(byId.get('nyt').paid, 'betaald: het label Abonnement staat erbij')
  assert.ok(p.some((x) => !byId.get(x.id).paid && byId.get(x.id).lang === 'en'), 'ook een gratis internationale bron')
})

test('altijd een gratis bron voorop, nooit meer dan vijf, elke bron één keer, nooit "Omdat je"', () => {
  const all = INTERESTS.map((i) => i.id)
  for (const set of [all, ['politiek'], ['cultuur', 'sport'], ['economie'], ['binnenland', 'wereld']]) {
    const p = voorstel(SOURCES, set)
    assert.equal(p[0].id, 'nos')
    assert.ok(p.length <= VOORSTEL_MAX)
    assert.equal(new Set(ids(p)).size, p.length)
    assert.ok(p.every((x) => x.why && !/^Omdat je/.test(x.why)))
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
  assert.match(read('src/views/Welcome.jsx'), /voorstel\(pickable, interests, picked\)/)
  assert.match(read('ios/Hoot/Views/WelcomeView.swift'), /EditionEngine\.shared\.voorstel/)
})

test('review G1, G2, G3 en G6: voorstel alvast aan, knop nooit dood, voorbeeld eerlijk, Stroom-einde op iOS', () => {
  const web = read('src/views/Welcome.jsx')
  assert.match(web, /\(plan \|\| \[\]\)\.map\(\(p\) => p\.id\)/, 'de eerste keer staat het voorstel aan')
  assert.match(web, /'Begin met het gratis begin'/)
  assert.doesNotMatch(web, /disabled=\{!mine\.length\}/)
  assert.match(web, /Ook uit \{sourceLine\(missing\)\}/)
  const ios = read('ios/Hoot/Views/WelcomeView.swift')
  assert.match(ios, /"Begin met het gratis begin"/)
  assert.match(ios, /Ook uit \\\(FollowList\.sourceLine\(missing\)\)/)
  assert.match(ios, /Alvast gevolgd\. Uitzetten kan met één tik\./)
  assert.match(web, /Alvast gevolgd\. Uitzetten kan met één tik\./)
  assert.match(read('ios/Hoot/Views/StreamView.swift'), /Text\("Je bent bij\."\)/)
})
