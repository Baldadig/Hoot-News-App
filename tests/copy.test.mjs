import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Statische controles op teksten en structuur die web en app gelijk houden ("Web gelijk aan app").
// Geen DOM: we lezen de bronbestanden.
const root = fileURLToPath(new URL('../src/', import.meta.url))
const read = (p) => readFileSync(join(root, p), 'utf8')
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : join(dir, f)))
const allSrc = () => walk(root).filter((f) => /\.(jsx?|mjs|css)$/.test(f)).map((f) => read(f.slice(root.length)))

test('Stroom-instelling heet "Lees de Stroom als" (W1)', () => {
  assert.match(read('components/Display.jsx'), /Lees de Stroom als/)
  assert.ok(allSrc().every((s) => !s.includes('Indeling van lijsten')))
})

test('Welkom: intro-punten in de volgorde van de app, vijf stappen, geen "In één minuut bij" (W2)', () => {
  const s = read('views/Welcome.jsx')
  const i = ['Je Editie', 'De Stroom', 'Je Selectie'].map((t) => s.indexOf(`title="${t}"`))
  assert.ok(i.every((x) => x >= 0), 'alle drie de titels staan erin')
  assert.ok(i[0] < i[1] && i[1] < i[2], 'Editie, Stroom, Selectie')
  assert.match(s, /const STEPS = 5\b/)
  assert.ok(!s.includes('In één minuut bij'))
  assert.match(s, /Inloggen/)
})

test('Welkom: papier op merkrood en gekozen tegels in --sel-* (W2)', () => {
  const css = read('styles.css')
  assert.match(css, /--paper-brand: #f5f1e8/)
  assert.match(css, /\.ob--open \{\s*--on-brand-red: var\(--paper-brand\)/)
  const tile = css.slice(css.indexOf(".ob__tile[aria-pressed='true'] {"))
  assert.match(tile.slice(0, 140), /--sel-edge[\s\S]*--sel-bg[\s\S]*--sel-fg/)
})

test('Opstartscherm: in index.html vóór de app, één sprong van 1,6 s, sessievlag, en Splash.jsx neemt het over (W4)', () => {
  const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')
  assert.match(html, /id="splash" class="splash" role="status" aria-label="Hoot laadt" hidden/)
  assert.match(html, /@keyframes splash-hop/)
  assert.match(html, /@keyframes splash-squash/)
  assert.ok((html.match(/1\.6s infinite/g) || []).length === 2, 'sprong en deuk allebei 1,6 s')
  assert.match(html, /sessionStorage\.getItem\('hoot:splashed'\)/)
  assert.match(html, /display-mode: standalone/)
  assert.match(html, /prefers-reduced-motion: reduce/)
  assert.match(html, /<path d="M34\.45 72L/, 'de tekening van het woordmerk (zelfde pad als Brand.jsx)')
  assert.match(read('components/Splash.jsx'), /getElementById\('splash'\)/)
  assert.match(read('App.jsx'), /<Splash /)
  // De Editie heeft op smal het kleine "hoot." waar het opstartscherm op landt.
  assert.match(read('views/Edition.jsx'), /className="edbrand"/)
  assert.match(read('styles.css'), /--z-splash/)
})

test('Welkom → Editie: de Editie staat al achter Welkom en Welkom vervaagt (W5)', () => {
  const app = read('App.jsx')
  assert.ok(!/showWelcome \? null : path/.test(app), 'achter Welkom tekent de Editie al')
  assert.match(app, /const shown = showWelcome \? \(reopenWelcome \? beforeWelcome\.current : 'editie'\) : path/)
  assert.match(app, /leaving=\{leavingWelcome\} onLeft=\{welcomeLeft\}/)
  const welcome = read('views/Welcome.jsx')
  assert.match(welcome, /crossPlan\(\)/)
  assert.match(welcome, /inert=\{leaving \? '' : undefined\}/)
})

test('Delen: deelknop naast bewaren, de link van de uitgever, "Link gekopieerd" zonder deelblad (W6)', () => {
  const items = read('components/Items.jsx')
  assert.match(items, /export function ShareButton/)
  assert.ok(items.indexOf('<ShareButton item={item} />') < items.indexOf('<SaveButton id={story.id} kind="story"'), 'in de actieregel staat delen vóór bewaren')
  assert.match(read('views/Story.jsx'), /<ShareButton item=\{lead\} label="verhaal" \/>/)
  assert.match(read('views/Vak.jsx'), /<ShareButton item=\{item\} label="stuk" \/>/)
  assert.match(read('lib/share.js'), /'Link gekopieerd'/)
  assert.match(read('App.jsx'), /shareNotice\(await shareItem\(item\)\)/)
  const css = read('styles.css')
  assert.match(css, /grid-template-areas: 'src more taste share save'/)
  // De kop van de app voor een bericht zonder kop (Bluesky) staat in de lib, niet in een component.
  assert.ok(!items.includes('linkTitle ||'), 'de deeltitel komt uit lib/share.js')
})

test('Geen kloktijden in webteksten: dagdelen in de Editie, de Selectie, Instellingen en Over (W7)', () => {
  // Commentaar telt niet mee (daar mag de server-afsluiting staan); 'uur geleden' en een
  // status-tijdstip ("Bijgewerkt om 13:50", zoals iOS "Je ziet de versie van 10:10") blijven.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const files = walk(root).filter((f) => /\.(jsx?|mjs)$/.test(f))
  for (const f of files) {
    const s = strip(read(f.slice(root.length)))
    assert.doesNotMatch(s, /\bom \d{1,2}(:\d{2})? uur\b/, `${f}: "om N uur"`)
    assert.doesNotMatch(s, /\b0?[67]:00\b|\b1[27]:00\b/, `${f}: een editietijd als kloktijd`)
    assert.doesNotMatch(s, /staat klaar om|maandag om/, `${f}: kloktijd in een zin`)
  }
  assert.match(read('views/Edition.jsx'), /\{upNext\(edition\.slot\)\}/)
  // De dagdelen staan in één tabel (shared/slots.mjs, D1); iOS spiegelt hem.
  assert.match(readFileSync(new URL('../shared/slots.mjs', import.meta.url), 'utf8'), /avond: \{[^}]*volgende: 'morgenochtend'/)
  const vak = read('views/Vak.jsx')
  assert.match(vak, /in de ochtend\.<\/p>/)
  assert.match(vak, /Elke maandagochtend een nieuwe\./)
  // Dezelfde drie dagdelen in dezelfde woorden als iOS (WelcomeView `.seintje`).
  assert.match(read('views/Settings.jsx'), /in de ochtend, middag en vroege avond\./)
  assert.match(read('views/Over.jsx'), /in de ochtend, middag en vroege avond\./)
  assert.match(read('views/Over.jsx'), /De Selectie verschijnt elke maandagochtend\./)
})
