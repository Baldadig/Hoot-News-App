// Kaartmenu (Alex 8-11): ⋯ bij de bronregel opent een zwevend menu, zoals het contextmenu van de app.
// De bronregel verandert nooit: geen keuzes meer ín de regel (die persten "de Volkskrant" samen tot
// "de Vol ks kra nt"). Plus de plek van het menu: rechts op de kolomlijn, onder de regel, binnen het venster.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { placeMenu } from '../src/lib/popmenu-plek.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const items = read('src/components/Items.jsx')
const pop = read('src/components/Popmenu.jsx')
// src/styles.css is bevroren (tests/zacht-papier.test.mjs): de oude .taste-regels daar (en de :not(:has(.taste))
// in rust.css, die de specificiteit dragen) raken niets meer.
const css = ['src/styles/rust.css', 'src/styles/kaart.css', 'src/styles/popmenu.css'].map(read).join('\n')
const taste = items.slice(items.indexOf('export function TasteButton'), items.indexOf('export function aboutOf'))

test('de keuzes staan in een zwevend menu, niet in de bronregel', () => {
  assert.match(taste, /<Popmenu /)
  assert.doesNotMatch(taste, /className="taste|pill pill--sm|Sluiten/, 'geen pillen of "Sluiten" meer in de regel')
  assert.doesNotMatch(css, /^\s*(?:\.taste|\.kmeta > :is\(\.taste)/m, 'geen opmaak meer voor keuzes in de regel')
  for (const label of ['Meer hiervan', 'Minder hiervan', 'Klopt dit niet?']) assert.ok(taste.includes(`'${label}'`), label)
  assert.match(taste, /role="menuitem"/)
  assert.match(pop, /role="menu"/)
})

test('⋯ blijft één knop met de juiste toegankelijkheid', () => {
  assert.match(taste, /aria-haspopup="menu"/)
  assert.match(taste, /aria-expanded=\{open\}/)
  assert.match(taste, /aria-controls=/)
})

test('toetsenbord en klik buiten: Esc sluit met focus terug, Tab sluit, pijltjes lopen door de keuzes', () => {
  assert.match(pop, /e\.key === 'Escape'[^\n]*onClose\(true\)/)
  assert.match(pop, /e\.key === 'Tab'/)
  assert.match(pop, /ArrowDown/)
  assert.match(pop, /ArrowUp/)
  assert.match(pop, /'pointerdown'/)
  assert.match(taste, /moreRef\.current\?\.focus/)
})

test('de app toont dezelfde keuzes in zijn menu', () => {
  const ios = read('ios/Hoot/Views/Components.swift')
  for (const label of ['Meer hiervan', 'Minder hiervan', 'Klopt dit niet?']) assert.ok(ios.includes(`"${label}"`), label)
})

// Nep-DOM: een regel van 0..W met ⋯, delen en bewaren; het icoon is 22 breed in een raakvlak van 44.
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })
function scene({ vw = 1440, vh = 900, rowTop = 500, rowH = 60, inkRight = 1188, w = 208, h = 125 } = {}) {
  const icons = [inkRight - 22 - 2 * 44, inkRight - 22 - 44, inkRight - 22].map((x) => ({ getBoundingClientRect: () => rect(x, rowTop + 11, 22, 22) }))
  const row = { getBoundingClientRect: () => rect(inkRight - 300, rowTop, 311, rowH), querySelectorAll: () => icons }
  const anchor = { getBoundingClientRect: () => rect(inkRight - 22 - 2 * 44 - 11, rowTop, 44, 44), querySelector: () => icons[0], closest: () => row }
  const menu = { offsetWidth: w, offsetHeight: h, style: {}, dataset: {} }
  placeMenu(menu, anchor, { innerHeight: vh }, { documentElement: { clientWidth: vw } })
  return { menu, px: (k) => parseFloat(menu.style[k]) }
}

test('het menu staat rechts op de kolomlijn, onder de hele bronregel', () => {
  const { menu, px } = scene()
  assert.equal(px('left') + 208, 1188, 'rechterrand op de inkt van bewaren')
  assert.equal(px('top'), 500 + 60 + 4, '--s1 onder de regel, niet over "N bronnen"')
  assert.equal(menu.dataset.side, 'onder')
})

test('past het er niet onder, dan boven de regel; altijd binnen het venster', () => {
  const { menu, px } = scene({ rowTop: 800, vh: 900 })
  assert.equal(menu.dataset.side, 'boven')
  assert.equal(px('top') + 125, 800 - 4)
  const smal = scene({ vw: 390, inkRight: 120 })
  assert.equal(smal.px('left'), 16, 'nooit buiten de goot van 16')
})
