// "Tien en de bubbel · je eerste Editie" (Hoot-design, woensdag-2026-11-04/tien-concept, spec-rij en
// tijdlijn): maten, tijden, Traag, Fout en Verminder beweging, vastgelegd op de rekensom die web en iOS
// delen. Schrijft ook tests/fixtures/tien.json: dezelfde invoer en uitkomst, die
// ios/HootTests/TienTests.swift naloopt (web = app, tot op 0,01 pt).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { TIEN, TEXT, CURVE, E, plan, stillPlan, frame, block, nextTien } from '../src/lib/tien.js'

const near = (a, b, eps = 0.01, msg = '') => assert.ok(Math.abs(a - b) <= eps, `${msg} ${a} ≠ ${b}`)
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('maten uit de spec-rij: vlak 240 × 128, kring Ø 96, punt Ø 8, haarlijn 1, uitstap 24', () => {
  assert.equal(TIEN.w, 240); assert.equal(TIEN.h, 128); assert.equal(TIEN.r, 48); assert.equal(TIEN.dot, 8)
  assert.equal(TIEN.hair, 1); assert.equal(TIEN.out - TIEN.r, 24); assert.equal(TIEN.iris, 200)
  // De zin staat 24 onder de kring: 16 onder het vlak.
  assert.equal(TIEN.h - (TIEN.cy + TIEN.r) + TIEN.gap, 24)
  assert.deepEqual(CURVE, { glide: [0.2, 0.8, 0.2, 1], iris: [0.6, 0, 0.2, 1], ease: [0.2, 0.7, 0.2, 1] })
  // Punt k op 36° × k, met de klok mee vanaf boven.
  const f = frame({ R: 0 }, 1600)
  near(f.dots[0].x, 120); near(f.dots[0].y, 72 - 48)
  near(f.dots[1].x, 120 + 48 * Math.sin(Math.PI / 5)); near(f.dots[1].y, 72 - 48 * Math.cos(Math.PI / 5))
  near(f.dots[5].y, 72 + 48)
})

test('Snel: punten 200–1420, kring sluit 1420–1680, één eruit tot 1960, stil tot 2360, iris tot 2920, Editie vanaf 2640', () => {
  const p = plan(0)
  assert.deepEqual(p.a, [200, 320, 440, 560, 680, 800, 920, 1040, 1160, 1280])
  assert.equal(p.close, 1420); assert.equal(p.merge, 1680); assert.equal(p.open, 2360); assert.equal(p.ed, 2640)
  // Halverwege een punt: 4 pt van buiten naar zijn plek.
  const half = frame({ R: 0 }, 200 + 70)
  near(half.dots[0].o, E.glide(0.5)); near(72 - half.dots[0].y, 48 + 4 * (1 - E.glide(0.5)))
  assert.equal(frame({ R: 0 }, 1420).ring.shut, 0)
  near(frame({ R: 0 }, 1560).ring.shut, 1); near(frame({ R: 0 }, 1680).ring.deg, 360)
  assert.equal(frame({ R: 0 }, 1000).tick, 1420) // één zachte tik als de kring sluit
  // Eén stapt eruit: negen weg, punt 10 op r 72 en rood.
  const out = frame({ R: 0 }, 1960)
  for (let k = 0; k < 9; k++) near(out.dots[k].o, 0)
  near(out.dots[9].red, 1); near(out.dots[9].o, 1)
  near(Math.hypot(out.dots[9].x - 120, out.dots[9].y - 72), 72)
  // Stil: niets beweegt.
  assert.deepEqual(frame({ R: 0 }, 2000), { ...frame({ R: 0 }, 2300), line1: frame({ R: 0 }, 2000).line1 })
  assert.equal(frame({ R: 0 }, 2100).say, TEXT.ready)
  // De bubbel gaat open: r 48 → 200 in 560, weg na 400; de rode punt vervaagt als laatste (vanaf 2560, 140).
  near(frame({ R: 0 }, 2360 + 560).ring.r, 200); near(frame({ R: 0 }, 2760).ring.o, 0)
  near(frame({ R: 0 }, 2560).dots[9].o, 1); near(frame({ R: 0 }, 2700).dots[9].o, 0)
  assert.equal(frame({ R: 0 }, 2900).done, false); assert.equal(frame({ R: 0 }, 2920).done, true)
  // De zin: in vanaf 120 (200), weg met de iris (200).
  near(frame({ R: 0 }, 320).line1, 1); near(frame({ R: 0 }, 2560).line1, 0)
  // De Editie: blokken 200 ms, 80 ms na elkaar, 8 pt omhoog; laatste van vijf ≈ 3,2 s na de tik.
  assert.equal(frame({ R: 0 }, 2000).show, 2640)
  assert.deepEqual(block(0, 2640, 2640), { o: 0, y: 8 })
  near(block(0, 2640, 2840).o, 1); near(block(4, 2640, 2640 + 320 + 200).o, 1)
  near(block(4, 2640, 2640 + 320 + 100).y, 8 * (1 - E.ease(0.5)))
})

