import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INLINE } from '../landing/inline.mjs'

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
const tekst = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

test('landing: overal dezelfde accountzin, en een eigen vraag over het account', () => {
  assert.doesNotMatch(SRC, /Gratis, zonder account|Geen account nodig|Gratis lezen\./)
  assert.ok((SRC.match(/Gratis, met of zonder account\./g) || []).length >= 3)
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

test('landing: de voorbeelden zijn van 1.1.0 (nummers, bubbel apart, Bluesky, Selectie met inhoud)', () => {
  const editie = SRC.slice(SRC.indexOf('id="demo-editie"'), SRC.indexOf('<!-- 02 Stroom'))
  const nrs = [...editie.matchAll(/<span class="sc-nr">(\d\d)<\/span>/g)].map((m) => m[1])
  assert.deepEqual(nrs, ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'])
  // De bubbel komt na 10, zonder nummer, vóór het eindblok.
  const bubbel = editie.match(/<div class="sc-bubbel">([\s\S]*?)<div class="sc-blok">/)[1]
  assert.match(bubbel, /Buiten je bubbel/)
  assert.doesNotMatch(bubbel, /sc-nr/)
  assert.ok(editie.indexOf('sc-bubbel') > editie.lastIndexOf('sc-nr'))
  assert.match(code(BUILD), /bsky\.social/)
  assert.match(tekst(SRC), /van Bluesky/)
  const sel = SRC.slice(SRC.indexOf('id="demo-selectie"'), SRC.indexOf('<!-- 04 De Redacteur'))
  assert.ok(sel.indexOf('sc-inhoud') > 0 && sel.indexOf('sc-inhoud') < sel.indexOf('sc-kaart'), 'de inhoud staat boven het eerste stuk')
  assert.doesNotMatch(sel, /sc-chip/)
})
