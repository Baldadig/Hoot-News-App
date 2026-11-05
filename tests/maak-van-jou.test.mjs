import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pastThird, NUDGE_AT } from '../src/lib/maak-van-jou.js'
import { applyWelcome } from '../src/lib/welcome.js'

// Keuze r5-maak-van-jou-web (5 november; review G6): "Maak Hoot van jou" ook op het web, gelijk aan de app.
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('na ongeveer een derde van de Editie, zoals de app', () => {
  assert.equal(NUDGE_AT, 0.35)
  assert.equal(pastThird({ scrollTop: 300, scrollHeight: 2000, clientHeight: 1000 }), false)
  assert.equal(pastThird({ scrollTop: 400, scrollHeight: 2000, clientHeight: 1000 }), true)
  assert.equal(pastThird({ scrollTop: 0, scrollHeight: 800, clientHeight: 1000 }), false)
})

test('alleen voor wie "Liever meteen lezen" koos; elke andere afronding zet het uit', () => {
  const all = [{ id: 'nos' }]
  assert.equal(applyWelcome({}, { interests: [], topics: [], sources: ['nos'], all, quick: true }).browsing, true)
  assert.equal(applyWelcome({ onboarded: true, browsing: true }, { interests: ['tech'], topics: [], sources: ['nos'], all }).browsing, false)
  assert.match(src('src/views/Welcome.jsx'), /startQuick = \(\) => onDone\(\{[^}]*quick: true \}\)/)
})

test('dezelfde tekst als de app, Later is een antwoord, kiezen opent het welkom bij de interesses', () => {
  const c = src('src/components/MaakVanJou.jsx')
  assert.match(c, /Maak Hoot van jou/)
  assert.match(c, /Je leest nu een keuze uit gratis Nederlandse bronnen\. Kies je eigen bronnen en interesses, dan wordt dit echt jouw Editie\./)
  assert.match(c, />\s*Kies je bronnen\s*</)
  assert.match(c, />\s*Later\s*</)
  const swift = src('ios/Hoot/Views/EditionView.swift')
  assert.match(swift, /Je leest nu een keuze uit gratis Nederlandse bronnen\. Kies je eigen bronnen en interesses, dan wordt dit echt jouw Editie\./)
  const app = src('src/App.jsx')
  assert.match(app, /onMakeYours=\{\(\) => route\.go\('welkom'\)\}/)
  assert.match(app, /onLater=\{\(\) => setPref\('browsing', false\)\}/)
  // Sticky als laatste in de kolom: nooit over de rode eindkaart.
  const e = src('src/views/Edition.jsx')
  assert.ok(e.indexOf('<MaakVanJou') > e.indexOf('className="endcap"'))
  assert.match(src('src/styles/maak-van-jou.css'), /position: sticky;/)
})
