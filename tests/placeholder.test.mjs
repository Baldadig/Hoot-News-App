// Placeholderbeeld (build 46, tien sinds placeholders-12, achttien sinds placeholders-18): deterministisch per artikel, nooit twee
// gelijke buren en nooit twee keer dezelfde set na elkaar.
// Dezelfde gevallen draaien in de app (ios/HootTests/PlaceholderTests.swift).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fnv1a, placeholderBase, placeholderPlan, placeholderSet, placeholderSvg, PLACEHOLDERS, PALETTES, PLACEHOLDER_COUNT, PLACEHOLDER_SHIFT, PLACEHOLDER_UIT, PLACEHOLDER_KEUZE } from '../shared/placeholder.mjs'

const root = new URL('../', import.meta.url)
const fixture = JSON.parse(readFileSync(new URL('tests/fixtures/placeholder.json', root), 'utf8'))

test('placeholder: fnv1a(id) mod 18, op web en in de app dezelfde som', () => {
  assert.equal(fnv1a(''), 0x811c9dc5)
  assert.equal(fnv1a('a'), 0xe40c292c) // bekende FNV-1a-waarde
  for (const { id, fnv1a: h, beeld } of fixture.base) {
    assert.equal(fnv1a(id), h, id)
    assert.equal(placeholderBase(id) + 1, beeld, id)
  }
  // Alle zestien die gekozen worden komen voor, beeld 14 (Eclips) en 15 (Walsen), uit de reeks, nooit.
  assert.equal(new Set(fixture.base.map((b) => b.beeld)).size, PLACEHOLDER_KEUZE.length)
  assert.ok(fixture.base.every((b) => b.beeld !== 14 && b.beeld !== 15))
})

// Uit de reeks: beeld 14 (Eclips; 14 november, Alex: "Deze image mag er wel uit.") en beeld 15 (Walsen:
// twee rollen en een vel dat in losse vellen uiteenvalt; 15 november, Alex: "Walsen mag eruit. In zijn
// geheel."). De rest blijft precies zoals het was.
test('placeholder: beeld 14 (Eclips) en 15 (Walsen) worden nooit meer gekozen, op web en in de app (fixture.uit)', () => {
  assert.deepEqual(PLACEHOLDER_UIT, [13, 14])
  assert.equal(PLACEHOLDERS[13].family, 'eclips')
  assert.equal(PLACEHOLDERS[14].family, 'walsen')
  assert.deepEqual(fixture.uit, [14, 15])
  assert.equal(PLACEHOLDER_KEUZE.length, 16)
  assert.ok(!PLACEHOLDER_KEUZE.includes(13) && !PLACEHOLDER_KEUZE.includes(14))
  const ids = Array.from({ length: 40000 }, (_, i) => `https://www.washingtonpost.com/world/2026/11/14/stuk-${i}/`)
  for (const id of ids) assert.ok(!PLACEHOLDER_UIT.includes(placeholderBase(id)), id)
  for (let t = 0; t < 300; t++) {
    const rows = Array.from({ length: 40 }, (_, i) => ({ id: `wapo-${t}-${i}`, bare: (t + i * 3) % 6 !== 0 }))
    for (const k of placeholderPlan(rows).values()) assert.ok(!PLACEHOLDER_UIT.includes(k), `lijst ${t}: beeld ${k + 1}`)
  }
  // De kop twee keer na elkaar: drie verder is Eclips, dus nog eens drie, naar De rij.
  const kop = Array.from({ length: 2000 }, (_, i) => `kop-${i}`).filter((id) => placeholderBase(id) === 10).slice(0, 2)
  assert.deepEqual([...placeholderPlan(kop.map((id) => ({ id, bare: true }))).values()], [10, 16])
  // Vouw twee keer na elkaar: drie verder is Walsen, dus nog eens drie, naar Koepels.
  const vouw = Array.from({ length: 2000 }, (_, i) => `vouw-${i}`).filter((id) => placeholderBase(id) === 11).slice(0, 2)
  assert.deepEqual([...placeholderPlan(vouw.map((id) => ({ id, bare: true }))).values()], [11, 17])
  // Elk paar buren uit de zestien: de tweede wordt nooit een beeld uit de reeks, nooit hetzelfde beeld en
  // nooit dezelfde set als de eerste.
  const perBeeld = new Map(PLACEHOLDER_KEUZE.map((k) => [k, []]))
  for (let i = 0; [...perBeeld.values()].some((l) => l.length < 2); i++) {
    const id = `paar-${i}`, l = perBeeld.get(placeholderBase(id))
    if (l.length < 2) l.push(id)
  }
  for (const a of PLACEHOLDER_KEUZE) {
    for (const b of PLACEHOLDER_KEUZE) {
      const rows = [{ id: perBeeld.get(a)[0], bare: true }, { id: perBeeld.get(b)[1], bare: true }]
      const k = placeholderPlan(rows).get(rows[1].id)
      assert.ok(!PLACEHOLDER_UIT.includes(k), `${a + 1} dan ${b + 1}: beeld ${k + 1}`)
      assert.notEqual(k, a, `${a + 1} dan ${b + 1}`)
      assert.notEqual(placeholderSet(k), placeholderSet(a), `${a + 1} dan ${b + 1}`)
    }
  }
})

