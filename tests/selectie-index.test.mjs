import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const web = readFileSync(new URL('../src/views/Vak.jsx', import.meta.url), 'utf8')
const ios = readFileSync(new URL('../ios/Hoot/Views/DigestView.swift', import.meta.url), 'utf8')

// De zinnen van "Hoe kiest Hoot deze stukken?" uit beide bestanden, met het getal als {n}.
const webLines = () => [...web.match(/export const howHootChooses = \(n\) => \[([\s\S]*?)\n\]/)[1].matchAll(/^\s*[`'](.+?)[`'],?$/gm)].map((m) => m[1].replace('${n}', '{n}'))
const iosLines = () => [...ios.match(/static func howHootChooses\(_ n: Int\) -> \[String\] \{([\s\S]*?)\n    \}/)[1].matchAll(/"(.+?)"/g)].map((m) => m[1].replace('\\(n)', '{n}'))

test('Hoe kiest Hoot: tekst 1 · Kort, op web en iOS woord voor woord gelijk', () => {
  const w = webLines()
  assert.deepEqual(w, [
    'Deze week las Hoot {n} stukken van kenners en vakbladen over je onderwerpen. Per onderwerp blijven er drie over: waar anderen ook over schrijven, wat een redactie uitkoos, of wat een kenner schreef.',
    'Niets gesponsord. De intro is van de schrijver zelf.',
  ])
  assert.deepEqual(iosLines(), w)
  assert.doesNotMatch(web + ios, /zoals Sidebar|niet van AI\./)
})

import { selectionOverview, summaryLine, pieces, joinNames } from '../src/lib/selection-index.js'

const f = (id, label, n) => ({ id, label, top: Array.from({ length: n }, (_, i) => ({ id: `${id}${i}` })) })

test('index B: geen "0 stukken"; een leeg onderwerp zegt "Nog geen stukken"', () => {
  assert.equal(pieces(0), 'Nog geen stukken')
  assert.equal(pieces(1), '1 stuk')
  assert.equal(pieces(3), '3 stukken')
})

test('index B: lege onderwerpen onderaan, en ze tellen niet mee in de kop', () => {
  const o = selectionOverview([f('foto', 'Fotografie', 0), f('ux', 'UI/UX', 3), f('ai', 'AI', 2)], new Set(['ux', 'ai', 'foto']))
  assert.equal(o.state, 'vol')
  assert.deepEqual(o.fields.map((x) => x.id), ['ux', 'ai', 'foto'])
  assert.equal(summaryLine(o), '5 stukken in 2 onderwerpen')
  assert.equal(summaryLine(selectionOverview([f('ux', 'UI/UX', 1)], new Set(['ux']))), '1 stuk in 1 onderwerp')
})

test('index B: alleen lege onderwerpen geeft "Nog niets voor X", nooit "0 in 0"', () => {
  const geen = selectionOverview([f('foto', 'Fotografie', 0)], new Set())
  assert.equal(geen.state, 'leeg')
  assert.equal(geen.names, 'Fotografie')
  assert.equal(geen.unoffered, true)
  const twee = selectionOverview([f('foto', 'Fotografie', 0), f('gaming', 'Games', 0)], new Set(['foto', 'gaming']))
  assert.equal(twee.names, 'Fotografie en Games')
  assert.equal(twee.unoffered, false)
  // Een onderwerp buiten de bundel telt niet mee in de namen ("Tot dan verbergen.", 14 november).
  const half = selectionOverview([f('foto', 'Fotografie', 0), f('gaming', 'Games', 0)], new Set(['gaming']))
  assert.equal(half.names, 'Games')
  assert.equal(half.unoffered, false)
  assert.equal(joinNames(['AI', 'Fotografie', 'Games']), 'AI, Fotografie en Games')
  assert.equal(selectionOverview([], new Set()).state, 'kies')
})

test('index B: geen glasknoppen, blad "Ga naar onderwerp" of "Alles inklappen" meer (web en iOS)', () => {
  for (const src of [web, ios]) {
    assert.doesNotMatch(src, /Ga naar onderwerp|Alles inklappen|Alles uitklappen|SelectionIndex|buttonStyle\(\.glass\)|glassEffect/)
    assert.match(src, /Nog niets voor /)
  }
  assert.doesNotMatch(web, /0 stukken in/)
})

// "Tot dan verbergen." (besluit Alex 14 november): een onderwerp dat nog niet in de weekbundel zit, is op het web
// verborgen tot de bundel het heeft, zoals de app (HootStore.offersField). Generiek: elk onderwerp, niet één naam.
import { offersField, offeredFields, allChosen, chooseAll } from '../src/lib/selection-index.js'
import { VAK_FIELD_IDS, vakByDomain } from '../shared/vak.mjs'

test('Tot dan verbergen: een onderwerp buiten de bundel telt nergens mee, op web en app gelijk', () => {
  const order = vakByDomain().flatMap((d) => d.fields.map((x) => x.id))
  const nieuw = order[order.length - 1] // welk onderwerp ook: het laatste in de vaste volgorde staat er even niet in
  const digest = { fields: order.filter((id) => id !== nieuw).map((id) => ({ id, top: [] })) }
  // zonder bundel weet Hoot het niet: alles telt
  assert.equal(offersField(null, nieuw), true)
  assert.equal(offersField(digest, nieuw), false)
  assert.equal(offersField(digest, order[0]), true)
  const offered = offeredFields(order, digest)
  assert.equal(offered.length, VAK_FIELD_IDS.length - 1)
  assert.deepEqual(offeredFields([{ id: nieuw }, { id: order[0] }], digest), [{ id: order[0] }])
  // "Alle onderwerpen" is aan zodra alle aangeboden onderwerpen gekozen zijn, en telt dan zoveel als de app
  assert.equal(allChosen(offered, offered), true)
  assert.equal(allChosen(offered.slice(1), offered), false)
  assert.equal(allChosen([], []), false)
  const alle = chooseAll(true, order, [], offered)
  assert.deepEqual(alle, offered)
  assert.equal(offeredFields(alle, digest).length, offered.length)
  // wie het verborgen onderwerp al had, houdt het (het komt terug zodra de bundel het heeft)
  assert.deepEqual(chooseAll(true, order, [nieuw], offered), order)
  assert.deepEqual(chooseAll(false, order, order, offered), [])
  // de Selectie zelf: een gekozen onderwerp buiten de bundel staat er niet
  const o = selectionOverview([f(order[0], 'Een', 2), f(nieuw, 'Nieuw', 0)], new Set(offered))
  assert.deepEqual(o.fields.map((x) => x.id), [order[0]])
  // web: Instellingen, kiezen in de Selectie en het welkom tonen alleen aangeboden onderwerpen; de app ook
  const settings = readFileSync(new URL('../src/views/Settings.jsx', import.meta.url), 'utf8')
  const welkom = readFileSync(new URL('../src/views/Welcome.jsx', import.meta.url), 'utf8')
  for (const [naam, src] of [['Vak.jsx', web], ['Settings.jsx', settings], ['Welcome.jsx', welkom]]) assert.match(src, /offeredFields\(d\.fields, digest\)/, naam)
  assert.match(settings, /allChosen\(chosen, offered\)/)
  assert.match(settings, /chooseAll\(v, order, chosen, offered\)/)
  assert.doesNotMatch(settings, /VAK_FIELD_IDS/)
  const iosSettings = readFileSync(new URL('../ios/Hoot/Views/SettingsView.swift', import.meta.url), 'utf8')
  assert.match(iosSettings, /let offered = Self\.fields\.map\(\\\.id\)\.filter\(store\.offersField\)/)
  assert.match(iosSettings, /store\.digestFields\.filter\(store\.offersField\)\.count/)
  assert.match(ios, /chosen\.filter \{ offered\.contains\(\$0\.id\) \}/)
})
