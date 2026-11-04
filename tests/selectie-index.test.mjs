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
  const twee = selectionOverview([f('foto', 'Fotografie', 0), f('gaming', 'Gaming', 0)], new Set(['gaming']))
  assert.equal(twee.names, 'Fotografie en Gaming')
  assert.equal(twee.unoffered, false)
  assert.equal(joinNames(['AI', 'Fotografie', 'Gaming']), 'AI, Fotografie en Gaming')
  assert.equal(selectionOverview([], new Set()).state, 'kies')
})

test('index B: geen glasknoppen, blad "Ga naar onderwerp" of "Alles inklappen" meer (web en iOS)', () => {
  for (const src of [web, ios]) {
    assert.doesNotMatch(src, /Ga naar onderwerp|Alles inklappen|Alles uitklappen|SelectionIndex|buttonStyle\(\.glass\)|glassEffect/)
    assert.match(src, /Nog niets voor /)
  }
  assert.doesNotMatch(web, /0 stukken in/)
})
