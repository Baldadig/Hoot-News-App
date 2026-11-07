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
import { placeholderBase, placeholderSet, PLACEHOLDER_COUNT, PLACEHOLDER_SHIFT } from '../shared/placeholder.mjs'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const fixture = JSON.parse(src('tests/fixtures/placeholder.json'))

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
  // Geleende intro's dragen hun bron, ook in de Editie (cardIntro geeft de bron mee: eigen geleende of reserve).
  assert.match(src('src/views/Edition.jsx'), /const \{ text: summary, via \} = cardIntro\(item, fit\)/)
  assert.match(src('src/views/Edition.jsx'), /— via \{via\}/)
  // Ook in het vergelijkpaneel en de Selectie-kaart, met de maat-aftrek; en in de app (DigestView).
  for (const f of ['src/views/Story.jsx', 'src/views/Vak.jsx']) {
    assert.match(src(f), /via \{item\.borrowedFrom\}/, f)
    assert.match(src(f), /fit\.max - viaLength\(item\), fit\.rek - viaLength\(item\)/, f)
  }
  assert.match(src('ios/Hoot/Views/DigestView.swift'), /viaLength\) \}\), !intro\.isEmpty \{ IntroText\(text: intro, .*suffix: item\.asItem\.introWithSource\)/)
})

test('iOS: een intro wordt gemeten en nooit afgekapt (geen lineLimit op een intro, IntroText overal)', () => {
  const components = src('ios/Hoot/Views/Components.swift')
  assert.equal((components.match(/IntroText\(text: intro,/g) || []).length, 3) // LeadCard in de gewone en de kaart-A+-vorm, plus 01 boven de vouw (vouwTekst)
  assert.equal((components.match(/IntroText\(text: intro\.text,/g) || []).length, 2) // ItemRow, gewone en kaart-A+-vorm: met de reserve-intro (Item.cardIntro)
  assert.doesNotMatch(components, /introWithSource\(intro\)\)\.font/)
  assert.doesNotMatch(src('ios/Hoot/Views/DigestView.swift'), /introWithSource\(intro\)\)\.font/)
  assert.match(src('ios/Hoot/Views/IntroText.swift'), /ViewThatFits\(in: \.vertical\)/)
})

const bundled = await build({ entryPoints: ['src/components/Beeld.jsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external' })
const mod = { exports: {} }
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports)
const render = (props) => renderToStaticMarkup(React.createElement(mod.exports.Beeld, props))

test('beeldloos: zonder beeld, of te klein voor de plek, het placeholderbeeld in hetzelfde vak (geen grijs vlak)', () => {
  const item = { id: 'a', title: 'Kop' }
  const n = placeholderBase('a') + 1
  assert.equal(render({ item, kind: 'tijdlijn', className: 'media' }), `<div class="media media--tl ph ph--${n}" data-ph="${n}" aria-hidden="true"></div>`)
  const klein = { ...item, image: 'https://www.bing.com/th?id=ONUT.k&pid=News&w=1200&h=675&c=7' }
  assert.match(render({ item: klein, kind: 'tijdlijn', fits: fitsLarge, className: 'media', imgKind: 'lead' }), /^<div class="media media--tl ph ph--\d+" data-ph="\d+" aria-hidden="true"><\/div>$/)
  assert.match(render({ item: klein, kind: 'lead', fits: fitsHero, className: 'media' }), /^<div class="media media--lead ph ph--\d"/)
  // De miniatuur: hetzelfde element als het beeld (een span in de Editie), met de kleine tekening.
  assert.equal(render({ item, kind: 'krant', as: 'span', className: 'thumb' }), `<span class="thumb ph ph--${n} ph--klein" data-ph="${n}" aria-hidden="true"></span>`)
  const groot = { ...item, image: 'https://www.bing.com/th?id=ONUT.g&pid=News&w=700&h=393' }
  assert.match(render({ item: groot, kind: 'tijdlijn', fits: fitsLarge, className: 'media media--tl', imgKind: 'lead' }), /^<div class="media media--tl"><img /)
  assert.match(render({ item: groot, kind: 'krant', as: 'span', className: 'thumb' }), /^<span class="thumb"><img /)
})

