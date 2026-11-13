// De dagdeelwissel (Editie sneller C3, besluit Alex 13 november 2026: "Ja, met iets van een indicatie dat er een
// nieuwe Editie aankomt"). Bij een nieuw dagdeel blijft de vorige Editie staan tot de nieuwe er is; daarna wisselen
// (bovenaan en niet aan het lezen) of een tikbare melding. Hier: de regels (shared/dagdeel-wissel.mjs), dat web en app
// dezelfde woorden en grenzen hebben, en dat de vorige Editie nergens als Editie van het nieuwe dagdeel terechtkomt.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mayHold, holdFor, swapsNow, comingLine, readyLine, HOLD_MAX_MS, AT_TOP_PX } from '../shared/dagdeel-wissel.mjs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const H = 3600 * 1000
const kern = (id, at, slot = 'avond') => ({ id, slot, builtAt: new Date(at).toISOString(), entries: [] })
const mine = (id, at, owner = 'anon', slot = 'middag') => ({ id, slot, owner, builtAt: new Date(at).toISOString(), entries: [{ id: 'x' }] })
const T = Date.parse('2026-11-13T15:00:00Z')

test('mayHold: alleen een eerdere Editie van deze lezer, met plekken, niet te oud', () => {
  const g = kern('avond-13', T + 5 * H)
  assert.equal(mayHold(mine('middag-13', T), g, 'anon'), true)
  assert.equal(mayHold(mine('middag-13', T, 'u1'), g, 'anon'), false, 'een ander')
  assert.equal(mayHold(mine('avond-13', T), g, 'anon'), false, 'zelfde dagdeel')
  assert.equal(mayHold(mine('nacht', T + 6 * H), g, 'anon'), false, 'later dan de kern')
  assert.equal(mayHold(mine('oud', T + 5 * H - HOLD_MAX_MS - 1), g, 'anon'), false, 'ouder dan een dag en een beetje')
  assert.equal(mayHold(mine('gisteren', T + 5 * H - 12 * H), g, 'anon'), true, 'de Avondeditie van gisteren tot de ochtend')
  assert.equal(mayHold({ ...mine('m', T), entries: [] }, g, 'anon'), false, 'zonder plekken')
  assert.equal(mayHold({ ...mine('m', T), builtAt: undefined }, g, 'anon'), false, 'zonder tijd')
  assert.equal(mayHold(null, g, 'anon'), false)
  assert.equal(mayHold(mine('m', T), null, 'anon'), false)
})

test('holdFor: blijft staan tot de nieuwe er is en de lezer wisselt; een vers toestel houdt de laadstrepen', () => {
  const oud = mine('middag-13', T)
  const g = kern('avond-13', T + 5 * H)
  const nieuw = mine('avond-13', T + 5 * H, 'anon', 'avond')
  // Vers toestel: niets om te laten staan.
  assert.equal(holdFor({ global: g, owner: 'anon' }), null)
  // De nieuwe kern, de nieuwe Editie nog niet: de vorige uit beeld blijft.
  const h1 = holdFor({ last: oud, global: g, owner: 'anon' })
  assert.equal(h1, oud)
  // Na herladen: uit de opslag; stored wordt alleen gevraagd als het nodig is.
  let asked = 0
  assert.equal(holdFor({ global: g, owner: 'anon', stored: () => (asked++, [null, oud]) }), oud)
  assert.equal(holdFor({ shown: nieuw, global: g, owner: 'anon', stored: () => (asked++, [oud]) }), null)
  assert.equal(asked, 1)
  // De nieuwe komt binnen terwijl de vorige staat: hij blijft (de weergave beslist over de wissel).
  assert.equal(holdFor({ held: h1, shown: nieuw, last: oud, global: g, owner: 'anon' }), oud)
  // Gewisseld (held null, last de nieuwe): niet opnieuw vastgehouden.
  assert.equal(holdFor({ held: null, shown: nieuw, last: nieuw, global: g, owner: 'anon' }), null)
  // Uitgelogd of een andere lezer: weg.
  assert.equal(holdFor({ held: h1, global: g, owner: 'u1' }), null)
  // Nog een dagdeel later (de vorige is te oud geworden): weg.
  assert.equal(holdFor({ held: h1, global: kern('later', T + HOLD_MAX_MS + H), owner: 'anon' }), null)
})

test('swapsNow: alleen bovenaan en niet aan het lezen', () => {
  assert.equal(swapsNow({ atTop: true, reading: false }), true)
  assert.equal(swapsNow({ atTop: false, reading: false }), false)
  assert.equal(swapsNow({ atTop: true, reading: true }), false)
  assert.equal(AT_TOP_PX, 8)
})

test('de regels: kort, met de naam van het dagdeel, zonder tijd en zonder gedachtestreepje', () => {
  assert.equal(comingLine('avond'), 'De Avondeditie komt eraan')
  assert.equal(readyLine('ochtend'), 'De Ochtendeditie staat klaar')
  assert.equal(comingLine(undefined), 'De nieuwe Editie komt eraan')
  for (const s of ['ochtend', 'middag', 'avond']) {
    for (const line of [comingLine(s), readyLine(s)]) {
      assert.doesNotMatch(line, /\d|uur|[–—]|houdt op/)
    }
  }
})

