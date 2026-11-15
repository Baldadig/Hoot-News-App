// Placeholderbeeld (build 46; knipsel sinds 15 november, dertien beelden): deterministisch per artikel,
// nooit twee gelijke buren en nooit twee keer dezelfde set na elkaar.
// Dezelfde gevallen draaien in de app (ios/HootTests/PlaceholderTests.swift).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'
import { fnv1a, placeholderBase, placeholderPlan, placeholderSet, PLACEHOLDERS, PLACEHOLDER_COUNT, PLACEHOLDER_SHIFT, PLACEHOLDER_UIT, PLACEHOLDER_KEUZE, PLACEHOLDER_NUMMERS, THEMES, placeholderFile, placeholderAppFile } from '../shared/placeholder.mjs'

const root = new URL('../', import.meta.url)
const fixture = JSON.parse(readFileSync(new URL('tests/fixtures/placeholder.json', root), 'utf8'))
const UIT = new Set(PLACEHOLDER_UIT)

test('placeholder: fnv1a(id) mod 18, op web en in de app dezelfde som', () => {
  assert.equal(fnv1a(''), 0x811c9dc5)
  assert.equal(fnv1a('a'), 0xe40c292c) // bekende FNV-1a-waarde
  for (const { id, fnv1a: h, beeld } of fixture.base) {
    assert.equal(fnv1a(id), h, id)
    assert.equal(placeholderBase(id) + 1, beeld, id)
  }
  // Alle dertien komen voor, de vijf die weg zijn nooit.
  assert.equal(new Set(fixture.base.map((b) => b.beeld)).size, 13)
  assert.ok(fixture.base.every((b) => !fixture.uit.includes(b.beeld)))
})

// 15 november, Alex: "16, 17 en 07 halen we helemaal uit het product." Eerder: 14 Eclips (14 november) en
// 15 Walsen (15 november). Dertien blijven, met hun oude nummers.
test('placeholder: dertien beelden; 7, 14, 15, 16 en 17 zijn weg, op web en in de app (fixture.uit)', () => {
  assert.equal(PLACEHOLDER_COUNT, 18)
  assert.equal(PLACEHOLDERS.length, 18)
  assert.deepEqual(PLACEHOLDER_UIT, [6, 13, 14, 15, 16])
  assert.deepEqual(fixture.uit, [7, 14, 15, 16, 17])
  assert.deepEqual(PLACEHOLDER_NUMMERS, [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 18])
  assert.deepEqual(PLACEHOLDERS.map((p) => p?.family ?? null), ['zon', 'zon', 'zon', 'iris', 'iris', 'iris', null, 'raster', 'raster', 'stapel', 'kop', 'vouw', 'baan', null, null, null, null, 'koepels'])
  assert.deepEqual(PLACEHOLDERS.filter(Boolean).map((p) => p.naam), ['Zonnestand', 'Zonnestand', 'Zonnestand', 'Iris', 'Iris', 'Iris', 'Puntraster', 'Haarlijnraster', 'De stapel', 'De kop', 'Vouw', 'Baan', 'Koepels'])
  const ids = Array.from({ length: 40000 }, (_, i) => `https://www.washingtonpost.com/world/2026/11/15/stuk-${i}/`)
  for (const id of ids) assert.ok(!UIT.has(placeholderBase(id)), id)
  for (let t = 0; t < 300; t++) {
    const rows = Array.from({ length: 40 }, (_, i) => ({ id: `wapo-${t}-${i}`, bare: (t + i * 3) % 6 !== 0 }))
    for (const k of placeholderPlan(rows).values()) assert.ok(!UIT.has(k), `lijst ${t}: beeld ${k + 1}`)
  }
  // Elk paar buren uit de dertien: de tweede wordt nooit een beeld dat weg is, nooit hetzelfde beeld en
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
      assert.ok(!UIT.has(k), `${a + 1} dan ${b + 1}: beeld ${k + 1}`)
      assert.notEqual(k, a, `${a + 1} dan ${b + 1}`)
      assert.notEqual(placeholderSet(k), placeholderSet(a), `${a + 1} dan ${b + 1}`)
    }
  }
})

