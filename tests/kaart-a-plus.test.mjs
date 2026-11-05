import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { introMax } from '../shared/zinnen.mjs'

// Kaart A+ (keuze van Alex, 4 november): op de telefoon één kaart voor de Editie en de Stroom.
// Web en iOS gelijk: de maten hieronder staan ook in ios/HootTests/KaartAPlusTests.swift.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const css = read('src/styles/kaart.css')
const block = (sel) => {
  const at = css.indexOf(`${sel} {`)
  assert.ok(at >= 0, sel)
  return css.slice(at, css.indexOf('}', at))
}

test('kop 22/28 Newsreader 800, intro 18/28 in rem (schaalt mee met Tekstgrootte)', () => {
  const kop = block('.kaart__title')
  assert.match(kop, /font-size: var\(--t-head-lg\)/) // 22
  assert.match(kop, /line-height: 1\.75rem/) // 28
  assert.match(kop, /font-family: var\(--serif\)/)
  assert.match(kop, /font-weight: var\(--fw-head\)/) // 800
  const sum = block('.kaart__sum')
  assert.match(sum, /font-size: var\(--t4\)/) // 18
  assert.match(sum, /line-height: 1\.75rem/) // 28
  assert.match(sum, /font-family: var\(--lees\)/)
  assert.ok(!/\bpx\b/.test(kop + sum), 'geen vaste pixels: Tekstgrootte schaalt mee')
})

test('waarom-regel 13/16 ink-3, rubriek 12, beeld 2:1 met hoek 12 en haarlijn binnenin', () => {
  const why = block('.kaart .why')
  assert.match(why, /font-size: var\(--t1\)/) // 13
  assert.match(why, /line-height: var\(--lh-1\)/) // 16
  assert.match(why, /color: var\(--ink-3\)/)
  assert.match(block('.kaart .kicker'), /font-size: var\(--t0\)/) // 12
  const media = block('.kaart .media')
  assert.match(media, /aspect-ratio: 2 \/ 1/)
  assert.match(media, /margin: 1rem 0 0/) // 16 lucht erboven
  assert.match(media, /border-radius: var\(--radius-card\)/) // 12
  assert.match(block('.kaart .media::after'), /box-shadow: inset 0 0 0 1px var\(--hairline\)/)
  assert.match(block('.kaart .media:not(.ph)'), /background-color: var\(--tint\)/)
  // De zes placeholderbeelden blijven: geen effen tint met uilmerk.
  const items = read('src/components/Items.jsx')
  assert.match(items.slice(items.indexOf('export function KaartItem')), /<Beeld item=\{item\} kind="tijdlijn"/)
  assert.ok(!/hoot-mark|uilmerk/.test(css))
})

test('ritme: 16 boven en onder een kaart, 8 tussen tekstlagen', () => {
  assert.match(block('.entry.kaart'), /padding: 1rem 0 0\.75rem/)
  assert.match(block('.kaart__head'), /margin-bottom: 0\.5rem/)
  assert.match(block('.kaart__title'), /margin: 0 0 0\.5rem/)
})

test('hoofdverhaal: beeld tot de rand 3:2, kop 30/36, intro 20/30, nummer in het rood, sterke lijn eronder', () => {
  const lead = block('.entry.kaart--lead')
  assert.match(lead, /margin-inline: calc\(-1 \* var\(--gutter\)\)/)
  assert.match(lead, /border-bottom: var\(--rule-strong\)/)
  assert.match(block('.kaart--lead .media'), /aspect-ratio: 3 \/ 2/)
  assert.match(block('.kaart--lead .media'), /border-radius: 0/)
  const kop = block('.kaart__title--lead')
  assert.match(kop, /font-size: var\(--t6\)/) // 30 op een telefoon
  assert.match(kop, /line-height: 2\.25rem/) // 36
  const sum = block('.kaart--lead .kaart__sum')
  assert.match(sum, /font-size: 1\.25rem/)
  assert.match(sum, /line-height: 1\.875rem/)
  assert.match(block('.kaart--lead .kicker__n'), /color: var\(--accent\)/)
})

test('bronregel: Abonnement stil, "N bronnen" als tekstknop, delen in het ⋯-menu, bewaren blijft', () => {
  const items = read('src/components/Items.jsx')
  const kaart = items.slice(items.indexOf('export function KaartSource'), items.indexOf('// ---- Vorm 3'))
  assert.match(kaart, /· Abonnement/)
  assert.match(kaart, /kmeta__bronnen/)
  assert.ok(!kaart.includes('<ShareButton'), 'geen losse deelknop')
  assert.match(kaart, /TasteButton[^>]*withShare/)
  assert.match(kaart, /<SaveButton/)
  assert.ok(!kaart.includes('CaretIcon'), 'het bronnenlabel is tekst, zonder pijl')
  assert.match(block('.kmeta__abo'), /color: var\(--ink-2\)/)
  assert.match(block('.kmeta'), /min-height: var\(--tap\)/)
})

test('telefoon: kaart in de Editie en de Stroom; breder houdt de oude vormen', () => {
  const items = read('src/components/Items.jsx')
  assert.match(items, /if \(phone && layout === 'tijdlijn' && !plain\) return <KaartItem/)
  const ed = read('src/views/Edition.jsx')
  assert.match(ed, /\{phone \? \(/)
  assert.match(ed, /<KaartItem lead=\{i === 0\}/)
  assert.match(ed, /<div className="front" ref=\{frontRef\}>/, 'de brede voorpagina bestaat nog')
  assert.match(ed, /usePairs\(pairsRef, frontRef, active && ready && !phone/)
  const main = read('src/main.jsx')
  assert.ok(main.indexOf("./styles.css") < main.indexOf("./styles/kaart.css"), 'kaart.css na styles.css')
})

test('usePhone: een raam smaller dan 640; zonder raam nooit een telefoon', async () => {
  const { PHONE_QUERY, usePhone } = await import('../src/hooks/usePhone.js')
  assert.equal(PHONE_QUERY, '(max-width: 639px)')
  const { createElement } = await import('react')
  const { renderToString } = await import('react-dom/server')
  const Probe = () => createElement('i', null, String(usePhone()))
  assert.equal(renderToString(createElement(Probe)), '<i>false</i>')
})

test('intro-maat van de kaart: hele zinnen, nooit een beletselteken', () => {
  const read2 = read('src/lib/intro.js')
  assert.match(read2, /kaartA: VIEW/)
  const drie = introMax(3, { width: 343, font: 16 })
  assert.ok(drie.max > 100 && drie.rek > drie.max, JSON.stringify(drie))
})

test('iOS: dezelfde kaart in ItemRow en LeadCard; delen in ⋯, de zes placeholderbeelden blijven', () => {
  const c = read('ios/Hoot/Views/Components.swift')
  assert.match(c, /private var kaart: Bool \{ timeline && !wide && boven == nil \}/)
  assert.match(c, /Kop\(item\.title, \.title2\)/) // 22
  assert.match(c, /size: 18, line: 28/)
  assert.match(c, /Kop\(item\.title, \.title, size: 30\)/)
  assert.match(c, /size: 20, line: 30/)
  assert.match(c, /ratio: 3 \/ 2, flat: true/)
  assert.match(c, /WhyLine\(text: why, compact: true\)/)
  assert.match(c, /struct KaartMore/)
  assert.match(c, /Text\("Abonnement"\)/)
  assert.match(c, /BeeldloosView\(item: item, kind: \.tijdlijn\)/)
  const ev = read('ios/Hoot/Views/EditionView.swift')
  assert.match(ev, /form: wide \? \.krant : \.tijdlijn/)
})
