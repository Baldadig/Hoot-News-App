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
