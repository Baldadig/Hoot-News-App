// Kaart 01 op desktop (melding Alex, 11 november): een hoofdverhaal met een staand beeld dat te klein of
// onscherp is voor het hoofdvak (eigen of geleend) krijgt het placeholderbeeld. De link hield toch de
// staande vorm (.lead__link--portrait: raster 300 px | tekst), zodat placeholder, kop en intro in de
// rechterkolom vielen, links een leeg vak bleef en de bronregel los linksonder stond.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

const bundled = await build({ entryPoints: ['src/components/Items.jsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external', loader: { '.svg': 'text', '.png': 'empty', '.css': 'empty' }, logLevel: 'error' })
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports)
const { LeadStory, HootContext } = mod.exports

const ctx = { markRead() {}, read: new Set(), openSource() {}, openStory() {}, newInStory: () => 0, sourcesById: new Map(), prefs: {}, saved: {}, toggleSave() {} }
const lead = (item) => renderToStaticMarkup(React.createElement(HootContext.Provider, { value: ctx }, React.createElement(LeadStory, { item, n: 1 })))
const linkClass = (html) => html.match(/<a class="([^"]*)"/)[1]
const beeldClass = (html) => html.match(/<a [^>]*><div class="([^"]*)"/)[1]
const basis = { id: 'huang', kind: 'article', source: 'volkskrant', sourceName: 'de Volkskrant', title: 'Nvidia-topman Jensen Huang zat midden in de American dream', summary: 'Een reconstructie.', url: 'https://example.org/a' }
const meta = (w, h) => ({ w, h, crop: { l: 0, r: 0, t: 0, b: 0 } })

test('01 staand en scherp: staande vorm (beeld links, tekst rechts), zoals bedoeld', () => {
  const html = lead({ ...basis, image: 'https://img.test/staand.png', imageMeta: meta(1600, 2400) })
  assert.equal(linkClass(html), 'lead__link lead__link--portrait')
  assert.match(beeldClass(html), /\bmedia--portrait\b/)
  assert.doesNotMatch(beeldClass(html), /\bph\b/)
})

test('01 staand maar te klein (eigen of geleend beeld): placeholderbeeld in de gewone vorm, geen staand raster', () => {
  for (const extra of [{}, { imageFrom: 'NRC' }]) {
    const html = lead({ ...basis, ...extra, image: 'https://img.test/staand-klein.png', imageMeta: meta(600, 900) })
    assert.match(beeldClass(html), /^media media--lead ph ph--\d+$/)
    assert.equal(linkClass(html), 'lead__link', JSON.stringify(extra))
  }
})

test('01 zonder beeld of met een liggend beeld: gewone vorm', () => {
  assert.equal(linkClass(lead({ ...basis })), 'lead__link')
  assert.equal(linkClass(lead({ ...basis, image: 'https://img.test/liggend.png', imageMeta: meta(2000, 1333) })), 'lead__link')
})

test('vangnet: mislukt het laden pas later (placeholder zonder .media--portrait), dan geen raster', () => {
  const rust = src('src/styles/rust.css')
  assert.match(rust, /@media \(min-width: 720px\) \{\s*\.lead__link--portrait:not\(:has\(> \.media--portrait\)\) \{\s*display: flex;\s*\}\s*\}/)
  // Het raster zelf staat in styles.css (vastgelegd) en zet alles wat geen .media--portrait is in kolom 2.
  assert.match(src('src/styles.css'), /\.lead__link--portrait > :not\(\.media--portrait\) \{ grid-column: 2; \}/)
  // rust.css komt na styles.css.
  const main = src('src/main.jsx')
  assert.ok(main.indexOf("'./styles.css'") < main.indexOf("'./styles/rust.css'"))
})
