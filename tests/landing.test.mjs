import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INLINE } from '../landing/inline.mjs'
import { appStore, APP_URL } from '../landing/appstore.mjs'

// Voert het inline script van de landing uit met een nagebootste adresbalk; geeft het doel of null.
const run = (search, hash) => {
  let target = null
  new Function('location', INLINE)({ search, hash, replace: (u) => { target = u } })
  return target
}

test('landing: Google-terugkeer gaat naar /lees/, ook met state vóór id_token en bij een fout', () => {
  assert.equal(run('', '#state=s1&id_token=abc.def&authuser=0'), '/lees/#state=s1&id_token=abc.def&authuser=0')
  assert.equal(run('', '#id_token=abc&state=s1'), '/lees/#id_token=abc&state=s1')
  assert.equal(run('', '#error=access_denied&state=s1'), '/lees/#error=access_denied&state=s1')
})

test('landing: oude app-links en uitnodigingen gaan mee; gewone ankers blijven op de landing', () => {
  assert.equal(run('', '#/stroom/sport'), '/lees/#/stroom/sport')
  assert.equal(run('?uitnodiging=abc', ''), '/lees/?uitnodiging=abc')
  assert.equal(run('', '#stroom'), null)
  assert.equal(run('', ''), null)
})

const SRC = readFileSync(new URL('../landing/index.src.html', import.meta.url), 'utf8')
// Alleen de zichtbare tekst en de attributen die voorgelezen of gedeeld worden; geen opmaak.
// De pagina zoals build.mjs hem vult, met de App Store-plekken uit of aan.
const vul = (aan) => SRC.replace(/\{\{(APPSTORE_\w+)\}\}/g, (_, k) => appStore(aan)[k])
const tekst = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

test('landing: overal dezelfde accountzin, en een eigen vraag over het account', () => {
  for (const aan of [false, true]) {
    const html = vul(aan)
    assert.doesNotMatch(html, /Gratis, zonder account|Geen account nodig|Gratis lezen\./)
    // meta, held (desktop en mobiel) en slot
    assert.ok((html.match(/Gratis, met of zonder account\./g) || []).length >= 4)
  }
  assert.match(SRC, /<summary>Heb ik een account nodig\?<\/summary>\s*<p>Nee\. Je kunt meteen lezen\. Met een gratis account heb je je bronnen en Bewaard op al je toestellen\.<\/p>/)
})

test('landing: de drie delen gelijkwaardig in de voordelen en in de meta-omschrijving', () => {
  const lijst = SRC.match(/<ul class="voordeel-lijst">([\s\S]*?)<\/ul>/)[1]
  const koppen = tekst((lijst.match(/<h3>[\s\S]*?<\/h3>/g) || []).join(' '))
  for (const deel of ['Editie', 'Stroom', 'Selectie']) assert.match(koppen, new RegExp(`\\b${deel}\\b`), deel)
  assert.equal((lijst.match(/<li>/g) || []).length, 4)
  const meta = SRC.match(/<meta name="description" content="([^"]+)"/)[1]
  for (const deel of ['Editie', 'Stroom', 'Selectie']) assert.match(meta, new RegExp(deel), deel)
})

const BUILD = readFileSync(new URL('../landing/build.mjs', import.meta.url), 'utf8')
const code = (js) => js.replace(/^\s*\/\/.*$/gm, '')

test('landing: de teksten houden zich aan de huisregels', () => {
  for (const [naam, s] of [['index', tekst(SRC)], ['build', code(BUILD)]]) {
    assert.doesNotMatch(s, /Omdat je \S+ volgt/, naam)
    assert.doesNotMatch(s, /Buitenland|Uit je eigen bronnen|houdt op/, naam)
    assert.doesNotMatch(s, /\b\d{1,2}(:\d\d)? ?uur\b/, naam) // geen kloktijden
  }
})

