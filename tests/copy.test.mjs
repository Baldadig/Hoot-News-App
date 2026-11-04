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

test('Welkom 1.1.0: vier schermen, Editie, Stroom en Selectie als gelijken, zonder oude stappen (W2)', () => {
  const s = read('views/Welcome.jsx')
  const i = ["title: 'Editie'", "title: 'Stroom'", "title: 'Selectie'"].map((t) => s.indexOf(t))
  assert.ok(i.every((x) => x >= 0), 'alle drie staan erin')
  assert.ok(i[0] < i[1] && i[1] < i[2], 'Editie, Stroom, Selectie')
  // Elk met zijn eigen zon (de zon achter de horizon), op één scherm.
  assert.match(s, /<SunArt kind=\{t\.kind\} className="ob__tart" \/>/)
  assert.ok(!/STEPS|Pagina \$\{/.test(s), 'geen stapteller of paginateller')
  assert.match(s, /Inloggen/)
  // Later kiezen kan altijd: bij de bronnen en bij de interesses.
  assert.equal(s.match(/>\s*Later kiezen\s*</g)?.length, 2)
  for (const old of ['Wat precies?', 'Overslaan', 'Veeg verder', 'PagedSourceGrid', 'Kies minstens één', 'Kies één bron']) assert.ok(!s.includes(old), old)
})

test('Welkom: papier op merkrood; gekozen is de pil met --sel-* en vinkje, geen eigen tegel (W2, C1)', () => {
  const css = read('styles.css')
  assert.match(css, /--paper-brand: #f5f1e8/)
  assert.match(css, /\.ob--open \{\s*--on-brand-red: var\(--paper-brand\)/)
  assert.ok(!css.includes('.ob__tile'), 'geen rubriektegels meer: pillen, zoals de app')
  assert.ok(!/\.ob__[a-z]+[^{]*\{[^}]*border-radius: var\(--radius-card\)/.test(css), 'geen omlijnde kaarten in Welkom')
  const s = read('views/Welcome.jsx')
  assert.match(s, /className="pill" aria-pressed=\{interests\.includes\(i\.id\)\}/)
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
  assert.match(welcome, /crossPlan\((first)?\)/) // de eerste keer 200 ms: je eerste Editie (tien.js)
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
  // relatieve tijd ("Bijgewerkt 20 min geleden") blijven; een kloktijd in de status is er niet meer.
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const files = walk(root).filter((f) => /\.(jsx?|mjs)$/.test(f))
  for (const f of files) {
    const s = strip(read(f.slice(root.length)))
    assert.doesNotMatch(s, /\bom \d{1,2}(:\d{2})? uur\b/, `${f}: "om N uur"`)
    assert.doesNotMatch(s, /\b0?[67]:00\b|\b1[27]:00\b/, `${f}: een editietijd als kloktijd`)
    assert.doesNotMatch(s, /staat klaar om|maandag om/, `${f}: kloktijd in een zin`)
    assert.doesNotMatch(s, /(bijgewerkt|gecontroleerd|opgehaald|versie van) om\b/i, `${f}: kloktijd in een status`)
  }
  assert.match(read('views/Edition.jsx'), /\{upNext\(edition\.slot\)\}/)
  // De dagdelen staan in één tabel (shared/slots.mjs, D1); iOS spiegelt hem.
  assert.equal(JSON.parse(readFileSync(new URL('../shared/slots.json', import.meta.url), 'utf8')).avond.volgende, 'morgenochtend')
  const vak = read('views/Vak.jsx')
  assert.match(vak, /De eerste Selectie komt/)
  assert.match(vak, /Elke maandagochtend een nieuwe\./) // gelijk aan iOS (DigestView)
  // Dezelfde drie dagdelen in dezelfde woorden als iOS (WelcomeView `.seintje`).
  // Settings zegt het niet meer (KISS): het ritme staat alleen op Over.
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
  assert.match(read('views/Stream.jsx'), /Opinie: zoals de bron het noemt/)
  assert.match(read('views/Privacy.jsx'), /‘meer\s+hiervan’ of ‘minder hiervan’/)
  assert.match(read('views/Search.jsx'), /Niets gevonden voor ‘\$\{q\.trim\(\)\}’/)
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
  // Selectie-index B: de laatste rij van de inhoud heet "Onderwerpen" met "3 gekozen" eronder.
  assert.match(vak, /name="Onderwerpen" sub=\{gekozen\}/)
  assert.match(vak, /`\$\{chosen\.length\} gekozen`/)
  assert.ok(!vak.includes('Onderwerpen ('), 'geen telling tussen haakjes meer')
  assert.match(read('lib/selection-index.js'), /n === 1 \? '1 stuk' : `\$\{n\} stukken`/)
  // 'vakgebied' alleen nog in code en commentaar, nooit in een zichtbare tekst.
  const strings = vak.replace(/\/\/.*$|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}/gm, '').match(/'[^']*'|"[^"]*"|`[^`]*`|>[^<{]+</g) || []
  assert.ok(strings.every((s) => !/vakgebied/i.test(s)), 'vakgebied niet in de tekst')
})

test('Welkom: kop en voet staan vast, de kolom ertussen scrolt; één linkerlijn (K4)', () => {
  const css = read('styles.css')
  assert.match(css, /\.ob__scroll \{\s*flex: 1;\s*min-height: 0;\s*overflow-y: auto;/)
  assert.match(css, /\.ob__head,\s*\.ob__col,\s*\.ob__foot \.col \{\s*width: 100%;[^}]*max-inline-size: var\(--measure\);/)
  // De zon: een tekening met de kleuren uit de CSS, niet uit de component.
  assert.match(css, /\.ob--open \.sun \{\s*--sun-disc: var\(--on-brand-red\);/)
})

test('Voorpagina: raster pas in een raam breder dan 48rem, met een zijkolom van 17rem tot 52rem (K5)', () => {
  const css = read('styles.css')
  // Strikt breder: het raam met het vergelijkpaneel open is op 1440 precies 48rem, en dan één kolom.
  assert.match(css, /@container front \(width > 48rem\) \{\s*\.front \{\s*display: grid;/)
  assert.ok(!/@container front \(min-width: 42rem\)/.test(css), 'de oude grens van 42rem is weg')
  assert.match(css, /@container front \(48rem < width < 52rem\) \{\s*\.front \{\s*--front-side: 17rem;/)
  // Keuze 1.1.0: breed (A) volgen na de zijkolom de paren; de twee onder het hoofdverhaal zijn weg.
  assert.ok(!/front__under/.test(css), 'geen .front__under meer')
})

test('De Editie telt: nummer in de kicker, "N van N" op de rode kaart, de bubbel telt niet (T3)', () => {
  const ed = read('views/Edition.jsx')
  assert.match(ed, /numberRows\(heroFirst\(/, 'de telling na heroFirst')
  assert.match(ed, /\{count\} van \{count\}/, '"van" op de kaart')
  assert.ok(ed.indexOf('endcap__count') < ed.indexOf('<EindeSun'), 'de telling staat boven de zon (het merk)')
  assert.match(read('components/Items.jsx'), /<EditionNumber key="n" n=\{n\}/)
  assert.match(read('components/EditionNumber.jsx'), /aria-label=\{two\(n\)\}/)
  assert.match(ed, /<LeadStory n=\{rows\[0\]\.n\}/)
  assert.match(ed, /<FrontItem n=\{r\.n\}/)
  // 04 en verder staan in de paren (breed) of de lijst eronder (smal), als FrontItem met hun nummer.
  assert.equal(ed.match(/<FrontItem n=\{r\.n\}/g)?.length, 2)
  assert.match(read('lib/edition.js'), /desk === 'bubbel' \? null/)
  const css = read('styles.css')
  // Minder rood (keuze B): het cijfer in inkt, de rubriek in --ink-3, één bronlabel "N bronnen ›" in --ink-2.
  assert.match(css, /\.kicker__n \{[^}]*font-family: var\(--serif\)[^}]*color: var\(--ink\);/)
  assert.match(css, /\.label--kicker \{\s*color: var\(--ink-3\);/)
  assert.match(css, /\.morebtn \{[^}]*color: var\(--ink-2\);/)
  assert.ok(!/morebtn__(long|short)/.test(read('components/Items.jsx')), 'geen tweede vorm van het bronlabel per breedte')
  assert.match(css, /\.is-read \.kicker__n \{\s*color: var\(--ink-3\)/)
})

test('Eén rechterlijn: de lijn onder de kop en de eindkaart stoppen op --measure, de iconenrij niet (K3)', () => {
  const css = read('styles.css')
  // Wat in de kop onder de rij staat (rubriekenlijn, stapel, metaregel) stopt op het leesblok ...
  assert.match(css, /\.col--read > \.vh > :where\(:not\(\.vh__row\)\)/)
  // ... maar de kop zelf niet: titel en iconen staan op elke tab op dezelfde plek.
  assert.doesNotMatch(css, /\.col--read > \.vh[,\s]*\{/)
  assert.match(css, /\.endcap \{[^}]*max-inline-size: var\(--measure\)/)
})

test('Schermtitel blijft head-5; korte hoofdkoppen head-6, lange koppen schalen via het gedeelde contract (B6)', () => {
  const tags = (s, cls) => [...s.matchAll(new RegExp(`className="([^"]*\\b${cls}\\b[^"]*)"`, 'g'))].map((m) => m[1].split(/\s+/))
  const screen = allSrc().flatMap((s) => tags(s, 'vh__title'))
  assert.ok(screen.length && screen.every((c) => c.includes('head-5')), 'schermtitel is head-5')
  assert.match(read('components/Items.jsx'), /headlineTier\(item.title\)/)
  assert.match(read('components/Items.jsx'), /head-lg.*head-5.*head-6/)
  const css = read('styles.css')
  const rem = (name) => Number(new RegExp(`--${name}: ([\\d.]+)rem`).exec(css)[1])
  assert.ok(rem('t6') > rem('t5') && rem('lh-6') > rem('lh-5'), 'de kop van het verhaal is groter dan de schermtitel')
})

test('KISS-teksten (kiss-teksten.json): geen rij zonder bediening, geen oude uitleg, contact info@gethoot.app', () => {
  const settings = read('views/Settings.jsx')
  assert.doesNotMatch(settings, /label="Edities"/, 'de uitlegrij Edities is weg')
  assert.doesNotMatch(settings, />Extra<|in het menu/, 'Extra heet Menu')
  assert.match(settings, /Telt vanaf je volgende Editie\./)
  assert.match(read('views/Edition.jsx'), /Jouw Editie: gekozen uit jouw bronnen en interesses\./, 'de Editie-hint is de korte KISS-tekst')
  for (const f of ['views/Over.jsx', 'views/Privacy.jsx']) {
    const s = read(f)
    assert.doesNotMatch(s, /hootnews\.nl/, `${f}: domein`)
    assert.match(s, /info@gethoot\.app/, `${f}: contact`)
  }
  assert.match(read('views/Privacy.jsx'), /De Redacteur[\s\S]*op je toestel/)
  assert.match(read('views/Stream.jsx'), /Je bent bij\./)
})
