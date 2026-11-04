// Placeholderbeeld (build 46): zes beelden, deterministisch per artikel, nooit twee gelijke buren.
// Dezelfde gevallen draaien in de app (ios/HootTests/PlaceholderTests.swift).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fnv1a, placeholderBase, placeholderPlan, placeholderSvg, PLACEHOLDERS, PLACEHOLDER_COUNT } from '../shared/placeholder.mjs'

const root = new URL('../', import.meta.url)
const fixture = JSON.parse(readFileSync(new URL('tests/fixtures/placeholder.json', root), 'utf8'))

test('placeholder: fnv1a(id) mod 6, op web en in de app dezelfde som', () => {
  assert.equal(fnv1a(''), 0x811c9dc5)
  assert.equal(fnv1a('a'), 0xe40c292c) // bekende FNV-1a-waarde
  for (const { id, fnv1a: h, beeld } of fixture.base) {
    assert.equal(fnv1a(id), h, id)
    assert.equal(placeholderBase(id) + 1, beeld, id)
  }
  // Alle zes komen voor.
  assert.equal(new Set(fixture.base.map((b) => b.beeld)).size, PLACEHOLDER_COUNT)
})

test('placeholder: twee beeldloze rijen direct na elkaar nooit hetzelfde beeld; een rij met beeld breekt de reeks', () => {
  for (const l of fixture.lijsten) {
    const plan = placeholderPlan(l.rows)
    assert.deepEqual(Object.fromEntries([...plan].map(([k, v]) => [k, v + 1])), l.beelden, l.naam)
    for (let i = 1; i < l.rows.length; i++) {
      if (l.rows[i].bare && l.rows[i - 1].bare) assert.notEqual(plan.get(l.rows[i].id), plan.get(l.rows[i - 1].id), l.naam)
    }
  }
  // Willekeurige lijsten: de regel houdt altijd.
  for (let t = 0; t < 200; t++) {
    const rows = Array.from({ length: 30 }, (_, i) => ({ id: `r${t}-${i}`, bare: (t * 31 + i * 7) % 5 !== 0 }))
    const plan = placeholderPlan(rows)
    for (let i = 1; i < rows.length; i++) if (rows[i].bare && rows[i - 1].bare) assert.notEqual(plan.get(rows[i].id), plan.get(rows[i - 1].id))
  }
})

test('placeholder: geen dagdeel in tekening of code; decoratie (aria-hidden); de zon van beeld 2 klein', () => {
  const files = ['shared/placeholder.mjs', 'scripts/placeholders.mjs', 'src/components/Beeld.jsx', 'src/placeholder.css', 'ios/Hoot/Views/Beeldloos.swift', 'ios/Hoot/Views/PlaceholderBeelden.swift']
  for (const f of files) assert.doesNotMatch(readFileSync(new URL(f, root), 'utf8'), /ochtend|middag|avond|morning|evening/i, f)
  for (let n = 1; n <= 6; n++) {
    for (const theme of ['licht', 'donker', 'nacht']) {
      const svg = placeholderSvg(n, theme)
      assert.match(svg, /aria-hidden="true"/)
      assert.doesNotMatch(svg, /role="img"|aria-label/)
      assert.match(svg, /preserveAspectRatio="xMidYMid slice"/)
    }
  }
  const zon = PLACEHOLDERS[1].groot.shapes.find((s) => s.t === 'circle')
  assert.equal(zon.r, 16)
  assert.equal(zon.fill, 'sun')
  assert.match(readFileSync(new URL('ios/Hoot/Views/Beeldloos.swift', root), 'utf8'), /accessibilityHidden\(true\)/)
})

test('placeholder: SVG, CSS en de SwiftUI-tabel zijn bij (scripts/placeholders.mjs --check)', () => {
  const r = spawnSync(process.execPath, ['scripts/placeholders.mjs', '--check'], { cwd: root, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.match(readFileSync(new URL('src/main.jsx', root), 'utf8'), /import '\.\/placeholder\.css'/)
})
