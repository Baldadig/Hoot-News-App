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
  // Wel na de eerste Editie, als los moment onder de Editie (keuze van Alex), één keer.
  assert.ok(swift.includes('struct AlertOffer'), 'het seintje na de eerste Editie bestaat')
  assert.match(swift, /onChange\(of: endVisible\)[\s\S]{0,200}offerAfterEdition/)
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

test('Stroom-kaart B: een post op het raster van het artikel, bron onder, geen kale link in de tekst (S1)', async () => {
  const { withoutBareLinks } = await import('../shared/bluesky.mjs')
  assert.equal(withoutBareLinks('Valve brengt de Steam Machine uit. theverge.com/2026/11/03/valve…', 'www.theverge.com'), 'Valve brengt de Steam Machine uit.')
  assert.equal(withoutBareLinks('Lees dit: https://www.nrc.nl/nieuws/2026/11/04/a-b', ''), 'Lees dit:')
  assert.equal(withoutBareLinks('Nieuw op theverge.com vandaag', 'theverge.com'), 'Nieuw op vandaag')
  assert.equal(withoutBareLinks('Inflatie 3.7 procent, d.w.z. hoger.', 'nos.nl'), 'Inflatie 3.7 procent, d.w.z. hoger.')
  const items = read('src/components/Items.jsx')
  const social = items.slice(items.indexOf('export function SocialItem'), items.indexOf('// Kiest de juiste vorm'))
  assert.ok(social.indexOf('social__text') < social.indexOf('className="meta"'), 'de bron staat onder de tekst')
  assert.ok(!social.includes('social__head'), 'geen kop met avatar boven de post')
  assert.match(css.slice(css.indexOf('/* ---------- Vorm 3: sociale bijdrage')), /\.social__text \{[^}]*font-size: var\(--t3\);\s*line-height: var\(--lh-3\);/)
  assert.match(block('.linkcard__media'), /aspect-ratio: var\(--media-link\)/)
  // iOS: geen avatar van 40 met een hangende inspringing meer.
  const post = read('ios/Hoot/Views/BlueskyView.swift')
  const row = post.slice(post.indexOf('struct PostRow'), post.indexOf('private struct LinkCard'))
  assert.ok(!row.includes('size: 40'), 'geen avatar van 40')
  assert.ok(row.indexOf('LinkCard(item:') < row.indexOf('SourceMark(item: item)'), 'bron onder het beeld')
})

test('Stroom-tabs A: schuiven met een zachte rand van 24 aan de kant waar meer staat, de actieve tab altijd in beeld (S2)', async () => {
  const { STRIP_FADE } = await import('../src/lib/streamline.js')
  assert.equal(STRIP_FADE, 24)
  assert.match(block('.rub'), /--fade: var\(--s5\);/, 'de rand is 24, gelijk aan STRIP_FADE')
  const line = read('src/components/StreamLine.jsx')
  assert.match(line, /ro\.observe\(scrollRef\.current\)/, 'een vak dat smaller wordt (de stapel komt binnen), zet de actieve rubriek opnieuw in beeld')
  assert.match(line, /const pad = cssPx\(rubRef\.current, '--cap'\) \+ cssPx\(rubRef\.current, '--fade'\)/)
  // iOS: dezelfde rand, en de stapel eindigt op de kolomlijn onder het tandwiel.
  const swift = read('ios/Hoot/Views/StreamLine.swift')
  assert.match(swift, /static let zacht = Space\.s5/)
  assert.match(swift, /let rand = Self\.zacht/)
  assert.match(swift, /max\(0, e\)/)
  assert.match(read('ios/Hoot/Views/StreamView.swift'), /HootKop\(gearX: \{ knopAs = \$0 \}\)/)
})