test('web en app: dezelfde woorden en grenzen (ios/Hoot/DagdeelWissel.swift)', () => {
  const swift = read('ios/Hoot/DagdeelWissel.swift')
  assert.equal(HOLD_MAX_MS, 26 * 60 * 60 * 1000)
  assert.match(swift, /holdMax: TimeInterval = 26 \* 60 \* 60\b/)
  assert.match(swift, /atTop: CGFloat = 8\b/)
  assert.match(swift, /"\\\(naam\(slot\)\) komt eraan"/)
  assert.match(swift, /"\\\(naam\(slot\)\) staat klaar"/)
  assert.match(swift, /"De nieuwe Editie"/)
  assert.match(swift, /gap > 0 && gap <= holdMax/)
  assert.match(swift, /atTop && !reading/)
})

test('web: de vorige Editie wordt alleen getoond, nooit bewaard als Editie van het nieuwe dagdeel', () => {
  const hook = read('src/hooks/usePersonalEdition.js')
  const part = hook.slice(hook.indexOf('// De dagdeelwissel'))
  assert.match(part, /holdFor\(/)
  assert.doesNotMatch(part, /writeJSON|keep\(|setEdition|setProvisional/, 'de wissel schrijft niets weg')
  assert.match(part, /briefNote: held\.current \? null : briefNote/)
  const app = read('src/App.jsx')
  assert.match(app, /coming=\{editionComing\}/)
  assert.match(app, /nextReady=\{editionNext\}/)
  assert.match(app, /onSwap=\{swapEdition\}/)
  // Het dagdeel van de telling volgt de Editie die je ziet (artikel-open in de vorige telt niet voor de nieuwe).
  assert.match(app, /const dagdeel = myEdition\?\.date && myEdition\?\.slot/)
  const view = read('src/views/Edition.jsx')
  assert.match(view, /comingLine\(coming\)/)
  assert.match(view, /readyLine\(nextReady\)/)
  assert.match(view, /swapsNow\(\{ atTop: atTop\(\), reading: reading \|\| storyOpen \}\)/)
  // Niet stil wisselen vanuit een ander tabblad: alleen controleren als de Editie actief is, en "bovenaan" is de laatst
  // gemeten plek in beeld (een verborgen view leest altijd 0; keuring dagdeel-wissel, punt 1).
  assert.match(view, /if \(!nextReady \|\| !onSwap \|\| !active\) return undefined/)
  assert.match(view, /const atTop = \(\) => lastTop\.current <= AT_TOP_PX/)
  assert.match(view, /if \(el\.getClientRects\(\)\.length\) lastTop\.current = el\.scrollTop/)
  // Eindkaart en telling op de getoonde Editie, niet op de kern.
  assert.match(view, /eindzin\(edition\.date, edition\.slot\)/)
  assert.match(view, /usePrintEdition\(ref, edition\?\.id/)
  const css = read('src/styles/dagdeel-wissel.css')
  assert.match(css, /var\(--dur-gewoon\) var\(--ease-bediening\)/, 'bestaande motion-tokens')
  assert.match(css, /animation: spin var\(--dur-spin\)/)
  assert.doesNotMatch(css, /\d+ms/, 'geen eigen duren')
  assert.match(read('src/main.jsx'), /import '\.\/styles\/dagdeel-wissel\.css'\nimport '\.\/styles\/minder-beweging\.css'/)
})

test('app: titel, eindkaart, telling en beoordeling op de getoonde Editie; de widget krijgt de nieuwste', () => {
  const store = read('ios/Hoot/HootStore.swift')
  assert.match(store, /var shownEdition: Edition\? \{ heldNow \?\? currentEdition \}/)
  assert.match(store, /var widgetEdition: Edition\? \{ currentEdition \?\? shownEdition \}/)
  assert.match(store, /func tel\(_ event: Telling\.Event\) \{ let e = shownEdition \?\? edition;/)
  // De vorige Editie gaat nooit naar edition.json: `held` wordt alleen gezet, niet bewaard.
  assert.doesNotMatch(store, /writeRaw\([^)]*held/)
  const view = read('ios/Hoot/Views/EditionView.swift')
  assert.match(view, /private var shown: Edition\? \{ store\.shownEdition \?\? store\.edition \}/)
  assert.match(view, /EditionEnd\.line\(date: shown\?\.date, slot: shown\?\.slot\)/)
  assert.match(view, /guard let id = store\.shownEdition\?\.id, !store\.browsing/)
  assert.doesNotMatch(view, /store\.edition\?\.(slot|date)/)
  assert.match(view, /ProgressView\(\)\.controlSize\(\.mini\)/)
  assert.match(view, /DagdeelWissel\.readyLine\(slot\)/)
  const widget = read('ios/Hoot/WidgetSchrijver.swift')
  assert.doesNotMatch(widget, /shownEdition|editionRows/)
  assert.doesNotMatch(read('ios/Hoot/Views/Tafel.swift'), /store\.edition\?\.(slot|date)/)
})
