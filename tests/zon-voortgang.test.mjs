import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kopSun, KOP } from '../src/lib/sun.js'
import { leesStand, stapVan, leesWaarde } from '../src/lib/leesstand.js'

const root = new URL('../', import.meta.url)
const read = (p) => readFileSync(new URL(p, root), 'utf8')
const near = (a, b, e = 1e-3) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`)

test('zon-voortgang: web en app rekenen dezelfde standen (tests/fixtures/zon-voortgang.json)', () => {
  const fx = JSON.parse(read('tests/fixtures/zon-voortgang.json'))
  assert.deepEqual(fx.kader, KOP)
  assert.ok(fx.gevallen.length >= 20)
  for (const c of fx.gevallen) {
    const v = kopSun(c.p, c.n)
    near(v.cy, c.cy)
    near(v.gloed, c.gloed)
  }
  // De app tekent hetzelfde kader: 44 × 26, horizon 20, zon r 8, en leest dezelfde gevallen.
  const swift = read('ios/Hoot/Views/EditionView.swift')
  assert.match(swift, /struct EditionSun: View/)
  assert.match(swift, /static let kader = \(w: 44\.0, h: 26\.0, hz: 20\.0, r: 8\.0, cx: 22\.0, hoog: 9\.0, onder: 30\.0\)/)
  assert.match(read('ios/HootTests/ZonVoortgangTests.swift'), /zon-voortgang\.json/)
})

test('zon-voortgang: de leeslijn telt de verhalen die je voorbij bent', () => {
  const starts = [100, 500, 900, 1300]
  const geo = { max: 1600, kop: 50, hoogte: 800, starts, einde: 1900 }
  assert.equal(leesStand({ ...geo, top: 0 }), 0) // bovenaan
  const p1 = leesStand({ ...geo, top: 300 })
  assert.ok(p1 > 0 && p1 < 2, `onderweg: ${p1}`)
  assert.equal(leesStand({ ...geo, top: 1600 }), 4) // helemaal onderaan: het einde
  let vorige = -1
  for (let top = 0; top <= 1600; top += 20) {
    const p = leesStand({ ...geo, top })
    assert.ok(p >= vorige, `nooit terug bij ${top}`)
    vorige = p
  }
  // Twee verhalen naast elkaar (breed, paren): even hoog, geen deling door nul.
  const paren = leesStand({ ...geo, starts: [100, 500, 500, 900], top: 700 })
  assert.ok(Number.isFinite(paren))
  // Geen scrollruimte: alles staat in beeld, dus alles is gezien.
  assert.equal(leesStand({ top: 0, max: 0, kop: 0, hoogte: 2000, starts, einde: 1900 }), 4)
})

test('zon-voortgang: de hele stap en wat VoiceOver hoort', () => {
  assert.equal(stapVan(0, 10), 0)
  assert.equal(stapVan(3.96, 10), 4)
  assert.equal(stapVan(3.5, 10), 3)
  assert.equal(stapVan(12, 10), 10)
  assert.equal(leesWaarde(4, 10, 'Je bent bij.'), '4 van 10 gelezen')
  assert.equal(leesWaarde(10, 10, 'Je bent bij.'), 'Je bent bij.')
  assert.equal(leesWaarde(7, 7, null), '7 van 7 gelezen')
})

test('zon-voortgang: alleen scrollen beweegt de zon, Minder beweging fadet per verhaal', () => {
  const lib = read('src/lib/leesstand.js')
  assert.match(lib, /addEventListener\('scroll', plan, \{ passive: true \}\)/)
  assert.match(lib, /requestAnimationFrame\(meet\)/)
  assert.doesNotMatch(lib, /setInterval/)
  assert.match(lib, /STILL_MS \/ 2/)
  const css = read('src/styles/zon-voortgang.css')
  assert.match(css, /calc\(var\(--dur-minder\) \/ 2\)/)
  assert.match(css, /\.edbar \{[^}]*position: sticky/)
  const ed = read('src/views/Edition.jsx')
  assert.match(ed, /<KopSun n=\{count \|\| EDITION_SIZE\} \/>/)
  assert.match(ed, /data-leesstand/)
  assert.doesNotMatch(ed, /KopSun slot=/) // de hoogte draagt geen dagdeel meer
  // Geladen vóór Minder beweging (dat bestand komt als laatste).
  const main = read('src/main.jsx')
  assert.ok(main.indexOf('zon-voortgang.css') > 0 && main.indexOf('zon-voortgang.css') < main.indexOf('minder-beweging.css'))
})

test('zon-voortgang: de zon zweeft rustig naar de stand (keuze 13 nov), web en app gelijk', async () => {
  const { volgStap, ZON_VOLG_MS } = await import('../src/lib/leesstand.js')
  assert.equal(volgStap(0, 5, 0), 0) // geen tijd: niet verspringen
  const na1 = volgStap(0, 5, ZON_VOLG_MS)
  assert.ok(na1 > 3 && na1 < 3.4) // na één tijdconstante ongeveer 63 procent
  assert.ok(Math.abs(volgStap(0, 5, 5 * ZON_VOLG_MS) - 5) < 0.05) // daarna staat hij stil
  assert.ok(volgStap(5, 0, 16) < 5 && volgStap(5, 0, 16) > 4.5) // één frame: een klein stukje, geen sprong
  const lib = read('src/lib/leesstand.js')
  assert.match(lib, /if \(!still\) \{\s*shown\.set\(svg, null\)\s*zweefZon/) // Minder beweging zweeft niet
  const ios = read('ios/Hoot/Views/EditionView.swift')
  assert.match(ios, /\.animation\(still \? nil : Self\.volg, value: p\)/)
  assert.match(ios, /struct Tekening: View, Animatable/)
})
