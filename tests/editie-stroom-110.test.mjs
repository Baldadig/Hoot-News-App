import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Editie en Stroom 1.1.0 (keuzes van Alex, 4 november): web en iOS gelijk.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/styles.css')
const block = (sel) => {
  const at = css.indexOf(`${sel} {`)
  assert.ok(at >= 0, sel)
  return css.slice(at, css.indexOf('}', at))
}

test('eindkaart: op de leesbreedte, één rustige link, gedempt in Nacht (E8, E9)', () => {
  const ed = read('src/views/Edition.jsx')
  const end = ed.slice(ed.indexOf('<div className="endcap">'), ed.indexOf('</div>) : null}'))
  assert.equal(end.match(/<a /g)?.length, 1, 'één link')
  assert.match(end, /Lees verder in de Stroom/)
  assert.match(block('.endcap'), /max-inline-size: var\(--measure\)/)
  assert.match(block('.endcap'), /background: var\(--endcap-bg, var\(--brand-red\)\)/)
  const night = css.slice(css.indexOf('/* Nacht Zacht papier:'))
  assert.match(night, /--endcap-bg: color-mix\(in srgb, var\(--brand-red\) 42%, #000000\)/)
  assert.match(night, /--endcap-on: var\(--ink\)/)
  // iOS: ook één link, en geen seintje meer in de kaart.
  const swift = read('ios/Hoot/Views/EditionView.swift')
  assert.ok(!swift.includes('Seintje als hij klaarligt?'), 'het seintje staat niet meer in de eindkaart')
  assert.match(swift, /Text\("Lees verder in de Stroom"\)/)
  assert.match(swift, /\.frame\(maxWidth: Layout\.readable\)/)
})

test('breed raster A: paren even hoog, een kort verhaal krijgt zijn beeld groot erboven (gelijk aan EditionPairs)', async () => {
  const { planPairs, leadImageHeight, PAIR_SLACK, LEAD_MIN } = await import('../src/lib/pairs.js')
  const c = (key, h, image = true) => ({ key, h, image })
  assert.equal(PAIR_SLACK, 48)
  assert.equal(LEAD_MIN, 240)
  assert.deepEqual(planPairs([c('a', 200), c('b', 240)], { width: 460 }), {})
  assert.deepEqual(planPairs([c('a', 180), c('b', 300)], { width: 460 }), { a: 115 })
  assert.deepEqual(planPairs([c('a', 400), c('b', 180)], { width: 460 }), { b: 208 })
  assert.deepEqual(planPairs([c('a', 180, false), c('b', 300)], { width: 460 }), {})
  assert.deepEqual(planPairs([c('a', 240), c('b', 300)], { width: 460 }), {}, 'een beeld zou het gat groter maken')
  assert.deepEqual(planPairs([c('a', 100)], { width: 460 }), {})
  assert.equal(leadImageHeight({ side: 620, text: 300 }), 320)
  assert.equal(leadImageHeight({ side: 400, text: 300 }), 240)
  // iOS rekent met dezelfde getallen.
  const swift = read('ios/Hoot/Views/EditionGrid.swift')
  assert.match(swift, /static let slack: CGFloat = 48/)
  assert.match(swift, /static let leadMin: CGFloat = 240/)
})

test('breed raster: B (één leeskolom, nummers in de kantlijn) tot 48rem, A (paren) breder; koppen breken nooit af', () => {
  assert.match(css, /@container front \(40rem <= width <= 48rem\) \{\s*\.front \.entry:has\(\.kicker__n\), \.pairs \.entry:has\(\.kicker__n\) \{ padding-inline-start: calc\(2ch \+ var\(--s3\)\); \}/)
  const wide = css.slice(css.indexOf('@container front (width > 48rem) {'))
  assert.match(wide, /\.pairs \{\s*display: grid;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  assert.match(wide, /\.pairs > \.fitem > \.fitem__link \{\s*flex: 1 0 auto;/, 'de bronregels van een paar op één lijn')
  assert.match(css, /\.lead--fit \.media--lead \{\s*aspect-ratio: auto;\s*height: var\(--lead-h\);/)
  assert.ok(!/fitem__title[^{]*\{[^}]*line-clamp/.test(css), 'koppen zonder line-clamp')
  const ed = read('src/views/Edition.jsx')
  assert.match(ed, /usePairs\(pairsRef, frontRef/)
  assert.match(ed, /Verder in deze Editie/)
  // iOS: staand B, liggend A, nooit een lineLimit op een kop.
  const view = read('ios/Hoot/Views/EditionView.swift')
  assert.match(view, /EditionPairs\.paired\(screen\) \? \.paren : \.kolom/)
  assert.match(view, /HangRow\(number:/)
  assert.match(view, /EditionPairsGrid\(rows:/)
})