test('Traag: punt 1–9 volgen de bronnen (600), punt 10 wacht, de lege plek ademt, na 6 s de zin', () => {
  const p = plan(9000)
  assert.deepEqual(p.a.slice(0, 9), [200, 800, 1400, 2000, 2600, 3200, 3800, 4400, 5000])
  assert.equal(p.a[9], 9000)
  // Onbekend (nog aan het laden) en later bekend: wat er al stond, verandert niet (oorzakelijk).
  const loading = plan(null)
  for (let t = 0; t < 7000; t += 50) {
    const a = frame({ R: null }, t), b = frame({ R: 7000 }, t)
    assert.deepEqual(a.dots.map((d) => d.o), b.dots.map((d) => d.o), `t=${t}`)
  }
  assert.equal(loading.a[9], Infinity)
  // De lege plek: ademt in 2750 ms, alleen terwijl punt 10 wacht.
  const g1 = frame({ R: null }, 5140 + 400).ghost, g2 = frame({ R: null }, 5140 + 400 + 1375).ghost
  assert.ok(g1.o > 0 && g2.o > g1.o); assert.equal(g1.red, 0)
  near(Math.hypot(g1.x - 120, g1.y - 72), 48)
  assert.equal(frame({ R: 0 }, 1300).ghost.o, 0) // Snel: geen lege plek
  assert.equal(frame({ R: null }, 5900).line2, 0); near(frame({ R: null }, 6200).line2, 1)
  near(frame({ R: 9000 }, 9200).line2, 0)
  // Klaar wordt het gewoon de rest van de tijdlijn.
  assert.equal(p.close, 9140); assert.equal(p.open, 9140 + 260 + 280 + 400)
  // Klaar halverwege: de rest volgt snel.
  assert.deepEqual(plan(1000).a.slice(0, 4), [200, 800, 1000, 1120])
})

test('Fout: punten terug in omgekeerde volgorde (140, om de 80), lijn terug 400, dan "Geen verbinding" in 200, geen rood', () => {
  const st = { R: null, F: 3500 }
  const p = plan(null, 3500)
  assert.equal(p.last, 5); assert.equal(p.a[9], Infinity); assert.equal(p.a[6], Infinity)
  // Punt 6 (de laatste) gaat eerst, punt 1 als laatste: 3500 + 80 × 5.
  near(frame(st, 3500 + 140).dots[5].o, 0); near(frame(st, 3500 + 140).dots[0].o, 1)
  near(frame(st, 3900 + 140).dots[0].o, 0)
  near(frame(st, 3500 + 400).ring.deg, 0)
  assert.equal(frame(st, 3500 + 480).err, 0); near(frame(st, 3500 + 680).err, 1)
  assert.equal(frame(st, 4000).say, TEXT.fail)
  for (let t = 3500; t < 4500; t += 20) assert.ok(frame(st, t).dots.every((d) => d.red === 0), 'geen rood')
  assert.equal(frame(st, 3500 + 680).done, true)
  // Opnieuw: laden na een fout begint een nieuwe ronde vanaf nu.
  assert.deepEqual(nextTien({ t0: 0, R: null, F: 3500 }, { loading: true, failed: false }, 9000), { t0: 9000, R: null, F: null })
  // Komt de Editie toch nog zonder opnieuw te laden, dan speelt het ook opnieuw (niets blijft verborgen).
  assert.deepEqual(nextTien({ t0: 0, R: null, F: 3500 }, { loading: false, failed: false }, 9000), { t0: 9000, R: null, F: null })
  assert.equal(nextTien({ t0: 0, R: null, F: 3500 }, { loading: false, failed: true }, 9000).F, 3500)
})

