// Placeholderbeeld (build 46, tien sinds placeholders-12, achttien sinds placeholders-18): deterministisch per artikel, nooit twee
// gelijke buren en nooit twee keer dezelfde set na elkaar.
// Dezelfde gevallen draaien in de app (ios/HootTests/PlaceholderTests.swift).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fnv1a, placeholderBase, placeholderPlan, placeholderSet, placeholderSvg, PLACEHOLDERS, PALETTES, PLACEHOLDER_COUNT, PLACEHOLDER_SHIFT } from '../shared/placeholder.mjs'

const root = new URL('../', import.meta.url)
const fixture = JSON.parse(readFileSync(new URL('tests/fixtures/placeholder.json', root), 'utf8'))

test('placeholder: fnv1a(id) mod 18, op web en in de app dezelfde som', () => {
  assert.equal(fnv1a(''), 0x811c9dc5)
  assert.equal(fnv1a('a'), 0xe40c292c) // bekende FNV-1a-waarde
  for (const { id, fnv1a: h, beeld } of fixture.base) {
    assert.equal(fnv1a(id), h, id)
    assert.equal(placeholderBase(id) + 1, beeld, id)
  }
  // Alle achttien komen voor.
  assert.equal(new Set(fixture.base.map((b) => b.beeld)).size, PLACEHOLDER_COUNT)
})

// Twee beeldloze buren: nooit hetzelfde beeld, nooit dezelfde set.
function buren(rows, plan, naam) {
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].bare || !rows[i - 1].bare) continue
    const a = plan.get(rows[i - 1].id), b = plan.get(rows[i].id)
    assert.notEqual(b, a, `${naam}: rij ${i} hetzelfde beeld`)
    assert.notEqual(placeholderSet(b), placeholderSet(a), `${naam}: rij ${i} dezelfde set`)
  }
}

test('placeholder: twee beeldloze rijen direct na elkaar nooit hetzelfde beeld en nooit dezelfde set; een rij met beeld breekt de reeks', () => {
  for (const l of fixture.lijsten) {
    const plan = placeholderPlan(l.rows)
    assert.deepEqual(Object.fromEntries([...plan].map(([k, v]) => [k, v + 1])), l.beelden, l.naam)
    buren(l.rows, plan, l.naam)
  }
  // Drie verder valt altijd in een andere set.
  for (let k = 0; k < PLACEHOLDER_COUNT; k++) assert.notEqual(placeholderSet((k + PLACEHOLDER_SHIFT) % PLACEHOLDER_COUNT), placeholderSet(k), `beeld ${k + 1}`)
  // Willekeurige lijsten: de regel houdt altijd.
  for (let t = 0; t < 200; t++) {
    const rows = Array.from({ length: 30 }, (_, i) => ({ id: `r${t}-${i}`, bare: (t * 31 + i * 7) % 5 !== 0 }))
    const plan = placeholderPlan(rows)
    buren(rows, plan, `lijst ${t}`)
  }
})

test('placeholder: een lange reeks beeldloze rijen: nooit twee gelijke beelden of sets naast elkaar, alle achttien door elkaar', () => {
  const rows = Array.from({ length: 5000 }, (_, i) => ({ id: `https://www.nrc.nl/nieuws/2026/11/05/stuk-${i}-a${(i * 7919) % 1000}`, bare: true }))
  const plan = placeholderPlan(rows)
  buren(rows, plan, 'lange reeks')
  const telling = Array(PLACEHOLDER_COUNT).fill(0)
  for (const k of plan.values()) telling[k]++
  // Elk beeld komt geregeld voor (gemiddeld 5,6 procent): geen beeld onder de 2,5 of boven de 7,5 procent.
  for (const [k, n] of telling.entries()) assert.ok(n > 0.025 * rows.length && n < 0.075 * rows.length, `beeld ${k + 1}: ${n}`)
  // En het is geen vast patroon: de reeks herhaalt zich niet met een korte periode.
  const seq = rows.map((r) => plan.get(r.id))
  for (let p = 1; p <= 24; p++) assert.ok(seq.some((v, i) => i >= p && v !== seq[i - p]), `periode ${p}`)
})

test('placeholder: geen dagdeel in tekening of code; decoratie (aria-hidden); de zon van beeld 2 klein', () => {
  const files = ['shared/placeholder.mjs', 'scripts/placeholders.mjs', 'src/components/Beeld.jsx', 'src/placeholder.css', 'ios/Hoot/Views/Beeldloos.swift', 'ios/Hoot/Views/PlaceholderBeelden.swift']
  for (const f of files) assert.doesNotMatch(readFileSync(new URL(f, root), 'utf8'), /ochtend|middag|avond|morning|evening/i, f)
  for (let n = 1; n <= PLACEHOLDERS.length; n++) {
    for (const theme of ['licht', 'donker', 'nacht']) {
      for (const klein of [false, true]) {
        const svg = placeholderSvg(n, theme, klein)
        assert.match(svg, /aria-hidden="true"/)
        assert.doesNotMatch(svg, /role="img"|aria-label|<text/)
        assert.match(svg, /preserveAspectRatio="xMidYMid slice"/)
      }
    }
  }
  const zon = PLACEHOLDERS[1].groot.shapes.find((s) => s.t === 'circle')
  assert.equal(zon.r, 16)
  assert.equal(zon.fill, 'sun')
  assert.match(readFileSync(new URL('ios/Hoot/Views/Beeldloos.swift', root), 'utf8'), /accessibilityHidden\(true\)/)
})

