import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// "Abonnement" en "Gratis" staan overal met een hoofdletter: onder de bronnaam in de grote kaart,
// de compacte lijst en de Selectie-kaart, in de bronnenlijst, op het bronscherm en in het welkom.
// Web en app gelijk (besluit Alex, 13 november, voor 1.3.1).
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const bestanden = [
  'ios/Hoot/Views/Components.swift',
  'ios/Hoot/Views/StreamView.swift',
  'ios/Hoot/Views/SourceFeedView.swift',
  'ios/Hoot/Views/WelcomeView.swift',
  'src/components/Items.jsx',
  'src/views/Sources.jsx',
  'src/views/Welcome.jsx',
]

test('geen "abonnement" of "gratis" met kleine letter als label in app of web', () => {
  for (const p of bestanden) {
    const c = read(p)
    assert.ok(!/Text\("abonnement"\)|Text\("gratis"\)|\? "abonnement"|"gratis" :/.test(c), `${p}: Swift-label met kleine letter`)
    assert.ok(!/>\s*(· )?abonnement<|>\s*gratis</.test(c), `${p}: webspan met kleine letter`)
  }
})

test('de compacte bronregel en de kaart zeggen allebei "Abonnement"', () => {
  const swift = read('ios/Hoot/Views/Components.swift')
  assert.match(swift, /paid == true \? "Abonnement" : nil/)
  assert.match(swift, /Text\("Abonnement"\)\.font\(\.ui\(\.footnote, \.semibold\)\)/)
  const jsx = read('src/components/Items.jsx')
  assert.match(jsx, /<span className="srcbtn__read"> · Abonnement<\/span>/)
  assert.match(jsx, /<span className="kmeta__abo"> · Abonnement<\/span>/)
})

test('bronnenlijst: "Abonnement" stil, "Gratis" in accent, in app en web', () => {
  assert.match(read('ios/Hoot/Views/StreamView.swift'), /Text\("Abonnement"\)\.font\(\.ui\(\.caption\)\)\.foregroundStyle\(Theme\.hint\) \} else \{ Text\("Gratis"\)/)
  assert.match(read('src/views/Sources.jsx'), /srow__tag--paid"> Abonnement<\/span> : <span className="srow__tag srow__tag--free"> Gratis<\/span>/)
})
