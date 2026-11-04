import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { irisKeyframes, tintTimes, openTimes, reducedPlan, reduced, IRIS, IRIS_BACK, IRIS_MS, FADE_MS, LAND, BOUNCE_MS, SPLASH_MAX_MS, SPLASH_IRIS_MS, SPLASH_LAND_MS, SPLASH_MARK, splashWanted, restDelay, splashTimes, landTimes, splashDot, fitWord, CROSS_MS, CROSS, crossPlan } from '../src/lib/motion.js'

// De iris (Welkom, W3): de getallen staan in de lib, niet in de component.

test('iris: van schermvullend tot de punt, zelfde middelpunt, straal = de diagonaal', () => {
  const [open, closed] = irisKeyframes({ x: 72.5, y: 50, r: 2.1, w: 375, h: 812 })
  const R = Math.hypot(375, 812)
  assert.equal(open, `circle(${Math.round(R * 100) / 100}px at 72.5px 50px)`)
  assert.equal(closed, 'circle(2.1px at 72.5px 50px)')
  // Alleen px en dezelfde vorm: anders interpoleert clip-path niet.
  assert.ok(!/%|vw|vh/.test(open + closed))
})

test('iris: de diagonaal dekt het scherm vanuit elk middelpunt', () => {
  const [open] = irisKeyframes({ x: 0, y: 0, r: 1, w: 1280, h: 900 })
  const R = parseFloat(open.match(/circle\(([\d.]+)px/)[1])
  assert.ok(R >= Math.hypot(1280, 900) - 0.01, 'tot in de verste hoek')
})

test('sluiten: punt weg op 35 %, tint vanaf 60 % over 40 %, een tiende langer dan de curve', () => {
  assert.deepEqual(tintTimes(700), { dotEnd: 245, tintStart: 420, tintDur: 280, end: 800 })
  assert.deepEqual(tintTimes(), tintTimes(IRIS_MS))
  assert.equal(IRIS_MS, 700)
})

test('openen: één beeld gesloten, kleur terug over 40 %, punt terug in de laatste 35 %', () => {
  const o = openTimes(700)
  assert.deepEqual(o, { delay: 32, tintDur: 280, dotStart: 455, dotDur: 245, end: 750 })
  assert.equal(o.dotStart + o.dotDur, 700, 'de punt is terug precies als de iris open is')
})

test('curves uit het brandboard en Minder beweging als fade van 0,35 s', () => {
  assert.equal(IRIS, 'cubic-bezier(0.6, 0, 0.2, 1)')
  assert.equal(IRIS_BACK, 'cubic-bezier(0.8, 0, 0.4, 1)')
  assert.deepEqual(reducedPlan(), { fade: 350 })
  assert.equal(FADE_MS, 350)
  assert.equal(reduced(), false, 'buiten de browser nooit')
})

// Het opstartscherm (W4): de maten uit SplashView/HootApp.swift en het brandboard §03.

test('opstart: één sprong van 1,6 s, hooguit 5 s, iris 0,7 s naar de Editie, landing 0,7 s op de intro', () => {
  assert.equal(BOUNCE_MS, 1600)
  assert.equal(SPLASH_MAX_MS, 5000)
  assert.equal(SPLASH_IRIS_MS, 700)
  assert.equal(SPLASH_LAND_MS, 700)
  assert.equal(LAND, 'cubic-bezier(0.3, 0, 0.1, 1)')
  assert.deepEqual(SPLASH_MARK, { w: 160, h: 49 })
})

test('opstart: bij een koude lading en op het beginscherm bij elke start', () => {
  assert.equal(splashWanted({ flagged: false, standalone: false }), true)
  assert.equal(splashWanted({ flagged: true, standalone: false }), false, 'binnen een sessie niet opnieuw')
  assert.equal(splashWanted({ flagged: true, standalone: true }), true, 'op het beginscherm wel')
})

test('opstart: vertrekken in de rust van de sprong (1,08–1,5 s), anders wachten tot de volgende rust', () => {
  assert.equal(restDelay(1100), 0)
  assert.equal(restDelay(1500), 0)
  assert.equal(restDelay(1080), 0)
  assert.equal(restDelay(0), 1080, 'net begonnen: tot 1,08 s')
  assert.equal(restDelay(1000), 80)
  assert.equal(restDelay(1550), 1130, 'voorbij de rust: een hele sprong min het stuk dat al om is')
  assert.equal(restDelay(1600 * 3 + 1200), 0, 'fase telt rond')
})

test('opstart → Editie: eerst vervagen (0,28 s), dan reist alleen de iris (vanaf 0,14 s, 0,7 s), tint 0,21 s op de punt', () => {
  assert.deepEqual(splashTimes(700), { fade: 280, delay: 140, travel: 700, tintStart: 840, tintDur: 210, end: 1100, fadeOwn: 150 })
  // Gelijk aan IrisTimes in SplashView.swift.
  const swift = readFileSync(new URL('../ios/Hoot/Views/SplashView.swift', import.meta.url), 'utf8')
  for (const [k, v] of Object.entries({ fade: 0.28, delay: 0.14, travel: 0.7, tint: 0.21, reduced: 0.35 })) assert.match(swift, new RegExp(`static let ${k} = ${v} `), k)
  // Het woord glijdt niet meer mee naar de app: alleen naar de rode intro van Welkom.
  const splash = readFileSync(new URL('../src/components/Splash.jsx', import.meta.url), 'utf8')
  assert.equal(splash.match(/glide\(/g)?.length, 1, 'één glide: alleen naar Welkom')
  assert.deepEqual(splashTimes(), splashTimes(SPLASH_IRIS_MS))
})

test('opstart → rode intro: woord landt op 55 %, dan 0,1 s rust en 0,3 s vervagen', () => {
  assert.deepEqual(landTimes(700), { word: 385, fadeAt: 485, fade: 300 })
  assert.deepEqual(landTimes(), landTimes(SPLASH_LAND_MS))
})

test('opstart: de eigen punt in rust, uit het kader van 160 × 49 (tekening gecentreerd)', () => {
  const d = splashDot({ left: 100, top: 200 })
  const k = 49 / 73.5
  const inset = (160 - 239.45 * k) / 2
  assert.ok(Math.abs(d.x - (100 + inset + 231.75 * k)) < 0.001)
  assert.ok(Math.abs(d.y - (200 + 65.8 * k)) < 0.001)
  assert.ok(Math.abs(d.r - 7.7 * k) < 0.001)
  assert.ok(Math.abs(d.r - 5.13) < 0.01, 'punt r ≈ 5,1 px, zoals iOS dotSize/2')
})

test('opstart: het woordmerk past op een ander "hoot." via zijn hoogte, punt op punt', () => {
  const from = { left: 0, top: 0, w: 160, h: 49, dot: { x: 154.5, y: 43.87, r: 5.13 } }
  const to = { left: 16, top: 24, w: 65.16, h: 20, dot: { x: 79.06, y: 41.9, r: 2.1 } }
  const f = fitWord(from, to)
  assert.ok(Math.abs(f.k - 20 / 49) < 0.0001)
  assert.equal(f.dx, 79.06 - 154.5)
  assert.ok(Math.abs(f.dy - (41.9 - 43.87)) < 0.001)
})

// Van Welkom naar de Editie (W5): een overvloeier van 0,45 s, alleen dekking, zoals HootApp.swift
// (`.easeInOut(duration: 0.45)` op `onboarded`). Ook bij Minder beweging: er verplaatst niets.

test('Welkom → Editie: overvloeier van 0,45 s ease-in-out, alleen dekking, ook bij Minder beweging', () => {
  assert.equal(CROSS_MS, 450)
  assert.equal(CROSS, 'ease-in-out')
  assert.deepEqual(crossPlan(), { fade: 450, easing: 'ease-in-out' })
})