test('placeholder: achttien beelden, tien in vijf sets en acht eenlingen, elk met een kleine tekening (96 × 64), even groot als de rest', () => {
  assert.equal(PLACEHOLDERS.length, 18)
  assert.equal(PLACEHOLDER_COUNT, PLACEHOLDERS.length)
  assert.deepEqual(PLACEHOLDERS.map((p) => p.family), ['zon', 'zon', 'zon', 'iris', 'iris', 'iris', 'lijn', 'raster', 'raster', 'stapel', 'kop', 'vouw', 'baan', 'eclips', 'walsen', 'zetsel', 'rij', 'koepels'])
  // Zonnestand: de zon is altijd een vol vlak in rood, ook in beeld 3 (keuze Alex), groot en klein.
  for (const n of [1, 2, 3]) for (const L of [PLACEHOLDERS[n - 1].groot, PLACEHOLDERS[n - 1].klein]) {
    const zon = L.shapes.find((s) => s.t === 'circle')
    assert.equal(zon.fill, 'sun', `beeld ${n}`)
    assert.equal(zon.stroke, undefined, `beeld ${n}`)
  }
  for (const [i, p] of PLACEHOLDERS.entries()) {
    assert.ok(p.klein, `beeld ${i + 1} heeft een kleine tekening`)
    assert.deepEqual([p.klein.w, p.klein.h], [96, 64], `beeld ${i + 1} klein`)
    assert.equal(p.groot.w / p.groot.h, 2, `beeld ${i + 1} groot is 2:1`)
    for (const theme of ['licht', 'donker', 'nacht']) {
      const c = PALETTES[p.family][theme]
      for (const s of [...p.groot.shapes, ...p.klein.shapes]) for (const k of ['fill', 'stroke']) if (s[k]) assert.ok(c[s[k]], `beeld ${i + 1} ${theme}: kleur ${s[k]}`)
    }
  }
  // Horizonlijnen: alleen lijnen, geen rood. Raster en De stapel: precies één rood accent.
  const rood = (p) => [...p.groot.shapes].filter((s) => s.fill === 'sun' || s.stroke === 'sun').length
  for (const n of [7]) assert.ok(PLACEHOLDERS[n - 1].groot.shapes.every((s) => s.t === 'line'), `beeld ${n}`)
  for (const n of [8, 9, 10]) assert.equal(rood(PLACEHOLDERS[n - 1]), 1, `beeld ${n}`)
  // Ronde 2 (11 tot 18): precies één rood accent, groot en klein.
  const roodIn = (L) => L.shapes.filter((s) => s.fill === 'sun' || s.stroke === 'sun').length
  for (let n = 11; n <= 18; n++) for (const L of [PLACEHOLDERS[n - 1].groot, PLACEHOLDERS[n - 1].klein]) assert.equal(roodIn(L), 1, `beeld ${n}`)
  // Geen reuzenvormen (Vouw had een cirkel van r 4000 als rechte vouw; nu een brede rechte lijn): elke
  // cirkel en lijn blijft binnen een paar keer het beeld, zodat web en SwiftUI hem exact en snel tekenen.
  for (const [i, p] of PLACEHOLDERS.entries()) for (const L of [p.groot, p.klein]) for (const s of L.shapes) {
    if (s.t === 'circle') assert.ok(s.r <= 3 * L.w, `beeld ${i + 1}: cirkel r ${s.r}`)
    if (s.t === 'line') for (const v of [s.x1, s.x2]) assert.ok(Math.abs(v) <= 3 * L.w, `beeld ${i + 1}: lijn ${v}`)
  }
  // Vouw: de vouw is recht en onder 45 graden.
  for (const L of [PLACEHOLDERS[11].groot, PLACEHOLDERS[11].klein]) {
    const v = L.shapes.find((s) => s.t === 'line')
    assert.ok(Math.abs(v.x2 - v.x1 - (v.y2 - v.y1)) < 0.02, 'vouw onder 45 graden')
    assert.ok(v.sw > 0 && !v.fixed && v.stroke === 'bg')
    assert.match(placeholderSvg(12, 'licht', L === PLACEHOLDERS[11].klein), new RegExp(`stroke-width="${v.sw}"`))
  }
  // Rood is Rubrica in Licht, de lichtere tinten uit tokens.json in Donker en Nacht.
  for (const fam of ['zon', 'iris', 'raster', 'stapel', 'kop', 'vouw', 'baan', 'eclips', 'walsen', 'zetsel', 'rij', 'koepels']) assert.deepEqual([PALETTES[fam].licht.sun, PALETTES[fam].donker.sun, PALETTES[fam].nacht.sun], ['#9A3324', '#EC7A70', '#DF8276'], fam)
})

test('placeholder: SVG, CSS en de SwiftUI-tabel zijn bij (scripts/placeholders.mjs --check)', () => {
  const r = spawnSync(process.execPath, ['scripts/placeholders.mjs', '--check'], { cwd: root, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.match(readFileSync(new URL('src/main.jsx', root), 'utf8'), /import '\.\/placeholder\.css'/)
})