test('beeldloos: twee beeldloze rijen direct na elkaar krijgen nooit hetzelfde beeld (PlaceholderList)', () => {
  const { PlaceholderList, Beeld } = mod.exports
  const ids = Object.keys(fixture.lijsten[0].beelden)
  const html = renderToStaticMarkup(
    React.createElement(PlaceholderList, { rows: ids.map((id) => ({ item: { id }, kind: 'tijdlijn' })) }, ids.map((id) => React.createElement(Beeld, { key: id, item: { id }, kind: 'tijdlijn' }))),
  )
  assert.deepEqual([...html.matchAll(/data-ph="(\d+)"/g)].map((m) => +m[1]), ids.map((id) => fixture.lijsten[0].beelden[id]))
})

test('beeldloos: een beeld dat niet laadt wordt het placeholderbeeld (Img meldt het via onFail)', () => {
  const img = src('src/components/Img.jsx')
  assert.match(img, /if \(onFail\) return onFail\(\)/)
  const beeld = src('src/components/Beeld.jsx')
  assert.match(beeld, /failed\) return <Beeldloos item=\{item\} kind=\{kind\} as=\{Tag\} \/>/)
  // Hoofdverhaal, tijdlijn en krant (Stroom en Editie) gaan allemaal door Beeld.
  const items = src('src/components/Items.jsx')
  assert.equal((items.match(/<Beeld item=\{item\} kind="(lead|tijdlijn|krant)"/g) || []).length, 6) // hoofdverhaal, tijdlijn en krant, plus de drie van kaart A+ (KaartItem: groot, hoofdverhaal, klein rechts)
  assert.match(items, /kind="lead" priority=\{priority\} onLoad=\{priority \? rememberLead : undefined\} onFail=\{onFail\}/) // ook het gemeten hoofdbeeld (MeasuredImg meldt het via onFail)
  assert.match(src('src/components/Img.jsx'), /onError=\{e => \{ if \(onFail\) return onFail\(\)/)
  assert.match(src('src/views/Edition.jsx'), /<Beeld item=\{item\} kind="krant"/)
  // Stroom en Editie kennen de buren.
  assert.match(src('src/views/Stream.jsx'), /<PlaceholderList rows=/)
  assert.match(src('src/views/Edition.jsx'), /<PlaceholderList rows=/)
})

test('web met beelden uit: in de krant-vorm geen ruimte voor de miniatuur', () => {
  const css = src('src/styles.css')
  for (const v of ['uit', 'hoofd']) {
    for (const c of ['compact__link', 'fitem__link']) assert.match(css, new RegExp(`html\\[data-images='${v}'\\] \\.${c}[,\\s][^{]*\\{\\n  grid-template-columns: minmax\\(0, 1fr\\);`, 's'))
  }
  // De maat van de intro rekent dan met de hele kolom.
  assert.match(src('src/components/Items.jsx'), /introMax\(lineCount, 'rij', \(prefs\?\.images \?\? 'aan'\) === 'aan'\)/)
  assert.match(src('src/views/Edition.jsx'), /useIntroMax\(\)\(INTRO_LINES, \(prefs\?\.images \?\? 'aan'\) === 'aan' \? 'voorpagina' : 'rij', false, width\)/)
})

test('beeldloos: een beeld dat pas bij het laden mislukt, volgt ook de buurregel (PlaceholderList)', () => {
  const { planFor } = mod.exports
  const b = Array.from({ length: 200 }, (_, i) => `b${i}`).find((id) => placeholderBase(id) === placeholderBase('a'))
  const rows = [{ item: { id: 'a' }, kind: 'krant' }, { item: { id: b, image: 'https://images.nrc.nl/weg.jpg' }, kind: 'krant' }]
  assert.equal(planFor(rows).has(b), false) // met beeld: geen placeholder
  const plan = planFor(rows, new Set([b]))
  assert.equal(plan.get('a'), placeholderBase('a'))
  assert.equal(plan.get(b), (placeholderBase('a') + PLACEHOLDER_SHIFT) % PLACEHOLDER_COUNT) // niet hetzelfde beeld en niet dezelfde set als de buur
  assert.notEqual(placeholderSet(plan.get(b)), placeholderSet(plan.get('a')))
  // Beeld meldt het mislukken aan de lijst.
  assert.match(src('src/components/Beeld.jsx'), /markFailed\?\.\(item\?\.id\)/)
})
