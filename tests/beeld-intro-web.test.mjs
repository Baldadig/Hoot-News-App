// Build 46, web: intro in 3 regels (hele zinnen, nooit "…") en de beeldloze vorm op één plek.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { wholeSentences, introMax, INTRO_LINES } from '../shared/zinnen.mjs'
import { fitsLarge, fitsHero } from '../src/lib/img.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('intro: standaard 3 regels; een eerste zin die in 2 regels wegviel, staat er nu heel', () => {
  assert.equal(INTRO_LINES, 3)
  const tl = (n) => introMax(n, { width: 343, font: 15 })
  const intro = 'De Democraten hebben bij de tussentijdse verkiezingen in de Verenigde Staten een grote overwinning behaald op de Republikeinen. Trump erkent zijn verlies niet.'
  assert.equal(wholeSentences(intro, tl(2).max, tl(2).rek), '') // te lang voor 2 regels: viel weg
  const drie = wholeSentences(intro, tl(3).max, tl(3).rek)
  assert.equal(drie, 'De Democraten hebben bij de tussentijdse verkiezingen in de Verenigde Staten een grote overwinning behaald op de Republikeinen.')
  assert.doesNotMatch(drie, /…|\.\.\.$/)
  // Nooit een beletselteken, ook niet bij een afgekapte bron.
  for (const t of ['Een zin die stopt middenin…', 'Eerste zin is af. Tweede zin stopt mid...']) {
    for (const n of [1, 2, 3]) assert.doesNotMatch(wholeSentences(t, tl(n).max, tl(n).rek), /…|\.\.\.$/)
  }
})

test('intro: Stroom, Editie en vergelijkpaneel gebruiken INTRO_LINES; de clamp van Editie en paneel ook 3', () => {
  assert.match(src('src/components/Items.jsx'), /plain \? INTRO_LINES : prefs\?\.preview \?\? INTRO_LINES/)
  assert.match(src('src/views/Edition.jsx'), /useIntroMax\(\)\(INTRO_LINES,/)
  assert.match(src('src/views/Story.jsx'), /useIntroMax\(\)\(INTRO_LINES, 'paneel'\)/)
  const css = src('src/styles.css')
  assert.match(css, /\.fitem__sum \{\n  --lines: 3;/)
  assert.match(css, /\.srcitem__sum \{\n  --lines: 3;/)
  // Geleende intro's dragen hun bron, ook in de Editie.
  assert.match(src('src/views/Edition.jsx'), /via \{item\.borrowedFrom\}/)
})

const bundled = await build({ entryPoints: ['src/components/Beeld.jsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external' })
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports)
const render = (props) => renderToStaticMarkup(React.createElement(mod.exports.Beeld, props))

test('beeldloos: zonder beeld, of te klein voor de plek, geen vak (geen grijs vlak) maar de beeldloze vorm', () => {
  const item = { id: 'a', title: 'Kop' }
  assert.equal(render({ item, kind: 'tijdlijn', className: 'media' }), '')
  const klein = { ...item, image: 'https://www.bing.com/th?id=ONUT.k&pid=News&w=1200&h=675&c=7' }
  assert.equal(render({ item: klein, kind: 'tijdlijn', fits: fitsLarge, className: 'media', imgKind: 'lead' }), '')
  assert.equal(render({ item: klein, kind: 'lead', fits: fitsHero, className: 'media' }), '')
  const groot = { ...item, image: 'https://www.bing.com/th?id=ONUT.g&pid=News&w=700&h=393' }
  assert.match(render({ item: groot, kind: 'tijdlijn', fits: fitsLarge, className: 'media media--tl', imgKind: 'lead' }), /^<div class="media media--tl"><img /)
  assert.match(render({ item: groot, kind: 'krant', as: 'span', className: 'thumb' }), /^<span class="thumb"><img /)
})

test('beeldloos: een beeld dat niet laadt wordt de beeldloze vorm (Img meldt het via onFail)', () => {
  const img = src('src/components/Img.jsx')
  assert.match(img, /if \(onFail\) return onFail\(\)/)
  const beeld = src('src/components/Beeld.jsx')
  assert.match(beeld, /failed\) return <Beeldloos item=\{item\} kind=\{kind\} \/>/)
  // Hoofdverhaal, tijdlijn en krant (Stroom en Editie) gaan allemaal door Beeld.
  const items = src('src/components/Items.jsx')
  assert.equal((items.match(/<Beeld item=\{item\} kind="(lead|tijdlijn|krant)"/g) || []).length, 3)
  assert.match(items, /onError=\{onFail\}/) // ook het gemeten hoofdbeeld
  assert.match(src('src/views/Edition.jsx'), /<Beeld item=\{item\} kind="krant"/)
})