// Rustig (Alex 5-11): geen toestellen met schermtekst, beelden zonder tekst en zonder lijnen, de punt achter koppen op rood in inkt.
const CSS = readFileSync(new URL('../landing/hoot.css', import.meta.url), 'utf8')
const JS = readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8')
test('landing: geen schermbeelden, de beelden zijn vlakken zonder tekst of lijnen', () => {
  assert.doesNotMatch(SRC, /class="(toestel|scherm|ipad)\b|sc-[a-z]/)
  assert.doesNotMatch(CSS, /\.toestel|\.sc-[a-z]|\.rg[123]|\.dagen|\.podium/)
  const svgs = SRC.match(/<svg class="il"[\s\S]*?<\/svg>/g) || []
  assert.equal(svgs.length, 5) // held, Editie, Stroom, Selectie, De Redacteur
  for (const s of svgs) {
    assert.doesNotMatch(s, /<(text|line|polyline|path)\b/, 'geen tekst of lijnen in een beeld')
    assert.doesNotMatch(s, /stroke=/)
  }
  // De punten van Selectie en De Redacteur komen uit build.mjs: alleen cirkels, één rode per beeld.
  for (const naam of ['RASTER', 'TIEN']) {
    const blok = BUILD.slice(BUILD.indexOf(`const ${naam} =`), BUILD.indexOf('}).join', BUILD.indexOf(`const ${naam} =`)))
    assert.match(blok, /<circle class="\$\{|il-rood/)
    assert.doesNotMatch(blok, /<(text|line|path)\b/)
  }
  // geen sierlijnen: geen horizon- of persvel-regels, geen randen tussen voordelen, vragen of boven de voet
  assert.doesNotMatch(CSS, /vel-hor|vel-r1|vel-r2|border-(top|bottom):1px/)
  // geen herhalende demo's meer; wel de ene keer opkomende zon en de stuiterende punt
  assert.doesNotMatch(JS, /requestAnimationFrame\(tik\)|\/api\/voorpagina/)
  assert.match(JS, /beeld-held/)
})

test('landing: grote koppen op rood eindigen met een punt in inkt; het logo blijft papier op rood', () => {
  assert.match(CSS, /\.rood \.punt\{color:#1A1814\}/)
  assert.match(CSS, /\.rood\{[^}]*--wm-dot:var\(--op-rood\)/)
  for (const kop of ['h-held', 'h-einde']) {
    const h = SRC.slice(SRC.indexOf(`id="${kop}"`), SRC.indexOf('</h', SRC.indexOf(`id="${kop}"`)))
    assert.match(h, /class="punt[ "]/, kop)
  }
})

test('landing: lopende tekst in de leesletter van intro 4, alleen in de landing ingesteld', () => {
  assert.match(CSS, /--lees-wght:450;--lees-vs:"opsz" 12/)
  assert.equal((CSS.match(/--lees-wght:480/g) || []).length, 3) // Nacht: media, data-theme en .donker
  for (const sel of ['.lead{', '.voordeel-lijst p{', '.faq details p{', '.redenen p{']) {
    const r = CSS.slice(CSS.indexOf(sel), CSS.indexOf('}', CSS.indexOf(sel)))
    assert.match(r, /font-family:var\(--lees\);font-weight:var\(--lees-wght\);font-variation-settings:var\(--lees-vs\)/, sel)
  }
  assert.match(CSS, /font-size:1\.0625rem;line-height:1\.5rem/) // 17/24 zoals de intro in de app
})

test('landing: de App Store staat klaar achter één regel in build.mjs', () => {
  // Nu uit: de App Store-pagina geeft nog 404.
  assert.match(BUILD, /^const APP_STORE = false;$/m)
  for (const k of ['APPSTORE_META', 'APPSTORE_HELD', 'APPSTORE_LEAD', 'APPSTORE_EINDE', 'APPSTORE_VRAAG']) assert.ok(SRC.includes(`{{${k}}}`), k)
  const uit = vul(false), aan = vul(true)
  assert.doesNotMatch(uit, /apps\.apple\.com|apple-itunes-app/)
  assert.match(uit, /<p class="wacht">[\s\S]*?Binnenkort[\s\S]*?<\/p>/)
  assert.match(uit, /<summary>Wanneer staat Hoot in de App Store\?<\/summary>\s*<p>Binnenkort, in Nederland en België\./)
  assert.equal(APP_URL, 'https://apps.apple.com/nl/app/id6828037269')
  assert.match(aan, /<meta name="apple-itunes-app" content="app-id=6828037269">/)
  assert.match(aan, new RegExp(`<a class="wacht" href="${APP_URL}">`))
  assert.match(aan, new RegExp(`Ook in de <a href="${APP_URL}">App Store</a>\\.`))
  assert.doesNotMatch(aan, /Binnenkort/)
  // De hover-ring alleen op de link, niet op de pil die (nog) tekst is.
  const css = readFileSync(new URL('../landing/hoot.css', import.meta.url), 'utf8')
  assert.doesNotMatch(css, /(^|[^a])\.wacht:hover/)
  assert.match(css, /a\.wacht:hover\{box-shadow/)
})

test('landing: de kleine tekstronde uit de review', () => {
  const t = tekst(vul(false))
  for (const zin of [
    'Elke maandag de mooiste stukken van de week, over je vak en wat je verder boeit.',
    'De Redacteur kiest je verhalen en zegt erbij waarom. Klopt het niet? Zeg het met ‘Klopt dit niet?’.',
    'Lees mee in je browser.',
  ]) assert.ok(t.includes(zin), zin)
  assert.doesNotMatch(t, /Of lees verder|Ontdek Hoot|Lees je laat|Met een inhoud bovenaan|Hoot onthoudt waar je was|Tien verhalen, en één/)
  // Meer kanten van één verhaal staat als vierde voordeel.
  assert.match(SRC, /de Selectie\.<\/span><\/h3>.*\n.*Meer kanten/)
  // Geen dubbele dubbele punt in de aria-labels.
  const labels = [...SRC.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1])
  for (const l of labels) assert.ok((l.match(/:/g) || []).length <= 1, l)
})

test('landing: het deelbeeld is 1200 × 630', () => {
  const png = readFileSync(new URL('../landing/og.png', import.meta.url))
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
})