test('placeholder: elk stuk dat een van de dertien had, houdt zijn beeld; de verdeling over de dertien is eerlijk', () => {
  const N = 52000
  const telling = Array(PLACEHOLDER_COUNT).fill(0)
  let verhuisd = 0
  for (let i = 0; i < N; i++) {
    const id = `nos:https://nos.nl/artikel/${i * 31 + 7}`
    const oud = fnv1a(id) % PLACEHOLDER_COUNT, nu = placeholderBase(id)
    if (!UIT.has(oud)) assert.equal(nu, oud, id)
    else verhuisd++
    telling[nu]++
  }
  assert.ok(verhuisd > 0)
  for (const k of PLACEHOLDER_UIT) assert.equal(telling[k], 0)
  // Elk van de dertien rond een dertiende (7,7 procent): tussen 7,0 en 8,4 procent.
  for (const k of PLACEHOLDER_KEUZE) assert.ok(telling[k] > 0.07 * N && telling[k] < 0.084 * N, `beeld ${k + 1}: ${telling[k]}`)
  // Precies: over alle restwaarden van de hash (18 · 13 = 234) krijgt elk van de dertien er 18.
  const exact = Array(PLACEHOLDER_COUNT).fill(0)
  for (let r = 0; r < 18 * 13; r++) {
    const k = r % 18
    exact[UIT.has(k) ? PLACEHOLDER_KEUZE[Math.floor(r / 18) % 13] : k]++
  }
  for (const k of PLACEHOLDER_KEUZE) assert.equal(exact[k], 18, `beeld ${k + 1}`)
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
  // Doorschuiven vindt vanuit elk beeld een ander beeld in een andere set (de ring van +3 heeft er altijd een).
  for (const k of PLACEHOLDER_KEUZE) {
    let j = k
    do j = (j + PLACEHOLDER_SHIFT) % PLACEHOLDER_COUNT
    while (UIT.has(j) || placeholderSet(j) === placeholderSet(k))
    assert.notEqual(j, k, `beeld ${k + 1}`)
  }
  // Willekeurige lijsten: de regel houdt altijd.
  for (let t = 0; t < 200; t++) {
    const rows = Array.from({ length: 30 }, (_, i) => ({ id: `r${t}-${i}`, bare: (t * 31 + i * 7) % 5 !== 0 }))
    buren(rows, placeholderPlan(rows), `lijst ${t}`)
  }
})

test('placeholder: een lange reeks beeldloze rijen: nooit twee gelijke beelden of sets naast elkaar, alle dertien door elkaar', () => {
  const rows = Array.from({ length: 5000 }, (_, i) => ({ id: `https://www.nrc.nl/nieuws/2026/11/05/stuk-${i}-a${(i * 7919) % 1000}`, bare: true }))
  const plan = placeholderPlan(rows)
  buren(rows, plan, 'lange reeks')
  const telling = Array(PLACEHOLDER_COUNT).fill(0)
  for (const k of plan.values()) telling[k]++
  // Elk beeld komt geregeld voor (gemiddeld 7,7 procent): geen onder de 4 of boven de 11,5 procent.
  for (const [k, n] of telling.entries()) {
    if (UIT.has(k)) assert.equal(n, 0, `beeld ${k + 1}`)
    else assert.ok(n > 0.04 * rows.length && n < 0.115 * rows.length, `beeld ${k + 1}: ${n}`)
  }
  // En het is geen vast patroon: de reeks herhaalt zich niet met een korte periode.
  const seq = rows.map((r) => plan.get(r.id))
  for (let p = 1; p <= 24; p++) assert.ok(seq.some((v, i) => i >= p && v !== seq[i - p]), `periode ${p}`)
})

test('placeholder: geen dagdeel in code of CSS; decoratie (aria-hidden)', () => {
  const files = ['shared/placeholder.mjs', 'scripts/placeholders.mjs', 'src/components/Beeld.jsx', 'src/placeholder.css', 'ios/Hoot/Views/Beeldloos.swift', 'ios/Hoot/Views/PlaceholderBeelden.swift']
  for (const f of files) assert.doesNotMatch(readFileSync(new URL(f, root), 'utf8'), /ochtend|middag|avond|morning|evening/i, f)
  assert.match(readFileSync(new URL('src/components/Beeld.jsx', root), 'utf8'), /aria-hidden="true"/)
  assert.match(readFileSync(new URL('ios/Hoot/Views/Beeldloos.swift', root), 'utf8'), /accessibilityHidden\(true\)/)
})

