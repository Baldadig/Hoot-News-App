// Trekken om te verversen, Horizon v2: de standen en tijden uit de proef (Hoot-design, woensdag
// 4 november, pull-concepten-2/1-horizon.html, spec-rij en toets-1-horizon-v2.md), vastgelegd op de
// rekensom die web en iOS delen. Schrijft ook tests/fixtures/pull-horizon.json: dezelfde invoer en
// uitkomst, die ios/HootTests/PullHorizonTests.swift naloopt (web = app, tot op 0,01 pt).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import {
  T, MAX, STRIP, MS, NOON, MSG, R, HALF, RINGS, resist, arcPt, breathe, glowAt, geom, answer, closeAt, doneAt,
  journey, stripHeight, svg, drag, release, answered, sunT, E,
} from '../src/lib/pull-horizon.js'

const near = (a, b, eps = 0.01, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} ≠ ${b}`)
const CW = 390 // scherm van 390: lijn 358 van kantlijn tot kantlijn
const pull = (d, extra = {}) => geom({ phase: 'pull', pull: d, glow: d >= T ? 1 : 0, ...extra }, 0, CW)
const load = (tau, extra = {}) => geom({ phase: 'load', loadT0: 0, ...extra }, tau, CW)

test('maten: drempel 72, strook 56, rem tot 120, zon ⌀ 16, dagdelen −68 · 0 · +68', () => {
  assert.equal(T, 72); assert.equal(STRIP, 56); assert.equal(MAX, 120); assert.equal(R, 8); assert.equal(HALF, 68)
  assert.deepEqual(RINGS, [[1.3, 0.45], [1.6, 0.28], [1.9, 0.15]])
  // Boog als de landing: koorde 136, einden 8, top 32 (top/koorde 0,235).
  near(arcPt(0).x, -68); near(arcPt(0).y, 8); near(arcPt(0.5).x, 0); near(arcPt(0.5).y, 32); near(arcPt(1).x, 68); near(arcPt(1).y, 8)
  near(32 / 136, 0.235, 0.001)
})

test('trekken: 1 : 1 tot de drempel, daarna een zachte rem die nooit voorbij 120 komt', () => {
  for (const d of [0, 30, 60, 71, 72]) assert.equal(resist(d), d)
  near(resist(140), 92.76, 0.01, 'vingerweg 140 (gemeten in de proef)')
  assert.ok(resist(10000) <= MAX && resist(10000) > 119.9)
  assert.equal(resist(-20), 0); assert.equal(resist(NaN), 0)
})

test('trekken: eerst de grond, dan de zon; op de drempel rust de zon op de lijn', () => {
  assert.equal(pull(16).lineOp, 0)
  near(pull(24).lineOp, 0.5); near(pull(32).lineOp, 1)
  near(pull(16).w, 16); near(pull(72).w, 358, 0.01, 'kantlijn tot kantlijn op 72'); near(pull(120).w, 358)
  assert.equal(pull(71).strong, false); assert.equal(pull(72).strong, true)
  // De zon komt op tussen 40 en 72: 16 stijgen over 32 trek (1 : 2); op 56 een halve zon.
  near(pull(40).sy, -8); near(pull(56).sy, 0); near(pull(72).sy, 8); near(pull(120).sy, 8)
  near(pull(72).sx, -68, 0.01, 'opkomst bij de ochtend')
  // Ringen op 60 %, op de drempel volle sterkte.
  near(pull(64, { glow: 0 }).ringOp, 0.75 * 0.6); near(pull(72).ringOp, 1)
  // Middelpunt 6 · 4 · 0 · −4 onder de lijn op 44 · 48 · 56 · 64 (toets): y = −6, −4, 0, 4.
  near(pull(44).sy, -6); near(pull(48).sy, -4); near(pull(64).sy, 4)
})

test('drempel: de ringen lichten op in 140 ms, één tik per kruising van onder naar boven', () => {
  assert.equal(glowAt(0, true, 0), 0); near(glowAt(140, true, 0), 1); assert.equal(glowAt(70, true, 0, true), 1)
  let st = { phase: 'pull', pull: 0, armed: false }
  const tiks = []
  for (const v of [30, 71, 72, 90, 60, 80, 120]) { const r = drag(st, v, 0); st = r.st; tiks.push(r.tik) }
  assert.deepEqual(tiks, [false, false, true, false, false, true, false])
})

test('loslaten: onder de drempel annuleert, erboven start precies één verversing', () => {
  let r = release({ phase: 'pull', pull: 71, armed: false }, 10, false)
  assert.equal(r.refresh, false); assert.equal(r.st.phase, 'cancel')
  near(stripHeight(r.st, 10 + MS.close), 0, 0.01, 'de strook glijdt in 400 ms dicht')
  r = release({ phase: 'pull', pull: 90, armed: true }, 10, false)
  assert.equal(r.refresh, true); assert.equal(r.st.phase, 'load'); assert.equal(r.st.loadT0, 10)
  // Loopt er al een (de knop in de kop), dan geen tweede: de strook wacht erop.
  const busy = release({ phase: 'pull', pull: 90, armed: true }, 10, true)
  assert.equal(busy.refresh, false); assert.equal(busy.st.phase, 'load'); assert.equal(busy.st.sawBusy, true)
})

test('opnieuw trekken tijdens laden: alleen ruimte, veert terug naar 56, nooit een tweede verzoek', () => {
  let st = release({ phase: 'pull', pull: 80, armed: true }, 0, false).st
  st = { ...st, sawBusy: true }
  near(stripHeight(st, MS.close), 56)
  let refreshes = 0
  for (let i = 0; i < 3; i++) {
    st = drag(st, resist(140), 500 + i * 100).st
    assert.equal(st.phase, 'load')
    near(stripHeight(st, 500 + i * 100), 56 + 92.76, 0.02)
    const r = release(st, 600 + i * 100, true); st = r.st; refreshes += r.refresh ? 1 : 0
    near(stripHeight(st, 600 + i * 100 + MS.close), 56)
  }
  assert.equal(refreshes, 0)
  // Het antwoord wacht zolang je trekt.
  assert.equal(answered({ ...st, dragging: true }, 9000, false), false)
  assert.equal(answered(st, 9000, false), true)
  assert.equal(answered(st, 9000, true), false)
})

test('laden: ringen wijken (200), boog verschijnt (200), zon loopt in 800 naar de middag en ademt', () => {
  near(load(0).ringOp, 1); near(load(200).ringOp, 0)
  near(load(200).arcOp, 0); near(load(400).arcOp, 1)
  near(load(400).sx, -68); near(load(400).sy, 8)
  near(load(NOON).sx, 0); near(load(NOON).sy, 32, 0.01, 'middag op 1,2 s')
  assert.equal(NOON, 1200)
  near(load(800).sx, -34, 0.01, 'halverwege in-out')
  // Adem: 1 → 1,06 → 0,92 → 1, elke stap 2750 ms; geen rondjes.
  near(load(NOON).scale, 1); near(load(NOON + 2750).scale, 1.06); near(load(NOON + 5500).scale, 0.92); near(load(NOON + 8250).scale, 1)
  near(breathe(0), 1); near(breathe(2750 * 3), 1)
  near(load(NOON + 9000).sx, 0, 0.01, 'blijft op de middag')
})

test('Snel: van antwoord tot dicht 1840 ms; ondergang 600 ms bij de vroege avond, lijn uit op 440', () => {
  const j = journey({ responseMs: 1000 })
  assert.deepEqual(j, { set: 2000, close: 2440, done: 2840 })
  assert.equal(j.done - 1000, 1840)
  let st = answer({ phase: 'load', loadT0: 0 }, 1000, true)
  assert.equal(st.phase, 'go'); assert.equal(st.leg2T0, NOON)
  const go = (t) => geom(st, t, CW)
  near(go(NOON + 400).sx, 34, 0.01, 'halverwege naar de vroege avond'); near(go(NOON + 800).sx, 68)
  st = { ...st, phase: 'set', setT0: 2000 }
  const set = (t) => geom(st, 2000 + t, CW)
  near(set(0).sy, 8); near(set(0).sx, 68); near(set(600).sy, -8, 0.01, 'onder in 600 ms')
  near(set(440).lineOp, 1); near(set(510).lineOp, 0.5); near(set(580).lineOp, 0)
  near(set(300).sy, 8 - 16 * E.iris(0.5))
  assert.equal(closeAt(st), 2440); assert.equal(doneAt(st), 2840)
  near(stripHeight({ ...st, from: 90, loadT0: 0 }, 2440), 56); near(stripHeight({ ...st, from: 90, loadT0: 0 }, 2840), 0)
})

test('Traag: de zon wacht op de middag, het doorlopen begint bij het antwoord en vertrekt uit de adem', () => {
  const j = journey({ responseMs: 7000 })
  assert.deepEqual(j, { set: 7800, close: 8240, done: 8640 })
  const st = answer({ phase: 'load', loadT0: 0 }, 7000, true)
  near(st.s0, breathe(7000 - NOON))
  near(geom(st, 7000, CW).scale, st.s0); near(geom(st, 7400, CW).scale, 1)
})

test('Fout: boog weg in 200, zon terug naar de ochtend (600), onder (400), zin 2 s, dan dicht', () => {
  const st = answer({ phase: 'load', loadT0: 0 }, 2000, false)
  assert.equal(st.phase, 'fail'); near(st.tf, 0.5)
  const f = (t) => geom(st, 2000 + t, CW)
  near(f(0).sx, 0); near(f(200).arcOp, 0)
  near(f(600).sx, -68); near(f(600).sy, 8); near(f(1000).sy, -8)
  near(f(600).msg, 0); near(f(800).msg, 1); near(f(2600).msg, 1); near(f(2800).msg, 0)
  assert.equal(closeAt(st), 2000 + 600 + 2000); assert.equal(doneAt(st), 2000 + 3000)
  assert.deepEqual(journey({ responseMs: 2000, ok: false }), { set: null, close: 4600, done: 5000 })
  assert.equal(MSG, 'Niet ververst. Trek opnieuw.')
})

test('Verminder beweging: lijn meteen heel, zon komt op met de afstand, één wissel, één vervaging', () => {
  const p = (d) => geom({ phase: 'pull', pull: d, reduce: true }, 0, CW)
  near(p(20).w, 358); near(p(20).lineOp, 0.25); assert.equal(p(20).sunOp, 0)
  near(p(30).lineOp, 0.875); near(p(30).sunOp, 0.375); near(p(40).sunOp, 1); near(p(40).lineOp, 1)
  near(p(30).sy, 8, 0.01, 'de zon rust er al op; nooit afgesneden')
  const st = { phase: 'load', loadT0: 0, reduce: true }
  near(geom(st, 0, CW).sx, -68); near(geom(st, 175, CW).sx, 0, 0.01, 'één wissel naar de middag op 175')
  assert.equal(geom(st, 6000, CW).scale, 1, 'geen adem')
  assert.equal(stripHeight({ ...st, from: 90 }, 0), 56, 'strook direct op 56')
  assert.deepEqual(journey({ responseMs: 1000, reduce: true }), { set: 1000, close: 1350, done: 1350 })
  const s = answer(st, 1000, true)
  near(geom(s, 1175, CW).lineOp, 0.5); near(geom(s, 1350, CW).sunOp, 0)
  assert.equal(stripHeight({ ...s, from: 90 }, 1349), 56); assert.equal(stripHeight({ ...s, from: 90 }, 1350), 0)
  assert.deepEqual(journey({ responseMs: 1000, ok: false, reduce: true }), { set: null, close: 3350, done: 3350 })
  const c = release({ phase: 'pull', pull: 50, armed: false, reduce: true }, 0, false).st
  assert.equal(stripHeight(c, 100), 50, 'annuleren zonder glijden'); assert.equal(stripHeight(c, 350), 0)
})

test('tekening: geen h., geen tekst; één rood ding (de zon met zijn ringen), lijn altijd 1 pt', () => {
  for (const g of [pull(56), pull(72), load(800), load(NOON + 2750)]) {
    const s = svg(g, { cw: CW, h: 128 })
    assert.doesNotMatch(s, /<text|<img|<use|<path[^>]*accent/)
    assert.match(s, /height="1"/)
    assert.doesNotMatch(s, /height="2"/)
    const red = s.match(/var\(--accent\)/g) || []
    assert.ok(red.length >= 1)
    assert.match(s, /clip-path="url\(#sky-/, 'zon en ringen in de lucht, afgeknipt op de lijn')
  }
  assert.match(svg(load(800), { cw: CW, h: 128 }), /stroke-dasharray="1 4"/)
  assert.match(svg(pull(72), { cw: CW, h: 128 }), /var\(--pull-strong\)/)
  assert.doesNotMatch(svg(pull(60), { cw: CW, h: 128 }), /var\(--pull-strong\)/)
})

test('huisregels in de zichtbare tekst: geen kloktijden', () => {
  assert.doesNotMatch(MSG, /\d/)
  const src = readFileSync(new URL('../src/components/PullHorizon.jsx', import.meta.url), 'utf8')
  assert.match(src, /ververst'/)
  assert.doesNotMatch(src, /\b\d{1,2}[:.]\d{2}\s*uur/)
})

test('de schermen gebruiken de horizon; de h. is geen trekteken meer', () => {
  for (const [file, label] of [['Edition', 'Editie'], ['Stream', 'Stroom'], ['Vak', 'Selectie']]) {
    const src = readFileSync(new URL(`../src/views/${file}.jsx`, import.meta.url), 'utf8')
    assert.match(src, new RegExp(`usePullHorizon\\(ref, \\{[^}]*label: '${label}'`), file)
    assert.match(src, /\{pull\}/, file)
  }
  const swift = readFileSync(new URL('../ios/Hoot/Views/QuietMotion.swift', import.meta.url), 'utf8')
  assert.doesNotMatch(swift, /PullRefreshMark|RefreshLoadingMark|dotTravel/)
  assert.match(swift, /HorizonPullMark/)
})

// Gedeelde invoer en uitkomst voor de iOS-test: dezelfde rekensom op beide platforms.
test('fixture voor iOS: web en app rekenen hetzelfde', () => {
  const cases = []
  const add = (name, st, now) => {
    const g = geom(st, now, CW)
    const r = (v) => Math.round(v * 1000) / 1000
    cases.push({ name, st, now, g: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, typeof v === 'number' ? r(v) : v])) })
  }
  for (const d of [0, 20, 30, 44, 56, 64, 71, 72, 100]) add(`trek-${d}`, { phase: 'pull', pull: d, glow: d >= T ? 1 : 0.5, artOp: 1, reduce: false }, 0)
  for (const d of [20, 30, 40]) add(`trek-stil-${d}`, { phase: 'pull', pull: d, glow: 0, artOp: 1, reduce: true }, 0)
  for (const t of [0, 100, 300, 800, 1200, 3950, 6700]) add(`laden-${t}`, { phase: 'load', loadT0: 0, reduce: false }, t)
  for (const t of [0, 175, 300]) add(`laden-stil-${t}`, { phase: 'load', loadT0: 0, reduce: true }, t)
  const go = answer({ phase: 'load', loadT0: 0, reduce: false }, 4000, true)
  for (const t of [4000, 4200, 4600]) add(`door-${t}`, go, t)
  const set = { phase: 'set', setT0: 0, reduce: false }
  for (const t of [0, 300, 440, 510, 600]) add(`onder-${t}`, set, t)
  for (const t of [0, 175]) add(`onder-stil-${t}`, { ...set, reduce: true }, t)
  const fail = { phase: 'fail', failT0: 0, tf: 0.5, reduce: false }
  for (const t of [0, 100, 300, 600, 800, 1000, 2700, 2800]) add(`fout-${t}`, fail, t)
  for (const t of [0, 2000, 2175]) add(`fout-stil-${t}`, { ...fail, reduce: true }, t)
  const journeys = [[1000, true, false], [7000, true, false], [2000, false, false], [1000, true, true], [1000, false, true]]
    .map(([responseMs, ok, reduce]) => ({ responseMs, ok, reduce, ...journey({ responseMs, ok, reduce }) }))
  const data = { width: CW, cases, journeys, resist: [0, 50, 72, 100, 140, 400].map((d) => [d, Math.round(resist(d) * 1000) / 1000]) }
  const file = new URL('./fixtures/pull-horizon.json', import.meta.url)
  const text = JSON.stringify(data, null, 1) + '\n'
  if (process.env.PULL_FIXTURE_WRITE || !existsSync(file)) writeFileSync(file, text)
  assert.equal(readFileSync(file, 'utf8'), text, 'tests/fixtures/pull-horizon.json is bij (PULL_FIXTURE_WRITE=1 npm test)')
  assert.ok(sunT)
})
