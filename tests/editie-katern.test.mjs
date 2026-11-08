import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Editie, breed (Alex 7-11): "Buiten je bubbel mag in een aparte katern naast 10 staan. De footer mag
// passend over de breedte." Web en iPad gelijk; de telefoon blijft zoals hij was.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const rust = read('src/styles/rust.css')
const wide = rust.slice(rust.indexOf('/* ---------- 3. Editie, breed'), rust.indexOf('/* ---------- 2. Bediening op hover'))

test('web: Buiten je bubbel staat breed als eigen katern in het raster, smaller en op de telefoon eronder', () => {
  const ed = read('src/views/Edition.jsx')
  assert.match(ed, /const bubbleInGrid = !phone && rows\.length > SIDE/)
  // Naast de laatste plek als die alleen staat (oneven aantal paren), anders een eigen rij.
  assert.match(ed, /const bubbleNaast = \(rows\.length - SIDE\) % 2 === 1/)
  assert.match(ed, /bubble--katern \$\{bubbleNaast \? 'bubble--naast' : 'bubble--rij'\}/)
  // Eén katern, op één plek: in .pairs (breed) of onder de Editie (telefoon, of zonder paren).
  const pairs = ed.slice(ed.indexOf('<div className="pairs rows"'), ed.indexOf('</PlaceholderList>', ed.indexOf('<div className="pairs rows"')))
  assert.match(pairs, /\{bubbleInGrid \? bubbleKatern : null\}/)
  assert.match(ed, /\{editionBubble\.length && !bubbleInGrid \? bubbleKatern : null\}/)
  // Eigen kop en ondertitel: nooit plek 11.
  const kat = ed.slice(ed.indexOf('const bubbleKatern'), ed.indexOf(') : null', ed.indexOf('const bubbleKatern')))
  assert.match(kat, />Buiten je bubbel<\/h2>/)
  assert.match(kat, /Een verhaal naast je Editie\./)
  assert.ok(!/\bn=\{r\.n\}/.test(kat), 'het katern heeft geen nummer')
  // Het meten van de paren telt het katern niet als plek.
  assert.match(read('src/hooks/usePairs.js'), /!el\.classList\.contains\('bubble'\)/)
})

test('web: het katern staat op de bovenlijn van de plek ernaast, met zijn eigen sterke lijn', () => {
  assert.match(wide, /\.pairs > \.bubble--katern \{\s*max-inline-size: none;\s*margin-top: 0;\s*border-top: 0;/)
  assert.match(wide, /\.pairs > \.bubble--naast > \.front__more \{\s*margin-top: 0;/)
  // Smaller: geen lijn van een lijstrij, zodat het katern er precies zo uitziet als ervoor.
  const before = rust.slice(0, rust.indexOf('@container front (width > 48rem) {', rust.indexOf('/* ---------- 3. Editie, breed')))
  assert.match(before, /\.pairs > \.bubble--katern \{\s*border-top: 0;/)
})

test('web: De Editie in één minuut en de eindkaart lopen breed over het hele raster', () => {
  assert.match(wide, /\.col--front > :is\(\.briefcta--end, \.endcap\) \{\s*max-inline-size: none;/)
  // Zonder paren blijft de bubbel op één kolommaat.
  assert.match(wide, /\.col--front > \.bubble \{\s*max-inline-size: calc\(\(100cqi - var\(--s6\)\) \/ 2\);/)
  // De oude regel (einde op één kolommaat) is weg.
  assert.ok(!/:is\(\.bubble, \.briefcta--end, \.endcap\)/.test(rust))
})

test('iPad: zelfde katern in het raster en de eindkaart over de hele breedte (web gelijk aan app)', () => {
  const grid = read('ios/Hoot/Views/EditionGrid.swift')
  assert.match(grid, /var katern: AnyView\? = nil/)
  assert.match(grid, /if let katern \{ katern\.frame\(maxHeight: \.infinity, alignment: \.top\) \}/)
  assert.match(grid, /if let katern, rows\.count % 2 == 0 \{/)
  const ed = read('ios/Hoot/Views/EditionView.swift')
  assert.match(ed, /katern: outsideRows\.isEmpty \? nil : AnyView\(bubbleKatern\(outsideRows, inGrid: true\)\)/)
  assert.match(ed, /if !outsideRows\.isEmpty && !\(grid == \.paren && rows\.count > 3\)/)
  assert.match(ed, /Text\("Een verhaal naast je Editie\."\)/)
  // Release 1.2: de Duo (tabloid, boek) houdt het einde op de linkerkolom; zonder Duo is linkerKolom nil
  // buiten A, dus iPhone en iPad B houden Layout.readable.
  assert.match(ed, /\.frame\(maxWidth: grid == \.paren \? \.infinity : linkerKolom \?\? Layout\.readable\) \/\/ op de leesbreedte; A \(paren\)/)
})