test('placeholder: knipsel-bitmaps: per beeld en weergave groot 2:1 en klein 3:2, WebP, klein genoeg; de app heeft dezelfde 2x-bestanden', async () => {
  const web = readdirSync(new URL('src/assets/placeholder/', root)).filter((f) => !f.startsWith('.') && f !== '_archief')
  const app = readdirSync(new URL('ios/Hoot/Resources/Placeholder/', root)).filter((f) => !f.startsWith('.'))
  // Geen SVG's meer, en niets van de beelden die weg zijn.
  assert.ok(web.every((f) => f.endsWith('.webp') || f === 'bron.json'), web.filter((f) => !f.endsWith('.webp')).join(' '))
  for (const n of [7, 14, 15, 16, 17]) assert.ok(![...web, ...app].some((f) => f.startsWith(`beeld-${n}-`) || f.startsWith(`ph-${n}-`)), `beeld ${n}`)
  assert.equal(web.length, 13 * 3 * 4 + 1)
  assert.equal(app.length, 13 * 3 * 2)
  let webBytes = 0, appBytes = 0
  for (const n of PLACEHOLDER_NUMMERS) for (const theme of THEMES) {
    for (const [uitsnede, breed, hoog] of [['groot', 800, 400], ['groot', 1600, 800], ['klein', 180, 120], ['klein', 360, 240]]) {
      const f = new URL(`src/assets/placeholder/${placeholderFile(n, theme, uitsnede, breed)}`, root)
      const buf = readFileSync(f)
      const meta = await sharp(buf).metadata()
      assert.deepEqual([meta.format, meta.width, meta.height], ['webp', breed, hoog], f.pathname)
      assert.ok(buf.length < (breed >= 800 ? 90_000 : 25_000), `${f.pathname}: ${buf.length}`)
      webBytes += buf.length
      if (breed === 1600 || breed === 360) {
        const a = readFileSync(new URL(`ios/Hoot/Resources/Placeholder/${placeholderAppFile(n, theme, uitsnede)}`, root))
        assert.ok(a.equals(buf), `app ${n} ${theme} ${uitsnede}`)
        appBytes += a.length
      }
    }
  }
  // Grootte: de app krijgt er minder dan 3 MB bij, het web (alles samen, opgehaald alleen wat in beeld komt) minder dan 4 MB.
  assert.ok(appBytes < 3_000_000, `app ${appBytes}`)
  assert.ok(webBytes < 4_000_000, `web ${webBytes}`)
})

test('placeholder: de CSS kiest per beeld, weergave en maat (1x en 2x); de app tekent geen vormen meer', () => {
  const css = readFileSync(new URL('src/placeholder.css', root), 'utf8')
  assert.doesNotMatch(css, /\.svg/)
  for (const n of PLACEHOLDER_NUMMERS) {
    assert.match(css, new RegExp(`\\n\\.ph--${n} \\{ background-image: url\\('\\./assets/placeholder/beeld-${n}-licht-800\\.webp'\\); background-image: image-set\\(url\\('\\./assets/placeholder/beeld-${n}-licht-800\\.webp'\\) 1x, url\\('\\./assets/placeholder/beeld-${n}-licht-1600\\.webp'\\) 2x\\); \\}`))
    assert.match(css, new RegExp(`:root\\[data-theme='night'\\] \\.ph--${n}\\.ph--klein \\{ background-image: url\\('\\./assets/placeholder/beeld-${n}-nacht-klein-180\\.webp'\\)`))
    assert.match(css, new RegExp(`:root\\[data-theme='dark'\\] \\.ph--${n} \\{ background-image: url\\('\\./assets/placeholder/beeld-${n}-donker-800\\.webp'\\)`))
  }
  for (const n of [7, 14, 15, 16, 17]) assert.doesNotMatch(css, new RegExp(`\\.ph--${n}[ .]`))
  assert.match(css, /background-size: cover/)
  assert.ok(!existsSync(new URL('ios/Hoot/Views/PlaceholderVormen.swift', root)))
  const swift = readFileSync(new URL('ios/Hoot/Views/PlaceholderBeelden.swift', root), 'utf8')
  assert.match(swift, /static let uit: Set<Int> = \[6, 13, 14, 15, 16\]/)
})

test('placeholder: bitmaps, CSS en de Swift-tabel zijn bij (scripts/placeholders.mjs --check)', () => {
  const r = spawnSync(process.execPath, ['scripts/placeholders.mjs', '--check'], { cwd: root, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  assert.match(readFileSync(new URL('src/main.jsx', root), 'utf8'), /import '\.\/placeholder\.css'/)
})
