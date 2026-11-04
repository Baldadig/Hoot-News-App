import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LOAD_STACK, LOAD_STACK_DONE, stackCards, nextStackState, glide, slotCorner } from '../src/lib/loadStack.js'

const result = await build({ entryPoints: ['src/components/LoadStack.jsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external' })
const module = { exports: {} }
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports)
const render = (props = {}) => renderToStaticMarkup(React.createElement(module.exports.LoadStack, props))
const near = (a, b) => Math.abs(a - b) < 1e-6
const same = (a, b) => near(a.x, b.x) && near(a.y, b.y) && near(a.width, b.width) && near(a.opacity, b.opacity)

test('Laadstapel: geen zin in beeld, wel de betekenis voor de schermlezer', () => {
  const html = render()
  assert.match(html, /role="status"/)
  assert.match(html, /aria-label="Even kijken bij je bronnen"/)
  assert.doesNotMatch(html, />Even kijken bij je bronnen</)
  assert.match(html, /<svg[^>]*aria-hidden="true"/)
  assert.equal((html.match(/class="lstack__sheet"/g) || []).length, 5)
  assert.equal((html.match(/class="lstack__kop"/g) || []).length, 1)
  assert.doesNotMatch(html, /<text|<path|brand/) // alleen geometrie: geen h., geen logo, geen letter
  assert.match(render({ done: true }), /class="lstack lstack--done"/)
})

test('Laadstapel: schuin op elkaar op het 8-pt-ritme, haarlijn op hele pixels', () => {
  const rest = stackCards(0, true)
  assert.deepEqual(rest.slice(0, 4).map((c) => [c.x, c.y]), [[8, 8], [16, 16], [24, 24], [32, 32]])
  for (const c of rest.slice(0, 4)) {
    assert.equal(c.width, 40); assert.equal(c.height, 24)
    assert.ok(c.x + c.width <= LOAD_STACK.width - 8 && c.y + c.height <= LOAD_STACK.box - 8) // 8 pt lucht rondom
  }
  assert.equal(rest[4].opacity, 0) // het nieuwe vel wacht onzichtbaar
  const html = render()
  assert.match(html, /viewBox="0 0 80 64"/)
  assert.match(html, /x="32.5" y="32.5" width="39" height="23"/) // voorste vel: 1 pt-lijn op hele pixels
  assert.match(html, /x="40" y="40" width="16" height="2"/) // de rode kopregel, op het voorste vel
})

test('Laadstapel: één beweging tegelijk, en de lus sluit zonder naad', () => {
  const at = (ms) => stackCards(ms)
  // 0–400: alleen de stapel schuift, het nieuwe vel staat stil
  assert.ok(same(at(200)[4], at(0)[4]))
  assert.ok(at(200)[0].opacity < 1 && at(200)[1].y < 16)
  // 400–800: alleen het nieuwe vel beweegt
  for (let i = 0; i < 4; i++) assert.ok(same(at(600)[i], at(400)[i]))
  assert.ok(at(600)[4].x > 32 && at(600)[4].x < 48)
  assert.ok(at(500)[4].opacity === 1 && at(420)[4].opacity < 1) // eerst even doorschijnend, dan dicht
  // 800–1600: stil
  at(800).forEach((c, i) => assert.ok(same(c, at(1500)[i])))
  // na de lus: wat zichtbaar is, is gelijk aan de rust (vier vellen op de vier plekken)
  const vis = (list) => list.filter((c) => c.opacity > 0.001).map((c) => `${c.x},${c.y},${c.width}`).sort()
  assert.deepEqual(vis(at(1599)), vis(at(0)))
  assert.deepEqual(vis(at(1600 * 7 + 1599)), vis(stackCards(0, true)))
  // het achterste vel verdwijnt achterom en het nieuwe komt van rechts: 16 pt
  assert.equal(at(400)[0].opacity, 0); assert.equal(at(400)[0].y, slotCorner(-1)); assert.equal(at(400)[0].x, 0)
  assert.equal(stackCards(400)[4].x - stackCards(800)[4].x, 16)
})

test('Laadstapel: rustig tempo en ease-glide', () => {
  assert.equal(LOAD_STACK.loop, 1600); assert.equal(LOAD_STACK.step, 400)
  assert.equal(glide(0), 0); assert.ok(near(glide(1), 1)); assert.ok(glide(0.5) > 0.85) // vlot weg, zacht geland
  assert.equal(LOAD_STACK_DONE, 440)
})

test('Laadstapel: klaar blijft even staan, een fout niet', () => {
  let s = { prev: true, hold: false }
  s = nextStackState(s, false, true); assert.deepEqual(s, { prev: false, hold: true })
  s = nextStackState({ prev: true, hold: false }, false, false); assert.deepEqual(s, { prev: false, hold: false })
  const same0 = { prev: false, hold: false }; assert.equal(nextStackState(same0, false), same0)
  assert.deepEqual(nextStackState({ prev: false, hold: true }, true), { prev: true, hold: false }) // opnieuw laden: weer de lus
})

test('Laadstapel: kleuren uit de tokens, Verminder beweging laat de lus weg, schermen gebruiken hem', () => {
  const css = readFileSync('src/styles.css', 'utf8')
  assert.match(css, /\.lstack__sheet \{ fill: var\(--paper\); stroke: var\(--ink-3\); stroke-width: 1;/)
  assert.match(css, /\.lstack__kop \{ fill: var\(--accent\);/)
  const jsx = readFileSync('src/components/LoadStack.jsx', 'utf8')
  assert.match(jsx, /prefers-reduced-motion: reduce/)
  for (const view of ['Edition', 'Stream', 'Vak']) {
    const src = readFileSync(`src/views/${view}.jsx`, 'utf8')
    assert.match(src, /<LoadStack done=\{stack\.done\} onDone=\{stack\.finish\} \/>/, view)
    assert.doesNotMatch(src, /<Skeleton/, view)
  }
  // gelijk aan de app
  const swift = readFileSync('ios/Hoot/Views/LoadStack.swift', 'utf8')
  for (const line of ['static let width: CGFloat = 80', 'static let box: CGFloat = 64', 'CGSize(width: 40, height: 24)', 'static let loop: Double = 1.6', 'static let step: Double = 0.4', 'static let slide: CGFloat = 16', 'CGRect(x: 40, y: 40, width: 16, height: 2)', 'static let kopIn: Double = 0.2', 'static let fadeOut: Double = 0.24', '8 + rhythm * CGFloat(k)', 'min(1, 2 * b)'])
    assert.ok(swift.includes(line), line)
})