test('Verminder beweging: stilstaande gesloten kring in inkt 3; klaar: 350 naar het eindbeeld, 800 stil, 350 naar de Editie', () => {
  const st = { R: 0, reduce: true }
  const s = stillPlan(0)
  assert.equal(s.ready, 600); assert.equal(s.out, 600 + 350 + 800)
  const wait = frame(st, 300)
  near(wait.ring.deg, 360); assert.equal(wait.ring.r, 48); assert.equal(wait.ring.shut, 0)
  assert.ok(wait.dots.every((d) => d.o === 1 && d.shut === 0 && d.red === 0)); assert.equal(wait.ghost.o, 0)
  const end = frame(st, 950)
  near(end.ring.shut, 1); assert.ok(end.dots.every((d) => d.o === 0)); near(end.ghost.o, 1); assert.equal(end.ghost.red, 1)
  near(Math.hypot(end.ghost.x - 120, end.ghost.y - 72), 72)
  assert.deepEqual(frame(st, 1000).dots, frame(st, 1700).dots) // stil
  assert.equal(end.show, 1750)
  assert.deepEqual(block(3, 1750, 1750 + 175, true), { o: 0.5, y: 0 }) // alle blokken tegelijk, niets beweegt
  near(frame(st, 2100).ghost.o, 0); assert.equal(frame(st, 2100).done, true)
  // Fout: vervagen, dan het foutblok.
  const f = frame({ F: 2000, reduce: true }, 2350)
  near(f.ring.o, 0); assert.equal(f.err, 0); near(frame({ F: 2000, reduce: true }, 2700).err, 1)
})

test('VoiceOver en de zinnen: zoals het concept', () => {
  assert.equal(TEXT.busy, 'Hoot stelt je eerste Editie samen')
  assert.equal(TEXT.ready, 'Je eerste Editie staat klaar. Tien verhalen, één buiten je bubbel.')
  assert.equal(TEXT.line1, 'Je eerste Editie'); assert.equal(TEXT.line2, 'Even kijken bij je bronnen')
  assert.equal(frame({ R: 0 }, 100).say, TEXT.busy)
  // Huisregel: geen kloktijden in wat je ziet of hoort.
  for (const v of Object.values(TEXT)) assert.doesNotMatch(v, /\d{1,2}[:.]\d{2}|\b\d{1,2} uur\b/)
})

test('alleen de eerste keer: App start het bij het afronden van het eerste welkom, het welkom vervaagt in 200', async () => {
  const app = src('../src/App.jsx'), ed = src('../src/views/Edition.jsx'), wel = src('../src/views/Welcome.jsx')
  assert.match(app, /if \(!prefs\.onboarded\) setTienStart\(/)
  assert.match(app, /tien=\{tienStart\}/)
  assert.match(ed, /useLoadLines\(loading && !tien\.active, ready\)/) // geen laadstrepen ernaast
  assert.match(wel, /crossPlan\(first\)/)
  const { crossPlan } = await import('../src/lib/motion.js')
  assert.deepEqual(crossPlan(true), { fade: 200, easing: 'ease-in-out' })
  assert.deepEqual(crossPlan(), { fade: 450, easing: 'ease-in-out' })
})

// De fixture voor iOS: Snel, Traag (nog laden en klaar), Fout en Verminder beweging, op vaste momenten.
test('schrijft tests/fixtures/tien.json voor de app', () => {
  const runs = [
    ['snel', { R: 0 }], ['halverwege', { R: 1000 }], ['traag', { R: 9000 }], ['laden', { R: null }],
    ['fout', { F: 3500 }], ['fout-vooraf', { F: 0 }], ['stil', { R: 0, reduce: true }], ['stil-traag', { R: 7000, reduce: true }], ['stil-fout', { F: 2000, reduce: true }],
  ]
  const times = [0, 100, 210, 270, 500, 900, 1300, 1450, 1560, 1700, 1800, 1960, 2200, 2400, 2500, 2600, 2700, 2900, 3000, 3600, 3700, 4200, 5300, 6100, 7000, 7300, 9100, 9300, 9800, 10100, 10400]
  const num = (v) => (v === Infinity ? 1e9 : v == null ? -1 : Math.round(v * 1000) / 1000)
  const cases = []
  for (const [name, st] of runs) {
    for (const t of times) {
      const f = frame(st, t)
      cases.push({
        name: `${name}@${t}`, st: { R: st.R ?? null, F: st.F ?? null, reduce: !!st.reduce }, t,
        f: {
          ring: [f.ring.r, f.ring.deg, f.ring.shut, f.ring.o].map(num),
          dots: f.dots.map((d) => [d.x, d.y, d.o, d.shut, d.red].map(num)),
          ghost: [f.ghost.x, f.ghost.y, f.ghost.o, f.ghost.red].map(num),
          line1: num(f.line1), line2: num(f.line2), err: num(f.err), show: num(f.show), tick: num(f.tick), say: f.say, done: f.done,
        },
      })
    }
  }
  const blocks = []
  for (const i of [0, 1, 2, 5]) for (const t of [2600, 2700, 2800, 2900, 3100]) for (const r of [false, true]) blocks.push([i, 2640, t, r ? 1 : 0, ...Object.values(block(i, 2640, t, r)).map(num)])
  const curves = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((x) => [x, E.glide(x), E.iris(x), E.ease(x)])
  const out = { cases, blocks, curves }
  writeFileSync(new URL('./fixtures/tien.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
  assert.ok(cases.length > 200)
})
