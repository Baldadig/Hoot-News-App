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