test('placeholder: de rest blijft gelijk: elk stuk dat geen Eclips of Walsen had, houdt zijn beeld; de verdeling over de zestien is eerlijk', () => {
  const N = 51000
  const telling = Array(PLACEHOLDER_COUNT).fill(0)
  let verhuisd = 0
  for (let i = 0; i < N; i++) {
    const id = `nos:https://nos.nl/artikel/${i * 31 + 7}`
    const oud = fnv1a(id) % PLACEHOLDER_COUNT, nu = placeholderBase(id)
    if (!PLACEHOLDER_UIT.includes(oud)) assert.equal(nu, oud, id)
    else verhuisd++
    telling[nu]++
  }
  assert.ok(verhuisd > 0)
  assert.equal(telling[13], 0)
  assert.equal(telling[14], 0)
  // Elk van de zestien rond een zestiende (6,25 procent): tussen 5,6 en 6,9 procent.
  for (const k of PLACEHOLDER_KEUZE) assert.ok(telling[k] > 0.056 * N && telling[k] < 0.069 * N, `beeld ${k + 1}: ${telling[k]}`)
  // Precies: over alle restwaarden van de hash krijgt elk van de zestien even veel (18 · 16 = 288 gevallen,
  // elk beeld 18). Een hash met hash mod 288 = r geeft altijd hetzelfde beeld.
  const exact = Array(PLACEHOLDER_COUNT).fill(0)
  for (let r = 0; r < 18 * 16; r++) {
    const k = r % 18
    exact[PLACEHOLDER_UIT.includes(k) ? PLACEHOLDER_KEUZE[Math.floor(r / 18) % 16] : k]++
  }
  for (const k of PLACEHOLDER_KEUZE) assert.equal(exact[k], 18, `beeld ${k + 1}`)
  // De tekeningen zelf blijven staan, ook die van Eclips en Walsen (de nummers en bestanden van de rest
  // verschuiven niet).
  assert.equal(PLACEHOLDERS.length, 18)
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

test('placeholder: een lange reeks beeldloze rijen: nooit twee gelijke beelden of sets naast elkaar, alle zestien door elkaar', () => {
  const rows = Array.from({ length: 5000 }, (_, i) => ({ id: `https://www.nrc.nl/nieuws/2026/11/05/stuk-${i}-a${(i * 7919) % 1000}`, bare: true }))
  const plan = placeholderPlan(rows)
  buren(rows, plan, 'lange reeks')
  const telling = Array(PLACEHOLDER_COUNT).fill(0)
  for (const k of plan.values()) telling[k]++
  // Elk beeld dat gekozen wordt komt geregeld voor (gemiddeld 6,25 procent): geen onder de 2,5 of boven de
  // 8,5 procent. Beeld 14 en 15 (uit de reeks) nooit.
  for (const [k, n] of telling.entries()) {
    if (PLACEHOLDER_UIT.includes(k)) assert.equal(n, 0, `beeld ${k + 1}`)
    else assert.ok(n > 0.025 * rows.length && n < 0.085 * rows.length, `beeld ${k + 1}: ${n}`)
  }
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
