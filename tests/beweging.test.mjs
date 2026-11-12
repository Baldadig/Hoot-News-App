import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DUR, EASE, STILL_MS } from '../src/lib/motion.js'

// Snel · 3: drie duren en twee curves, web en iOS gelijk; Minder beweging is een fade van 200 ms zonder !important.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/styles.css')
const minder = read('src/styles/minder-beweging.css')
const swift = read('ios/Hoot/Theme/Beweging.swift')

test('de drie duren en twee curves staan in motion.js, styles.css en Beweging.swift gelijk', () => {
  assert.deepEqual(DUR, { kort: 120, gewoon: 240, merk: 700 })
  assert.equal(STILL_MS, 200)
  assert.equal(EASE.bediening, 'cubic-bezier(0.2, 0.8, 0.2, 1)')
  assert.equal(EASE.iris, 'cubic-bezier(0.6, 0, 0.2, 1)')
  for (const [k, v] of [['kort', 120], ['gewoon', 240], ['merk', 700], ['minder', 200]]) {
    assert.match(css, new RegExp(`--dur-${k}: ${v}ms;`), k)
    assert.match(swift, new RegExp(`static let ${k} = ${v / 1000}\\b`), k)
  }
  assert.match(css, /--ease-bediening: cubic-bezier\(0\.2, 0\.8, 0\.2, 1\);/)
  assert.match(css, /--ease-iris: cubic-bezier\(0\.6, 0, 0\.2, 1\);/)
  assert.match(swift, /timingCurve\(0\.2, 0\.8, 0\.2, 1, duration: duur\)/)
  assert.match(swift, /timingCurve\(0\.6, 0, 0\.2, 1, duration: duur\)/)
})

test('de oude losse duren en curves zijn weg uit de CSS en de Swift-code', () => {
  const sheets = ['src/styles.css', ...readdirSync(new URL('../src/styles', import.meta.url)).map((f) => `src/styles/${f}`)].map((p) => [p, read(p)])
  for (const [p, text] of sheets) {
    assert.doesNotMatch(text, /var\(--dur-[123]\)|var\(--ease\)|var\(--ease-glide\)/, p)
    assert.doesNotMatch(text, /cubic-bezier\((?!0\.2, 0\.8, 0\.2, 1\)|0\.6, 0, 0\.2, 1\))/, p)
  }
  const files = []
  const walk = (dir) => { for (const e of readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.swift') && files.push(`${dir}/${e.name}`) }
  walk('ios/Hoot')
  for (const f of files) {
    if (f.endsWith('Theme/Beweging.swift')) continue
    const text = read(f)
    assert.doesNotMatch(text, /\.timingCurve\(0\.[2-9]/, `${f}: curves via Beweging.bediening of Beweging.iris`)
    assert.doesNotMatch(text, /\.easeOut\(duration|\.easeIn\(duration|\.easeInOut\(duration: 0\.[1-4]/, `${f}: duren via Beweging`)
  }
})

test('Minder beweging: geen !important, één fade van 200 ms, de omweg in motion.js is weg', () => {
  assert.doesNotMatch(minder.replace(/\/\*[\s\S]*?\*\//g, ''), /!important/)
  assert.doesNotMatch(css, /animation: none !important;\s*\n\s*transition: none !important;\s*\n\s*scroll-behavior/)
  assert.match(minder, /--dur-kort: var\(--dur-minder\);/)
  assert.match(minder, /@keyframes rise \{\s*from \{\s*opacity: 0;\s*\}\s*\}/)
  assert.match(read('src/main.jsx'), /minder-beweging\.css'\n/)
  const main = read('src/main.jsx')
  assert.ok(main.indexOf("minder-beweging.css") > main.indexOf("popmenu.css"), 'als laatste geladen')
  const motion = read('src/lib/motion.js')
  assert.doesNotMatch(motion, /!important|valt niet onder die regel|omweg|IRIS_BACK|LAND\b/)
  assert.match(swift, /minder = 0\.2/)
})
