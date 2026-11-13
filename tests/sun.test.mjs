import { test } from 'node:test'
import assert from 'node:assert/strict'
import { K, W, H, HZ, CX, LINE, STILL, WATER_PT_S, breathe, halo, introSun, editieSun, kopSun, eindeSun, waterShift, WATER_ROWS } from '../src/lib/sun.js'

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`)

test('kader 168 × 140, k = 1,25, horizon op 72 %', () => {
  assert.equal(W, 168)
  assert.equal(H, 140)
  near(HZ, 100.8)
  assert.equal(CX, 84)
  assert.equal(LINE, 70) // 140 breed
})

test('adem: 0,975 ± 0,075 in 5,5 s', () => {
  near(breathe(0), 0.975)
  near(breathe(5.5 / 4), 1.05)
  near(breathe((5.5 * 3) / 4), 0.9)
  near(breathe(5.5), breathe(0))
})

test('halo: r 20k → 27k, dekking 35 % → 8 %, in 5,5 s heen en weer', () => {
  const a = halo(0)
  near(a.r, 20 * K)
  near(a.o, 0.35)
  const b = halo(5.5 / 2)
  near(b.r, 27 * K)
  near(b.o, 0.08)
  near(halo(5.5).r, a.r)
})

test('de zon is 22k (Stroom en Selectie 12k)', () => {
  near(editieSun(0).r, 22 * K * breathe(0))
  near(introSun(0, 0, true).r, 22 * K)
})

test('intro: komt één keer op in 6 s en staat dan boven de horizon; stil staat hij op', () => {
  near(introSun(0, 0).cy, HZ + 23 * K)
  near(introSun(0, 6).cy, HZ - 10 * K)
  near(introSun(0, 60).cy, HZ - 10 * K)
  near(introSun(0, 0, true).cy, HZ - 10 * K)
  assert.ok(introSun(0, 3).cy < HZ + 23 * K && introSun(0, 3).cy > HZ - 10 * K)
})

test('Editie: 6 s op en 6 s onder', () => {
  near(editieSun(0).cy, HZ - 10 * K + 30 * K) // onder
  near(editieSun(6).cy, HZ - 10 * K) // op
  near(editieSun(12).cy, HZ - 10 * K + 30 * K)
})

test('stilbeelden voor Verminder beweging', () => {
  assert.deepEqual(STILL, { intro: 1.6, editie: 4, stroom: 1.6, selectie: 1.6, einde: 6 })
})

test('de zon in de Editie: de kop toont hoe ver je bent, recht omlaag, zonder dagdeel', () => {
  // Bij 01 hoog, bij het laatste verhaal op de horizon, bij het einde onder met gloed.
  near(kopSun(0, 10).cy, 9)
  near(kopSun(9, 10).cy, 20)
  near(kopSun(10, 10).cy, 30)
  near(kopSun(10, 10).gloed, 1)
  near(kopSun(9, 10).gloed, 0)
  for (let p = 0; p < 10; p += 0.5) assert.ok(kopSun(p + 0.5, 10).cy > kopSun(p, 10).cy, `zakt bij ${p}`)
  for (const p of [0, 3, 9, 10]) near(kopSun(p, 10).cx, 22) // recht omlaag: x blijft
  assert.ok(kopSun(10, 10).cy - 8 > 20, 'bij het einde helemaal onder de horizon')
  assert.equal(kopSun.length, 1, 'de stand en het aantal, geen dagdeel') // n heeft een standaard
})

test('de zon onderaan de Editie: één keer op in 6 s, dan stil; stil bij Verminder beweging', () => {
  near(eindeSun(0).cy, HZ + 23 * K) // achter de horizon
  near(eindeSun(6).cy, HZ - 10 * K)
  near(eindeSun(60).cy, HZ - 10 * K) // blijft staan, geen lus
  near(eindeSun(0, true).cy, HZ - 10 * K) // stil: hij staat op
  assert.ok(eindeSun(3).cy < HZ + 23 * K && eindeSun(3).cy > HZ - 10 * K)
  near(eindeSun(3).r, eindeSun(5.9).r) // geen adem
})

test('water: 9 pt/s naar links, herhaling 140k', () => {
  assert.equal(WATER_PT_S, 9)
  near(waterShift(1) - waterShift(0), 9)
  near(waterShift(0), 0)
  const w = waterShift((140 * K) / 9 + 1) // na een herhaling weer aan het begin, 1 s verder
  near(w, 9)
})

test('water: streepjes binnen de herhaling en de herhaling raakt zichzelf niet', () => {
  for (const row of WATER_ROWS) {
    let end = -Infinity
    for (const [x, w] of row.segs) {
      assert.ok(x > end, 'streepjes raken elkaar niet')
      end = x + w
    }
    // de ronde kappen (2 breed = 1 per kant) van het laatste en het eerste streepje van de volgende herhaling
    assert.ok(end + 2 < 140 + row.segs[0][0], 'laatste streepje raakt het eerste van de herhaling niet')
    assert.ok(end <= 140)
  }
})
