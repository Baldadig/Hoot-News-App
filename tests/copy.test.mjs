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

test('Aanhalen met ‘ ’: geen rechte aanhalingstekens om gebruikerstekst in de schermen (T6)', () => {
  // Alleen de .jsx-bestanden: daar staat tekst die je leest. Selectors als [data-id="${…}"] in
  // .js zijn code en blijven recht.
  const jsx = walk(root).filter((f) => f.endsWith('.jsx'))
  for (const f of jsx) {
    const src = read(f.slice(root.length))
    const hit = src.match(/["']\$\{[^}]*\}["']/)
    assert.equal(hit, null, `${f.slice(root.length)}: ${hit?.[0]}`)
    // Ook letterlijke tekst in JSX: "Opinie" of "meer hiervan" (ook over een regelafbreking). Een
    // attribuut (className="…") staat achter een =, dus dat telt niet; commentaar ook niet.
    const text = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1')
    const quoted = text.match(/(?:^|[\s(>])"(?=\p{L})[^"<>{}=\n]*(?:\n[^"<>{}=\n]*)?[\p{L}.!?…]"(?=[\s,.:;)!?<…]|$)/mu)
    assert.equal(quoted, null, `${f.slice(root.length)}: ${quoted?.[0].trim()}`)
  }
  assert.match(read('views/Stream.jsx'), /‘Opinie’ staat er alleen als/)
  assert.match(read('views/Privacy.jsx'), /‘meer\s+hiervan’ of ‘minder hiervan’/)
  assert.match(read('views/Search.jsx'), /Niets gevonden voor ‘\$\{q\.trim\(\)\}’/)
})

test('Welkom: één stapteller als breuk met breukstreep ⁄, zonder spatie (T7)', () => {
  const s = read('views/Welcome.jsx')
  const n = s.match(/<span className="ob__n"[^>]*>[^\n]*<\/span>/g) || []
  assert.equal(n.length, 2, 'beide tellers op één regel')
  assert.ok(n.every((t) => /\}>(\{step \+ 1\}|1)<small>⁄\{STEPS\}<\/small><\/span>/.test(t)))
  assert.ok(!/<small>\/\{STEPS\}/.test(s))
})

test('Schakelaar aan is inkt, geen rood; tabelcijfers alleen in de schreefloze tijdregels (K2, T8)', () => {
  const css = read('styles.css')
  const on = css.slice(css.indexOf(".switch[aria-checked='true'] .switch__track {")).slice(0, 120)
  assert.match(on, /background: var\(--ink\);\s*box-shadow: inset 0 0 0 1px var\(--ink\)/)
  // Alleen de schreefloze tijdregels: Newsreader (Fontsource latin 400/800) heeft geen tnum, dus een
  // serif-nummer (.ob__n, .dtoc__n, .dcard__rank) erin zetten doet niets.
  assert.match(css, /:is\(\.srcmeta__time, \.srcbtn__time\) \{\s*font-variant-numeric: tabular-nums;/)
  const tnum = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]*\{\s*font-variant-numeric: tabular-nums;/g) || []
  assert.ok(tnum.every((r) => !/\.ob__n|\.dtoc__n|\.dcard__rank/.test(r)), 'geen tabelcijfers op een serif-nummer')
})

test('Beeldverhoudingen zijn tokens: Tijdlijn 2:1 als --media-tl, ook in tokens.json en de README (D4)', () => {
  const css = read('styles.css')
  assert.match(css, /--media-tl: 2 \/ 1;/)
  assert.match(css, /\.media--tl \{[^}]*aspect-ratio: var\(--media-tl\);/)
  // Geen losse verhouding meer buiten de tokens.
  assert.deepEqual(css.match(/aspect-ratio: \d/g), null)
  const docs = fileURLToPath(new URL('../docs/design-system/', import.meta.url))
  const tokens = JSON.parse(readFileSync(join(docs, 'tokens.json'), 'utf8'))
  const names = Object.values(tokens).flatMap((g) => g?.tokens?.map((t) => t.name) || [])
  for (const n of ['media-tl', 'thumb', 'lh-4', 'lh-head-lg']) assert.ok(names.includes(n), n)
  const readme = readFileSync(join(docs, 'README.md'), 'utf8')
  for (const n of ['`media-tl`', '`lh-4`', '`lh-head-lg`']) assert.ok(readme.includes(n), n)
})

test('Selectie zegt overal onderwerpen: "Onderwerpen · 3" en "1 stuk" (C5, zoals iOS)', () => {
  const vak = read('views/Vak.jsx')
  assert.match(vak, /`Onderwerpen · \$\{chosen\.length\}`/)
  assert.ok(!vak.includes('Onderwerpen ('), 'geen telling tussen haakjes meer')
  assert.match(vak, /picked === 1 \? '1 stuk' : `\$\{picked\} stukken`/)
  // 'vakgebied' alleen nog in code en commentaar, nooit in een zichtbare tekst.
  const strings = vak.replace(/\/\/.*$|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}/gm, '').match(/'[^']*'|"[^"]*"|`[^`]*`|>[^<{]+</g) || []
  assert.ok(strings.every((s) => !/vakgebied/i.test(s)), 'vakgebied niet in de tekst')
})

test('Welkom 1 onder 720: de drie punten verdelen het rood tussen belofte en knop (K4)', () => {
  const css = read('styles.css')
  const block = css.slice(css.indexOf('@media (max-width: 719px) {')).slice(0, 260)
  assert.match(block, /\.ob__red > \.ob__col \{\s*display: flex;\s*flex-direction: column;/)
  assert.match(block, /\.ob__red \.ob__points \{\s*margin-block: auto;/)
})

test('Voorpagina: raster pas in een raam breder dan 48rem, met een zijkolom van 17rem tot 52rem (K5)', () => {
  const css = read('styles.css')
  // Strikt breder: het raam met het vergelijkpaneel open is op 1440 precies 48rem, en dan één kolom.
  assert.match(css, /@container front \(width > 48rem\) \{\s*\.front \{\s*display: grid;/)
  assert.ok(!/@container front \(min-width: 42rem\)/.test(css), 'de oude grens van 42rem is weg')
  assert.match(css, /@container front \(48rem < width < 52rem\) \{\s*\.front \{\s*--front-side: 17rem;/)
  assert.match(css, /@container front \(min-width: 52rem\)/)
})
