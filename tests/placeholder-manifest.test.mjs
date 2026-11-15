// Placeholderbeelden van de server (build 61, besluit Alex 15 november: "server side bouwen"). Het manifest op
// gethoot.app/placeholders.json beschrijft de reeks en de beelden; de app haalt het op en valt terug op zijn bundel.
// Dezelfde fixture (tests/fixtures/placeholder-manifest.json) draait in de app (ios/HootTests/PlaceholderReeksTests.swift).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  placeholderManifestFout, placeholderReeksUitManifest, placeholderBase, placeholderPlan, PLACEHOLDERS, PLACEHOLDER_COUNT,
  PLACEHOLDER_UIT, PLACEHOLDER_NUMMERS, THEMES, placeholderFile, PLACEHOLDER_MATEN,
} from '../shared/placeholder.mjs'

const root = new URL('../', import.meta.url)
const lees = (f) => readFileSync(new URL(f, root), 'utf8')
const manifest = JSON.parse(lees('landing/placeholders.json'))
const fixture = JSON.parse(lees('tests/fixtures/placeholder-manifest.json'))
const sha = (buf) => createHash('sha256').update(buf).digest('hex')

test('manifest: beschrijft precies de gebouwde reeks (het web en de app-bundel)', () => {
  assert.equal(placeholderManifestFout(manifest), null)
  assert.equal(manifest.count, PLACEHOLDER_COUNT)
  assert.deepEqual(manifest.uit, PLACEHOLDER_UIT.map((k) => k + 1))
  assert.deepEqual(manifest.beelden.map((b) => b.nummer), PLACEHOLDER_NUMMERS)
  assert.deepEqual(manifest.beelden.map((b) => b.set), PLACEHOLDER_NUMMERS.map((n) => PLACEHOLDERS[n - 1].family))
  const reeks = placeholderReeksUitManifest(manifest)
  for (let i = 0; i < 3000; i++) assert.equal(reeks.base(`id-${i}`), placeholderBase(`id-${i}`))
  const rows = Array.from({ length: 200 }, (_, i) => ({ id: `r-${i}`, bare: i % 4 !== 0 }))
  assert.deepEqual([...reeks.plan(rows)], [...placeholderPlan(rows)])
  // De Swift-tabel kent dezelfde versie: met dit manifest haalt de app niets op.
  assert.match(lees('ios/Hoot/Views/PlaceholderBeelden.swift'), new RegExp(`static let versie = "${manifest.versie}"`))
})

test('manifest: elke url wijst naar een gebouwd bestand, en ?v= is het begin van zijn sha256', () => {
  for (const b of manifest.beelden) for (const theme of THEMES) for (const uitsnede of ['groot', 'klein']) {
    PLACEHOLDER_MATEN[uitsnede].maten.forEach((breed, i) => {
      const url = new URL(b[theme][uitsnede][i ? '2x' : '1x'])
      const f = placeholderFile(b.nummer, theme, uitsnede, breed)
      assert.equal(url.origin + url.pathname, `https://gethoot.app/img/placeholder/${f}`)
      assert.deepEqual([...url.searchParams.keys()], ['v']) // niets anders in het verzoek
      assert.equal(url.searchParams.get('v'), sha(readFileSync(new URL(`src/assets/placeholder/${f}`, root))).slice(0, 12), f)
    })
  }
})

test('manifest: een andere reeks geeft op web en in de app dezelfde keuze (fixture)', () => {
  const m = fixture.manifest
  assert.equal(placeholderManifestFout(m), null)
  assert.equal(m.count, 20)
  const reeks = placeholderReeksUitManifest(m)
  assert.deepEqual(reeks.uit.map((k) => k + 1), fixture.uit)
  for (const { id, beeld } of fixture.base) {
    assert.equal(reeks.base(id) + 1, beeld, id)
    assert.ok(!fixture.uit.includes(beeld), id)
  }
  // De nieuwe beelden (19, 20) komen voor; De kop (11) niet meer.
  const gekozen = new Set(fixture.base.map((b) => b.beeld))
  assert.ok(gekozen.has(19) || gekozen.has(20))
  assert.ok(!gekozen.has(11))
  for (const l of fixture.lijsten) {
    const plan = reeks.plan(l.rows)
    assert.deepEqual(Object.fromEntries([...plan].map(([k, v]) => [k, v + 1])), l.beelden, l.naam)
    for (let i = 1; i < l.rows.length; i++) {
      if (!l.rows[i].bare || !l.rows[i - 1].bare) continue
      assert.notEqual(reeks.set(plan.get(l.rows[i].id)), reeks.set(plan.get(l.rows[i - 1].id)), `${l.naam}: rij ${i}`)
    }
  }
})

test('manifest: een fout manifest wordt geweigerd (dan blijft wat er was)', () => {
  assert.ok(fixture.ongeldig.length >= 8)
  for (const { naam, fout, manifest: m } of fixture.ongeldig) assert.equal(placeholderManifestFout(m), fout, naam)
  assert.equal(placeholderManifestFout(null), 'geen object')
  assert.equal(placeholderManifestFout({ ...manifest, uit: [7, 7] }), 'uit')
})

test('manifest: online met de landing, kort in de cache; het web haalt het niet op', () => {
  const build = lees('landing/build.mjs')
  assert.match(build, /copyFileSync\(path\.join\(SRC, 'placeholders\.json'\), path\.join\(OUT, 'placeholders\.json'\)\)/)
  assert.match(build, /'img', 'placeholder'/)
  assert.match(build, /\/placeholders\.json\n {2}Cache-Control: public, max-age=3600/)
  for (const f of ['src/components/Beeld.jsx', 'src/main.jsx']) assert.doesNotMatch(lees(f), /placeholders\.json/, f)
})
