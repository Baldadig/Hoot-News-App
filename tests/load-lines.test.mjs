// De laadstrepen, "A · De stapel" (Hoot-design, woensdag-2026-11-04/laadscherm-concept, spec-rij):
// maten, lus, klaar, fout en rust, vastgelegd op de rekensom die web en iOS delen. Schrijft ook
// tests/fixtures/load-lines.json: dezelfde invoer en uitkomst, die ios/HootTests/LoadLinesTests.swift
// naloopt (web = app, tot op 0,01 pt).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LL, LABEL, CURVE, E, stackAt, settleAt, frame, rowsFromRects, nextLoad, snap } from '../src/lib/load-lines.js'

const near = (a, b, eps = 0.01, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≠ ${b}`)
const BOX = { x: 0, y: 0, w: 390 }
const TARGETS = { rule: { x: 16, y: 28, w: 358 }, rows: [{ x: 16, y: 300, w: 296 }, { x: 16, y: 336, w: 336 }, { x: 16, y: 372, w: 140 }] }

test('maten: vier vellen van 56, haarlijn 1 pt, steek 8, opzij −4 · 0 · +4 · −2, midden', () => {
  assert.equal(LL.len, 56); assert.equal(LL.step, 8); assert.deepEqual(LL.offs, [-4, 0, 4, -2])
  assert.equal(LL.top, 180); assert.equal(LL.box, 240); assert.equal(LABEL, 'Even kijken bij je bronnen')
  const s = stackAt(0, BOX, true)
  assert.equal(s.length, 4)
  assert.deepEqual(s.map((l) => l.x - (390 - 56) / 2), [-4, 0, 4, -2])
  assert.deepEqual(s.map((l) => l.y), [180, 188, 196, 204])
  for (const l of s) { assert.equal(l.w, 56); assert.equal(l.h, 1); assert.equal(l.o, 1); assert.equal(l.accent, 0) }
})

test('lus: 2000 ms, bovenste vel eraf in 640 ms easeInOut, dan 1360 stil', () => {
  assert.equal(LL.period, 2000); assert.equal(LL.move, 640); assert.equal(LL.period - LL.move, 1360)
  assert.deepEqual(CURVE.inOut, [0.4, 0, 0.2, 1]); assert.deepEqual(CURVE.glide, [0.2, 0.8, 0.2, 1])
  // Eerst vloeien de vellen in: 240 ms, 40 ms na elkaar.
  assert.equal(stackAt(0, BOX).length, 0)
  near(stackAt(LL.fadeIn, BOX)[0].o, 1)
  assert.equal(stackAt(360, BOX).every((l) => l.o === 1), true)
  // Halverwege het eraf gaan: bovenste schuin omhoog en vervagend, nieuw vel onderin.
  const mid = stackAt(LL.firstBeat + 320, BOX)
  const e = E.inOut(0.5)
  assert.equal(mid.length, 5)
  near(mid[0].y, 180 - 8 * e); near(mid[0].x, (390 - 56) / 2 - 4 + 8 * e); near(mid[0].o, 1 - e)
  near(mid[4].y, 212 - 8 * e); near(mid[4].o, e)
  // Na de beweging: vier vellen op hun plek, de rij van opzij een vel verder.
  const after = stackAt(LL.firstBeat + LL.move, BOX)
  assert.deepEqual(after.map((l) => l.y), [180, 188, 196, 204])
  assert.deepEqual(after.map((l) => l.x - 167), [0, 4, -2, -4])
  assert.deepEqual(stackAt(LL.firstBeat + 1999, BOX), after) // stil tot de volgende
  // Lang laden blijft kalm: na tien rondes precies dezelfde vorm.
  const later = stackAt(LL.firstBeat + 10 * LL.period + LL.move, BOX)
  assert.deepEqual(later.map((l) => [l.y, l.w, l.o]), after.map((l) => [l.y, l.w, l.o]))
})

test('klaar wacht tot de lopende beweging stil is, nooit langer dan 800 ms', () => {
  for (let t = 0; t < 9000; t += 7) {
    const s = settleAt(t)
    assert.ok(s >= t && s - t <= LL.settleMax, `t=${t}`)
    const a = stackAt(s, BOX), b = stackAt(s + 1, BOX)
    if (s >= 360) assert.deepEqual(a.map((l) => [l.x, l.y, l.o]), b.map((l) => [l.x, l.y, l.o]), `stil op ${s}`)
  }
  assert.equal(settleAt(1200), 1640); assert.equal(settleAt(1700), 1700); assert.equal(settleAt(100), 360)
})

test('landen: 480 ms glide, bovenste vel wordt de rode kopstreep, drie strepen naar de kopregels', () => {
  const st = { t0: 0, doneAt: 1200, box: BOX, targets: TARGETS }
  const S = 1640
  // Tot de beweging stil is: gewoon de lus.
  assert.deepEqual(frame(st, 1400).lines, stackAt(1400, BOX))
  const land = frame(st, S + LL.land)
  assert.equal(land.lines.length, 4)
  const [kop, ...rows] = land.lines
  near(kop.x, 16); near(kop.y, 28); near(kop.w, 358); assert.equal(kop.h, 2); near(kop.accent, 1)
  rows.forEach((r, i) => { near(r.x, TARGETS.rows[i].x); near(r.y, TARGETS.rows[i].y); near(r.w, TARGETS.rows[i].w); assert.equal(r.h, 1) })
  assert.equal(land.text, 0); assert.equal(land.rule, 0); assert.equal(land.rise, 8)
  // Rood komt in 240 ms bij vertrek, en is alleen de kopstreep.
  near(frame(st, S + 240).lines[0].accent, 1); assert.ok(frame(st, S + 120).lines.slice(1).every((l) => l.accent === 0))
  // Dikte wisselt halverwege, op hele punten.
  assert.equal(frame(st, S + 200).lines[0].h, 1); assert.equal(frame(st, S + 260).lines[0].h, 2)
  // Lezen: tekst 320 in, strepen 320 uit, kopstreep wordt inkt (240), de rest stijgt 8 → 0.
  const read = frame(st, S + LL.land + LL.text)
  near(read.text, 1); near(read.rise, 0); assert.ok(read.lines.slice(1).every((l) => l.o === 0) || read.lines.length === 1)
  near(frame(st, S + LL.land + LL.ruleInk).lines[0].ink, 1)
  // Na 360 neemt de echte lijn het over en is de laag klaar.
  const done = frame(st, S + LL.land + LL.handoff)
  assert.equal(done.rule, 1); assert.equal(done.lines.length, 0); assert.equal(done.done, true)
  assert.equal(frame(st, S + LL.land + LL.handoff - 1).rule, 0)
})

test('minder dan drie kopregels: de overgebleven streep vervaagt', () => {
  const st = { t0: 0, doneAt: 1200, box: BOX, targets: { rule: TARGETS.rule, rows: TARGETS.rows.slice(0, 2) } }
  const f = frame(st, 1640 + LL.ruleInk)
  assert.equal(f.lines.length, 3)
})

test('onder 400 ms: geen strepen, de inhoud meteen', () => {
  const f = frame({ t0: 0, doneAt: 399, box: BOX, targets: TARGETS }, 399)
  assert.deepEqual(f.lines, []); assert.equal(f.text, 1); assert.equal(f.rule, 1); assert.equal(f.done, true)
  assert.equal(LL.early, 400)
})

test('zonder kop (Stroom, Selectie, de lezer): afmaken en in 320 ms vervagen naar de inhoud', () => {
  const st = { t0: 0, doneAt: 1200, box: BOX, targets: null }
  assert.deepEqual(frame(st, 1500).lines, stackAt(1500, BOX))
  const half = frame(st, 1640 + 160)
  assert.ok(half.lines.every((l) => l.o < 1 && l.o > 0)); assert.ok(half.text > 0 && half.text < 1)
  assert.equal(half.lines.every((l) => l.accent === 0), true) // geen rood zonder kopstreep
  const end = frame(st, 1640 + LL.out)
  assert.equal(end.lines.length, 0); near(end.text, 1); assert.equal(end.done, true)
})

test('fout: beweging maakt af, strepen 320 uit, foutblok 240 in (160 later)', () => {
  const st = { t0: 0, failAt: 1200, box: BOX }
  assert.deepEqual(frame(st, 1500).lines, stackAt(1500, BOX))
  assert.equal(frame(st, 1640 + 160).err, 0)
  near(frame(st, 1640 + 160 + 240).err, 1)
  assert.equal(frame(st, 1640 + 320).lines.length, 0)
  assert.equal(frame(st, 1640 + 400).done, true); assert.equal(frame(st, 1640 + 399).done, false)
  assert.equal(frame(st, 1640 + 400).text, 0)
})

test('Verminder beweging: vier stilstaande strepen; klaar en fout 200 ms overvloeien', () => {
  for (const t of [0, 500, 1320, 7777]) assert.deepEqual(frame({ t0: 0, reduce: true, box: BOX }, t).lines, stackAt(0, BOX, true))
  const ok = frame({ t0: 0, reduce: true, doneAt: 5000, box: BOX, targets: TARGETS }, 5100)
  near(ok.text, 0.5); assert.ok(ok.lines.every((l) => Math.abs(l.o - 0.5) < 0.01 && l.accent === 0))
  assert.equal(frame({ t0: 0, reduce: true, doneAt: 5000, box: BOX }, 5200).done, true)
  near(frame({ t0: 0, reduce: true, failAt: 5000, box: BOX }, 5200).err, 1)
})

test('kopregels uit de rechthoeken van een Range: per regel van kantlijn tot eind, op de basislijn', () => {
  const rows = rowsFromRects([
    { top: 300, bottom: 336, left: 16, right: 200, width: 184 }, { top: 301, bottom: 336, left: 200, right: 340, width: 140 },
    { top: 336, bottom: 372, left: 16, right: 352, width: 336 }, { top: 372, bottom: 408, left: 16, right: 110, width: 94 },
    { top: 408, bottom: 444, left: 16, right: 90, width: 74 },
  ], 30)
  assert.deepEqual(rows, [{ x: 16, y: 329, w: 324 }, { x: 16, y: 365, w: 336 }, { x: 16, y: 401, w: 94 }])
  assert.equal(snap(10.26, 2), 10.5); assert.equal(snap(10.26, 3), 10.333333333333334)
})

test('de toestand naast het laden: begin, klaar of fout, en alleen bij een echte overgang', () => {
  let s = nextLoad({ phase: 'idle' }, { loading: false, ok: true }, 5)
  assert.deepEqual(s, { phase: 'idle' })
  s = nextLoad(s, { loading: true, ok: false }, 10); assert.deepEqual(s, { phase: 'loading', t0: 10, doneAt: null, failAt: null })
  assert.equal(nextLoad(s, { loading: true }, 50), s)
  assert.deepEqual(nextLoad(s, { loading: false, ok: true }, 900), { phase: 'ending', t0: 10, doneAt: 900, failAt: null })
  assert.deepEqual(nextLoad(s, { loading: false, ok: false }, 900), { phase: 'ending', t0: 10, doneAt: null, failAt: 900 })
  const ending = nextLoad(s, { loading: false, ok: true }, 900)
  assert.equal(nextLoad(ending, { loading: false, ok: true }, 950), ending)
})

const bundle = await build({ entryPoints: ['src/components/LoadLines.jsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external' })
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports)

test('in beeld geen tekst; de schermlezer hoort "Even kijken bij je bronnen"', () => {
  const html = renderToStaticMarkup(React.createElement(mod.exports.LoadLinesBox))
  assert.equal(html, '<div class="ll-box" role="status" aria-label="Even kijken bij je bronnen"></div>')
  const css = readFileSync('src/styles.css', 'utf8')
  assert.match(css, /\.ll-line \{ position: absolute; left: 0; top: 0; height: 1px; background: var\(--ink-3\);/)
  assert.match(css, /\.ll-box \{ min-height: 240px; \}/)
  assert.match(css, /\.ll-ending \.edrule \{ opacity: var\(--ll-rule, 0\); \}/)
  const jsx = readFileSync('src/components/LoadLines.jsx', 'utf8')
  assert.match(jsx, /prefers-reduced-motion: reduce/)
  assert.match(jsx, /var\(--accent\)/)
})

test('Editie, Stroom en Selectie gebruiken de strepen; alleen de Editie landt op kopstreep en kop', () => {
  for (const view of ['Edition', 'Stream', 'Vak']) {
    const src = readFileSync(`src/views/${view}.jsx`, 'utf8')
    assert.match(src, /<LoadLinesBox \/>/, view)
    assert.match(src, /<LoadLinesLayer lines=\{lines\} host=\{hostRef\}/, view)
    assert.doesNotMatch(src, /<Skeleton/, view)
  }
  assert.match(readFileSync('src/views/Edition.jsx', 'utf8'), /'\.front \.lead__title'\} rule="\.edrule"/)
  assert.doesNotMatch(readFileSync('src/views/Stream.jsx', 'utf8'), /land=/)
  assert.doesNotMatch(readFileSync('src/views/Vak.jsx', 'utf8'), /land=/)
})

test('web gelijk aan de app: dezelfde maten en tijden in LoadLines.swift', () => {
  const swift = readFileSync('ios/Hoot/Views/LoadLines.swift', 'utf8')
  for (const [k, v] of Object.entries(LL)) {
    if (k === 'offs') { assert.ok(swift.includes('static let offs: [CGFloat] = [-4, 0, 4, -2]'), 'offs'); continue }
    assert.ok(new RegExp(`static let ${k}: (CGFloat|Double) = ${v}\\b`).test(swift), `${k} = ${v}`)
  }
  for (const c of ['(0.4, 0, 0.2, 1)', '(0.2, 0.8, 0.2, 1)']) assert.ok(swift.includes(`bezier${c}`), c)
  assert.ok(swift.includes(`"${LABEL}"`))
})

test('fixture voor iOS: web en app rekenen hetzelfde', () => {
  const cases = []
  const add = (name, st, now) => {
    const f = frame(st, now)
    const r = (v) => Math.round(v * 10000) / 10000
    cases.push({ name, st, now, f: { text: r(f.text), rise: r(f.rise), rule: f.rule, err: r(f.err), done: f.done, lines: f.lines.map((l) => [l.n, r(l.x), r(l.y), r(l.w), l.h, r(l.o), r(l.accent), r(l.ink)]) } })
  }
  const box = { x: 0, y: 112, w: 390 }
  const targets = { rule: { x: 16, y: 140, w: 358 }, rows: [{ x: 16, y: 412, w: 296 }, { x: 16, y: 448, w: 336 }, { x: 16, y: 484, w: 140 }] }
  for (const t of [0, 40, 120, 200, 360, 999, 1000, 1100, 1320, 1500, 1640, 2000, 3000, 3200, 3640, 21320]) add(`laden-${t}`, { t0: 0, box }, t)
  for (const t of [0, 1320, 5000]) add(`rust-${t}`, { t0: 0, reduce: true, box }, t)
  for (const t of [1200, 1500, 1640, 1700, 1880, 2000, 2120, 2200, 2300, 2420, 2479, 2480, 2600]) add(`klaar-${t}`, { t0: 0, doneAt: 1200, box, targets }, t)
  for (const t of [3100, 3640, 3800, 4120, 4600]) add(`klaar-stil-${t}`, { t0: 0, doneAt: 3100, box, targets: { rule: targets.rule, rows: targets.rows.slice(0, 1) } }, t)
  for (const t of [300, 301]) add(`vroeg-${t}`, { t0: 0, doneAt: 300, box, targets }, t)
  for (const t of [1200, 1640, 1800, 1960]) add(`vervaag-${t}`, { t0: 0, doneAt: 1200, box, targets: null }, t)
  for (const t of [2600, 3640, 3800, 3900, 4040]) add(`fout-${t}`, { t0: 0, failAt: 2600, box }, t)
  for (const t of [5000, 5100, 5200]) add(`rust-klaar-${t}`, { t0: 0, reduce: true, doneAt: 5000, box, targets }, t)
  for (const t of [5000, 5100, 5200]) add(`rust-fout-${t}`, { t0: 0, reduce: true, failAt: 5000, box }, t)
  const settle = [0, 100, 359, 360, 999, 1000, 1200, 1639, 1640, 2999, 3000, 3100, 19000].map((t) => [t, settleAt(t)])
  const curves = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((x) => [x, E.inOut(x), E.glide(x), E.ease(x)].map((v) => Math.round(v * 1e6) / 1e6))
  const text = JSON.stringify({ cases, settle, curves }, null, 1) + '\n'
  const file = new URL('./fixtures/load-lines.json', import.meta.url)
  if (process.env.LOAD_LINES_FIXTURE_WRITE || !existsSync(file)) writeFileSync(file, text)
  assert.equal(readFileSync(file, 'utf8'), text, 'tests/fixtures/load-lines.json is bij (LOAD_LINES_FIXTURE_WRITE=1 npm test)')
})
