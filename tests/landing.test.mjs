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

test('landing: de voorbeelden houden zich aan de huisregels', () => {
  for (const [naam, s] of [['index', tekst(SRC)], ['build', code(BUILD)]]) {
    assert.doesNotMatch(s, /Omdat je \S+ volgt/, naam)
    assert.doesNotMatch(s, /Buitenland|Uit je eigen bronnen/, naam)
  }
  // De Stroom-tabs in de vaste volgorde van de app: Alles, dan de hoofdrubrieken.
  const tabs = [...SRC.match(/<div class="sc-tabrij">([\s\S]*?)<\/div>/)[1].matchAll(/data-m="\w+"[^>]*>([^<]+)</g)].map((m) => m[1])
  assert.deepEqual(tabs, ['Alles', 'Binnenland', 'Wereld', 'Cultuur'])
  assert.match(readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8'), /var RUB = \['alles', 'binnenland', 'wereld', 'cultuur'\]/)
})

test('landing: de voorbeelden zijn van 1.1.0 (nummers, bubbel apart, Selectie met inhoud)', () => {
  const editie = SRC.slice(SRC.indexOf('id="demo-editie"'), SRC.indexOf('<!-- 02 Stroom'))
  const nrs = [...editie.matchAll(/<span class="(?:k|sc)-nr">(\d\d)<\/span>/g)].map((m) => m[1])
  assert.deepEqual(nrs, ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'])
  // De bubbel komt na 10, zonder nummer, vóór het eindblok.
  const bubbel = editie.match(/<div class="sc-bubbel">([\s\S]*?)<div class="sc-blok">/)[1]
  assert.match(bubbel, /Buiten je bubbel/)
  assert.doesNotMatch(bubbel, /-nr"/)
  assert.ok(editie.indexOf('sc-bubbel') > editie.lastIndexOf('sc-nr'))
  assert.doesNotMatch(tekst(SRC), /Bluesky/)
  const sel = SRC.slice(SRC.indexOf('id="demo-selectie"'), SRC.indexOf('<!-- 04 De Redacteur'))
  assert.ok(sel.indexOf('sc-inhoud') > 0 && sel.indexOf('sc-inhoud') < sel.indexOf('sc-kaart'), 'de inhoud staat boven het eerste stuk')
  assert.doesNotMatch(sel, /sc-chip/)
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
    'De Redacteur kiest elke Editie.',
    'Bij elk verhaal zie je waarom.',
    'Lees verder in de Stroom',
    'Lees mee in je browser.',
  ]) assert.ok(t.includes(zin), zin)
  assert.doesNotMatch(t, /Of lees verder|Ontdek Hoot|Lees je laat|Met een inhoud bovenaan|Hoot onthoudt waar je was|Tien verhalen, en één/)
  // Meer kanten van één verhaal staat als vierde voordeel.
  assert.match(SRC, /de Selectie\.<\/span><\/h3>.*\n.*Meer kanten/)
  // Citaten in de aria-labels tussen ‘…’, en geen dubbele dubbele punt.
  const labels = [...SRC.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1])
  assert.ok(labels.some((l) => l.includes('‘Je bent bij.’')))
  assert.ok(labels.some((l) => l.includes('‘Hier was je gebleven’')))
  for (const l of labels) assert.ok((l.match(/:/g) || []).length <= 1, l)
})

test('landing: het deelbeeld is 1200 × 630', () => {
  const png = readFileSync(new URL('../landing/og.png', import.meta.url))
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
})

// Ronde 2 (Alex 5-11): toestellen met bijgewerkte schermen (kaart A+), de lijnen terug, zwarte punt op rood, brood schreefloos.
const CSS = readFileSync(new URL('../landing/hoot.css', import.meta.url), 'utf8')
test('landing: de schermen zijn kaart A+ van 1.1.0, met weinig tekst', () => {
  for (const id of ['demo-editie', 'demo-stroom', 'demo-selectie']) assert.ok(SRC.includes(`id="${id}"`), id)
  // hoofdverhaal 3:2 tot de rand met het nummer in rood, kaarten met beeld 2:1, de intro in Newsreader Text
  assert.match(CSS, /\.k-beeld\{[^}]*aspect-ratio:3\/2/)
  assert.match(CSS, /\.k-beeld2\{[^}]*aspect-ratio:2\/1/)
  assert.match(CSS, /\.k-lead \.k-nr\{[^}]*color:var\(--s-red\)/)
  assert.match(CSS, /\.k-intro\{[^}]*font-family:var\(--lees\);font-weight:var\(--lees-wght\);font-variation-settings:var\(--lees-vs\)/)
  assert.match(CSS, /--lees-wght:450;--lees-vs:"opsz" 12/)
  // korte intro's: hooguit twaalf woorden, en per scherm hooguit één intro (behalve de Stroom: één per rubriek)
  const intros = [...SRC.matchAll(/<p class="k-intro">([^<]+)<\/p>/g), ...BUILD.matchAll(/'([^']+)', 'il-/g)].map((m) => m[1])
  assert.ok(intros.length >= 4)
  for (const t of intros) assert.ok(t.split(/\s+/).length <= 12, t)
  // geen losse illustraties meer op de pagina (ronde 1 staat in _archief)
  assert.doesNotMatch(SRC, /<svg class="il"/)
})

test('landing: de lijnen zijn terug (ringen, dagen-boog, stroomlijnen, persvel)', () => {
  assert.match(SRC, /class="rg rg1"/)
  assert.match(SRC, /<svg class="boog"/)
  assert.match(SRC, /class="water"/)
  assert.match(SRC, /vel-r1/)
})

test('landing: grote koppen op rood eindigen met een punt in inkt; het logo blijft papier op rood', () => {
  assert.match(CSS, /\.rood \.punt\{color:#1A1814\}/)
  assert.match(CSS, /\.rood\{[^}]*--wm-dot:var\(--op-rood\)/)
  for (const kop of ['h-held', 'h-einde']) {
    const h = SRC.slice(SRC.indexOf(`id="${kop}"`), SRC.indexOf('</h', SRC.indexOf(`id="${kop}"`)))
    assert.match(h, /class="punt[ "]/, kop)
  }
  assert.match(SRC, /<p class="kicker">Voor iPhone, iPad en Web<\/p>/)
  assert.match(CSS, /\.held \.kicker\{[^}]*text-transform:none/)
})

test('landing: lopende tekst in Schibsted Grotesk, de lead op desktop 20/30', () => {
  for (const sel of ['.lead{', '.voordeel-lijst p{', '.faq details p{']) {
    const r = CSS.slice(CSS.indexOf(sel), CSS.indexOf('}', CSS.indexOf(sel)))
    assert.match(r, /font:var\(--fw-brood\) 1\.0625rem\/1\.5 var\(--tekst\)/, sel)
    assert.doesNotMatch(r, /--lees/, sel)
  }
  assert.match(CSS, /\.lead\{font-size:1\.25rem;line-height:1\.875rem\}/)
  assert.equal((CSS.match(/--fw-brood:430/g) || []).length, 3) // Nacht: media, data-theme en .donker
})

test('landing: huisregels in de FAQ (vroege avond, geen kloktijden)', () => {
  assert.match(SRC, /in de ochtend, de middag en de vroege avond/)
  assert.doesNotMatch(tekst(SRC), /middag en avond|\b\d{1,2}(:\d\d)? ?uur\b(?! geleden)/)
})
