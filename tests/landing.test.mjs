import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INLINE } from '../landing/inline.mjs'
import { appStore, APP_URL, PT, appUrl } from '../landing/appstore.mjs'
import { vulBewaard, fragmenten, redenen, vhTekst, VH_LOGOS } from '../landing/bewaard.mjs'
import { vragen, vragenHtml, jsonld, ruim, AI_STAP } from '../landing/vragen.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

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
const BEWAARD = JSON.parse(readFileSync(new URL('../landing/bewaard.json', import.meta.url), 'utf8'))
const velden = (aan) => {
  const as = appStore(aan), lijst = vragen({ aantal: SOURCES.length, appUrl: as.APP_URL_VRAAG })
  return { ...as, BRONNEN_RUIM: ruim(SOURCES.length).replace(/^./, (c) => c.toUpperCase()), VRAGEN: vragenHtml(lijst), JSONLD: jsonld({ lijst, appUrl: as.APP_URL_VRAAG, beschrijving: 'x' }), BESCHRIJVING: 'Hoot is een rustige nieuwslezer.', BRONRIJ: '<li>NOS</li>' }
}
const vul = (aan) => vulBewaard(SRC, BEWAARD).replace(/\{\{(APPSTORE_\w+|APP_URL_VRAAG|BRONNEN_RUIM|BRONRIJ|VRAGEN|JSONLD|BESCHRIJVING)\}\}/g, (_, k) => velden(aan)[k])
const tekst = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/ ([.,])/g, '$1')

test('landing: overal dezelfde accountzin, en het account in de eerste vraag', () => {
  for (const aan of [false, true]) {
    const html = vul(aan)
    assert.doesNotMatch(html, /Gratis, zonder account|Geen account nodig|Gratis lezen\./)
    // held en slot
    assert.ok((html.match(/Gratis, met of zonder account\./g) || []).length >= 2)
  }
  assert.match(vul(true), /<summary>Is Hoot gratis\?<\/summary>\s*<p>Ja\. Je leest meteen, zonder account\. Met een gratis account staan je bronnen en je bewaarde artikelen op al je toestellen\.<\/p>/)
})

test('bronnenblok: één verhaal met de bronnen die erover schrijven; het getal komt uit de catalogus', () => {
  const html = vul(true), t = tekst(html)
  assert.ok(t.includes('Jouw nieuws, rustig bij elkaar.'))
  assert.ok(t.includes(`Hoot legt wat je bronnen schrijven bij elkaar. ${ruim(SOURCES.length).replace(/^./, (c) => c.toUpperCase())} bronnen, jij kiest.`))
  assert.equal(ruim(84), 'ruim tachtig')
  assert.equal(ruim(80), 'tachtig')
  assert.equal(ruim(99), 'ruim negentig')
  assert.equal(ruim(100), 'honderd')
  assert.doesNotMatch(SRC, /voordeel-lijst/) // de vier voordelen zijn weg
  // de kaart: een echte kop uit de bewaarde Editie, de logo's als eigen bestanden (CSP: alleen de eigen site)
  const kaart = html.match(/<div class="verhaal js-verhaal"[\s\S]*?<\/section>/)[0]
  // de kaart opent met een ander verhaal dan de held er vlak boven
  const heldKop = html.match(/<div class="k-lead js-held-lead">[\s\S]*?<div class="k-kop k-kop--lead">([^<]*)</)[1]
  const kaartKop = kaart.match(/<p class="vh-kop js-vh-kop">([^<]*)</)[1]
  if ((BEWAARD.voorpagina.breed || []).length > 1) assert.notEqual(kaartKop, heldKop)
  assert.ok([...(BEWAARD.voorpagina.breed || []), BEWAARD.voorpagina.entries[0]].some((x) => tekst(kaart).includes(x.title)))
  for (const m of kaart.matchAll(/<img src="([^"]+)"/g)) {
    assert.match(m[1], /^\/img\/bronnen\/[a-z0-9-]+\.webp$/)
    assert.ok(SOURCES.some((x) => m[1] === `/img/bronnen/${x.id}.webp`), m[1] + ' is een bron uit de catalogus')
    readFileSync(new URL('../landing/bronnen/' + m[1].split('/').pop(), import.meta.url)) // het bestand bestaat
  }
  assert.ok((kaart.match(/<img /g) || []).length <= VH_LOGOS)
  assert.doesNotMatch(html, /<img[^>]+src="(?:https?:|data:)/)
  // één zin, in de build en in het script gelijk
  assert.equal(vhTekst({ sourceCount: 12, sources: [{ name: 'NOS' }, { name: 'NRC' }, { name: 'Trouw' }, { name: 'AD' }] }), '<b>12 bronnen</b> schrijven erover: NOS, NRC, Trouw en 9 andere.')
  assert.equal(vhTekst({ sourceCount: 1, sources: [] }), '<b>1 bron</b> schrijft erover.')
  assert.equal(vhTekst({ sourceCount: 2, sources: [{ name: 'NOS' }, { name: 'NRC' }] }), '<b>2 bronnen</b> schrijven erover: NOS, NRC.')
  // zonder brede verhalen in de terugval: plek 01, met de logo's die dat verhaal zelf draagt
  const kaal = fragmenten({ ...BEWAARD, voorpagina: { ...BEWAARD.voorpagina, breed: [] } })
  assert.equal((kaal.BW_VH_STAPEL.match(/<img /g) || []).length, Math.min(VH_LOGOS, (BEWAARD.voorpagina.entries[0].sources || []).length))
  assert.equal(kaal.BW_VH_KOP.replace(/&[a-z]+;/g, ''), BEWAARD.voorpagina.entries[0].title.replace(/[&<>"]/g, ''))
  // live neemt het over via ed.breed; er is voor elke bron uit de catalogus een logo
  const js = readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8')
  assert.match(js, /window\.hootVerhalen\(ed\.breed, vannu, lijst\[0\]\.title\)/)
  for (const x of SOURCES) readFileSync(new URL(`../landing/bronnen/${x.id}.webp`, import.meta.url))
  const meta = html.match(/<meta name="description" content="([^"]+)"/)[1]
  assert.match(SRC, /<title>Hoot · Nieuws met een einde · Rustige nieuwslezer<\/title>/)
  assert.ok(meta.length <= 160)
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
  assert.deepEqual(tabs, ['Alles', 'Binnenland', 'Wereld', 'Cultuur', 'Opinie']) // Opinie zoals in de app (server-tab na de rubrieken)
  // de tabletter is een deelbestand met precies deze tekens
  assert.match(readFileSync(new URL('../landing/letter.mjs', import.meta.url), 'utf8'), new RegExp(`TAB_TEKENS = '${tabs.join(' ')}'`))
  assert.match(readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8'), /var RUB = \['alles', 'binnenland', 'wereld', 'cultuur'\]/)
})

test('landing: de voorbeelden zijn van 1.1.0 (nummers, bubbel apart, Selectie met inhoud)', () => {
  const editie = vul(true).slice(vul(true).indexOf('id="demo-editie"'), vul(true).indexOf('<!-- 02 Stroom'))
  const nrs = [...editie.matchAll(/<span class="(?:k|sc)-nr">(\d\d)<\/span>/g)].map((m) => m[1])
  assert.deepEqual(nrs, ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'])
  // De bubbel komt na 10, zonder nummer, vóór het eindblok.
  const bubbel = editie.match(/<div class="sc-bubbel">([\s\S]*?)<div class="sc-blok">/)[1]
  assert.match(bubbel, /Buiten je bubbel/)
  assert.doesNotMatch(bubbel, /-nr"/)
  assert.ok(editie.indexOf('sc-bubbel') > editie.lastIndexOf('sc-nr'))
  assert.doesNotMatch(tekst(SRC), /Bluesky/)
  const sel = SRC.slice(SRC.indexOf('id="demo-selectie"'), SRC.indexOf('<!-- 04 Hoot kiest'))
  assert.ok(sel.indexOf('sc-inhoud') > 0 && sel.indexOf('sc-inhoud') < sel.indexOf('sc-kaart'), 'de inhoud staat boven het eerste stuk')
  assert.doesNotMatch(sel, /sc-chip/)
})

test('landing: de App Store staat klaar achter één regel in build.mjs', () => {
  assert.match(BUILD, /^const APP_STORE = true;$/m)
  for (const k of ['APPSTORE_META', 'APPSTORE_HELD', 'APPSTORE_SLOT', 'APPSTORE_KIEST', 'APPSTORE_OOK', 'APPSTORE_EINDE']) assert.ok(SRC.includes(`{{${k}}}`), k)
  const uit = vul(false), aan = vul(true)
  assert.doesNotMatch(uit, /apps\.apple\.com|apple-itunes-app/)
  assert.doesNotMatch(uit, /binnenkort/i)
  assert.doesNotMatch(uit, /class="wacht/)
  assert.doesNotMatch(uit, /App Store/)
  assert.match(uit, /<p class="kicker">Nieuwslezer voor iPhone, iPad en web<\/p>/)
  assert.match(uit, /href="\/lees\/" data-tel="web:held"><span class="t-web">Lees Hoot in je browser<\/span>/)
  assert.match(uit, /<p class="gratis">Gratis, met of zonder account\.<br>Geen advertenties\. Hoot volgt je niet\.<\/p>/)
  assert.equal(APP_URL, 'https://apps.apple.com/nl/app/id6828037269')
  assert.match(aan, /<meta name="apple-itunes-app" content="app-id=6828037269">/)
  // de pil in de held en in het slot, met de plek voor de teller; zonder pt= blijft de link kaal (alleen ct= meet niets)
  assert.match(aan, /<a class="wacht" href="[^"]+" data-tel="as:held">/)
  assert.match(aan, /<a class="wacht" href="[^"]+" data-tel="as:slot">/)
  if (!PT) assert.equal(appUrl('held'), APP_URL)
  else assert.match(appUrl('held'), /\?pt=[^&]+&ct=landing-held/)
  assert.match(aan, /<summary>Is er een app\?<\/summary>\s*<p>Ja, voor iPhone en iPad, in de <a href="[^"]+" data-tel="as:vraag">App Store<\/a>/)
  assert.match(aan, /<span class="ook-tel">Ook voor iPhone en iPad\.<\/span>/)
  // eigen pil met het Apple-logo in plaats van het h.-merk (keuze Alex, 13 november); ook onder 04 Hoot kiest
  const pil = aan.match(/<a class="wacht"[\s\S]*?<\/a>/)[0]
  assert.match(pil, /<use href="#i-apple"\/>/)
  assert.doesNotMatch(pil, /#mark/)
  assert.match(aan, /<symbol id="i-apple"/)
  assert.match(aan, /<a class="wacht" href="[^"]+" data-tel="as:kiest">/)
  const css = readFileSync(new URL('../landing/hoot.css', import.meta.url), 'utf8')
  assert.doesNotMatch(css, /(^|[^a])\.wacht:hover/)
  assert.match(css, /a\.wacht:hover\{box-shadow/)
  assert.match(css, /\.wacht\{[^}]*min-height:52px;[^}]*border-radius:999px/)
})

test('review 13 november: de nieuwe tekst uit deel 5', () => {
  const t = tekst(vul(true))
  for (const zin of [
    'Nieuwslezer voor iPhone, iPad en web',
    'Jij kiest de bronnen. Hoot kiest er drie keer per dag tien verhalen uit. Dan ben je bij.',
    'Lees Hoot in je browser',
    'Tien verhalen. Dan ben je bij.',
    'In de ochtend, de middag en de vroege avond staat er een Editie voor je klaar. Daarna is de dag weer van jou.',
    'Hier was je gebleven.',
    'De Stroom zet al je bronnen onder elkaar, nieuwste eerst, en onthoudt waar je was.',
    'Bijgepraat op maandag.',
    'Kies je vak en wat je verder boeit. Elke maandag houdt Hoot per onderwerp drie stukken over.',
    'Hoot kiest elke Editie.',
    'Uit jouw bronnen. Bij elk verhaal zie je waarom, bij groot nieuws ook hoe elke bron het brengt.',
    'Goed om te weten.',
    'Je weet genoeg.',
    'De Editie van nu staat voor je klaar.',
    'Lees de Editie van nu',
  ]) assert.ok(t.includes(zin), zin)
  assert.equal((SRC.match(/Lees de Editie van nu/g) || []).length, 2) // onder 01 en onder 04, verder niet
  assert.doesNotMatch(SRC, /href="\/lees\/#\/(stroom|selectie)/) // geen links die het welkom niet leveren
  assert.doesNotMatch(t, /Probeer Hoot op het web|Veelgestelde vragen|Voor iPhone, iPad en Web/)
  // zeven vragen, in dezelfde volgorde in de pagina en in het JSON-LD
  const lijst = vragen({ aantal: SOURCES.length, appUrl: APP_URL })
  assert.equal(lijst.length, 7)
  assert.deepEqual([...vul(true).matchAll(/<summary>([^<]+)<\/summary>/g)].map((m) => m[1]), lijst.map((x) => x[0]))
  const ld = JSON.parse(jsonld({ lijst, appUrl: APP_URL, beschrijving: 'x' }))
  assert.deepEqual(ld['@graph'][1].mainEntity.map((q) => q.name), lijst.map((x) => x[0]))
  assert.equal(ld['@graph'][0]['@type'], 'SoftwareApplication')
  assert.doesNotMatch(jsonld({ lijst: [['<x', '</script>']], appUrl: '', beschrijving: '' }), /<\/script/i)
  // de AI-stap alleen noemen als hij aan staat
  assert.equal(/taalmodel/.test(lijst[4][1]), AI_STAP)
  // citaten in de aria-labels tussen ‘…’, en geen dubbele dubbele punt
  const labels = [...SRC.matchAll(/aria-label="([^"]+)"/g)].map((m) => m[1])
  assert.ok(labels.some((l) => l.includes('‘Je bent bij.’')))
  assert.ok(labels.some((l) => l.includes('‘Hier was je gebleven’')))
  for (const l of labels) assert.ok((l.match(/:/g) || []).length <= 1, l)
  // de toestellen zijn beelden voor de schermlezer, het label van een band hoort bij zijn kop
  assert.equal((SRC.match(/<figure class="toestel[^"]*" role="img"/g) || []).length, 5)
  for (const id of ['editie', 'stroom', 'selectie', 'red']) assert.match(SRC, new RegExp(`aria-labelledby="lb-${id} h-${id}"`), id)
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
  // echte koppen van uitgevers: geen intro's van anderen op de landing (landing-live), alleen kop, uitgever en datum
  assert.doesNotMatch(vul(true), /<p class="k-intro">/)
  // geen losse illustraties meer op de pagina (ronde 1 staat in _archief)
  assert.doesNotMatch(SRC, /<svg class="il"/)
})

test('landing: de lijnen zijn terug (ringen, dagen-boog, stroomlijnen, persvel)', () => {
  assert.match(SRC, /class="rg rg1"/)
  assert.match(SRC, /<svg class="boog"/)
  assert.match(SRC, /class="water"/)
  assert.match(SRC, /vel-rg vel-rg1/) // het slotbeeld: de ondergaande zon met ringen (was het persvel met twee lijnen)
})

test('landing: grote koppen op rood eindigen met een punt in inkt; het logo blijft papier op rood', () => {
  assert.match(CSS, /\.rood \.punt\{color:#1A1814\}/)
  assert.match(CSS, /\.rood\{[^}]*--wm-dot:var\(--op-rood\)/)
  for (const kop of ['h-held', 'h-einde']) {
    const h = SRC.slice(SRC.indexOf(`id="${kop}"`), SRC.indexOf('</h', SRC.indexOf(`id="${kop}"`)))
    assert.match(h, /class="punt[ "]/, kop)
  }
  assert.match(SRC, /<p class="kicker">Nieuwslezer voor iPhone, iPad en web<\/p>/)
  assert.match(CSS, /\.held \.kicker\{[^}]*text-transform:none/)
})

test('landing: lopende tekst in Schibsted Grotesk, de lead op desktop 20/30', () => {
  for (const sel of ['.lead{', '.bronregel{', '.faq details p{']) {
    const r = CSS.slice(CSS.indexOf(sel), CSS.indexOf('}', CSS.indexOf(sel)))
    assert.match(r, /font:var\(--fw-brood\) 1\.0625rem\/1\.5 var\(--tekst\)/, sel)
    assert.doesNotMatch(r, /--lees/, sel)
  }
  assert.match(CSS, /\.lead\{font-size:1\.25rem;line-height:1\.875rem\}/)
  assert.equal((CSS.match(/--fw-brood:430/g) || []).length, 3) // Nacht: media, data-theme en .donker
})

test('landing: huisregels in de vragen (vroege avond, geen kloktijden, nooit "houdt op", geen gedachtestreepjes)', () => {
  const t = tekst(vul(true))
  assert.match(t, /in de ochtend, de middag en de vroege avond/i)
  assert.doesNotMatch(t, /middag en avond|\b\d{1,2}(:\d\d)? ?uur\b(?! geleden)|houdt op| – | — /)
  for (const w of ['Editie', 'Stroom', 'Selectie']) assert.doesNotMatch(t, new RegExp(`\\b(de|een) ${w.toLowerCase()}\\b`), w)
})

test('frisse ogen: de Stroom heeft een tab Opinie, dus de landing belooft geen nieuws "zonder de meningen eromheen"', () => {
  assert.doesNotMatch(SRC, /zonder de meningen/)
  assert.match(SRC, /<span data-m="opinie">Opinie<\/span>/)
})

// landing-live (audit punt 1): echte Editie, geen verzonnen kranten, de held zonder rubriek.
test('landing: geen verzonnen kranten; de voorbeelden komen uit een bewaarde, echte Editie met datum', () => {
  const html = vul(true)
  assert.doesNotMatch(html + BUILD, /Landelijk Dagblad|Stadskrant|Cultuurkrant|Weekblad Wereld|Omroep Nieuws/)
  assert.doesNotMatch(html, /\{\{BW_|\{\{PANELEN/)
  assert.match(BEWAARD.date, /^\d{4}-\d\d-\d\d$/)
  assert.ok(['ochtend', 'middag', 'avond'].includes(BEWAARD.slot))
  // geen kloktijden en geen "x uur geleden"
  assert.doesNotMatch(tekst(html), /\b\d{1,2}:\d\d\b|\b\d+ (?:min|minuten|uur) geleden/)
  // geen beelden van uitgevers: alleen eigen illustraties
  assert.doesNotMatch(html, /<img[^>]+src="https?:/)
})

test('landing: de held toont het hoofdverhaal zonder rubriek, alleen het nummer', () => {
  const held = vul(true).match(/<div class="k-lead js-held-lead">([\s\S]*?)<\/a>/)[1]
  assert.match(held, /<div class="k-kick k-kick--los"><span class="k-nr">01<\/span><\/div>/)
  for (const r of ['Binnenland', 'Wereld', 'Cultuur', 'Tech', 'Wetenschap']) assert.doesNotMatch(held.replace(/<div class="k-kop[^"]*">[^<]*<\/div>/, ''), new RegExp(r))
  const js = readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8')
  assert.match(js, /vul\(lead, lijst\[0\], [^;]*, false, wn\)/) // live: ook dan geen rubriek in de held
  assert.match(js, /if \(iso && iso === vandaagIso\(\)\) return 'Vandaag'/) // 'Vandaag' alleen voor de Editie van vandaag
})

// Keuring 1, herstel: de terugval zegt nooit 'Buiten je bubbel' zonder bubbel, en een verversing zonder Selectie breekt de build niet.
const zonderBubbel = () => {
  const b = JSON.parse(JSON.stringify(BEWAARD))
  b.voorpagina.bubble = null
  b.bubbel = null
  b.voorpagina.breed = [] // deze toets gaat over de drie plekken zelf, niet over het breedste verhaal
  b.voorpagina.entries[0].sourceCount = 6
  b.voorpagina.entries[1].sourceCount = 3
  b.voorpagina.entries[2] = { ...b.voorpagina.entries[1], title: 'Een gewoon derde verhaal', sourceCount: 1 }
  return b
}
const hootRedenen = () => {
  const js = readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8')
  return new Function(js.match(/function redenen\(ns, bubbel\) \{[\s\S]*?\n    \}/)[0] + '; return redenen;')()
}

test('herstel 1: zonder bubbel heet plek 3 "Ook het lezen waard", en de Editie-demo heeft geen leeg bubbelblok', () => {
  const html = vulBewaard(SRC, zonderBubbel())
  assert.doesNotMatch(html, /Buiten je bubbel/)
  assert.doesNotMatch(html, /class="sc-bubbel"/)
  assert.match(html, /data-bubbel="nee"/)
  assert.match(html, /<li class="r" data-bij="w3"><b>Ook het lezen waard<\/b>/)
  assert.match(html, /<mark data-w="w3">Ook het lezen waard<\/mark>/)
  // met bubbel blijft het zoals het was
  const met = vulBewaard(SRC, BEWAARD)
  assert.match(met, /data-bubbel="ja"/)
  assert.match(met, /<li class="r" data-bij="w3"><b>Buiten je bubbel<\/b>/)
})

test('herstel 1 en 3: één beslisregel in hoot.js en bewaard.mjs; zonder bubbel nooit twee keer dezelfde reden', () => {
  const r = hootRedenen()
  const gevallen = [[[6, 3, 1], true], [[6, 3, 1], false], [[1, 3, 1], false], [[1, 3, 1], true], [[3, 3, 1], false], [[3, 1, 1], false], [[1, 1, 1], true], [[6, 1, 2], false], [[5, 3, 3], false], [[3, 4, 1], true]]
  for (const [ns, bub] of gevallen) assert.deepEqual(r(ns, bub), redenen(ns, bub), `${ns} ${bub}`)
  assert.deepEqual(redenen([6, 3, 1], true), ['groot', 'meer', 'bubbel'])
  assert.deepEqual(redenen([6, 3, 1], false), ['groot', 'meer', 'eigen'])
  assert.equal(redenen([1, 3, 1], false), null) // plek 1 één bron, plek 2 meer: zonder bubbel zou plek 3 ook 'eigen' zijn
  assert.equal(redenen([3, 1, 1], false), null)
  // 'Eén bron schrijft erover' alleen bij echt één bron (keuring 2, punt 1)
  assert.equal(redenen([5, 3, 3], false), null) // plek 3 heeft drie bronnen: geen 'eigen'
  assert.equal(redenen([3, 4, 1], true), null) // plek 2 heeft vier bronnen maar plek 1 is al 'meer'
  assert.deepEqual(redenen([6, 3, 1], false), ['groot', 'meer', 'eigen']) // plek 3 echt één bron: wel 'eigen'
  for (const [ns, bub] of gevallen) { const x = redenen(ns, bub); if (x) assert.equal(new Set(x).size, 3) }
  const js = readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8')
  assert.match(js, /redenen\(ns0, pod\.getAttribute\('data-bubbel'\) === 'ja'\)/) // de terugval kijkt of er een bubbel is
  assert.match(js, /redenen\(ns, !!bub\)/) // live ook
  assert.match(js, /var bub = ed\.bubble && ed\.bubble\.title \? ed\.bubble : null/)
})

test('herstel 2: zonder Selectie een duidelijke melding in plaats van een TypeError; bewaar() houdt de vorige Selectie', () => {
  assert.throws(() => fragmenten({ ...BEWAARD, selectie: null }), /geen Selectie; ververs/)
  const src = readFileSync(new URL('../landing/bewaar.mjs', import.meta.url), 'utf8')
  assert.match(src, /if \(!selectie\) selectie = vorige\?\.selectie\?\.velden\?\.length \? vorige\.selectie : null/)
  assert.match(src, /if \(!selectie\) throw new Error/)
  assert.match(src, /if \(!redenen\(ns, !!vp\.bubble\)\) throw new Error/)
  // het schrijven gebeurt pas na bewaar(): een weigering laat het oude bestand staan
  assert.ok(src.indexOf('const uit = bewaar(feed, vak, vorige)') < src.indexOf('fs.writeFileSync'))
})

test('klein: in Hoot kiest staat het aantal bronnen één keer, in de markering', () => {
  const rd = vulBewaard(SRC, BEWAARD).match(/<div class="podium"[\s\S]*?<\/section>/)[0]
  assert.doesNotMatch(rd, /class="k-n"/)
  assert.match(readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8'), /if \(n >= 2 && !\$\('mark', it\)\)/)
})

// Review 13 november: het eerste scherm, de demo's, snelheid en zoekgegevens.
const JS = readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8')
import { PALET } from '../landing/inline.mjs'
test('review 13 november: de held is de Editie van nu, aantikbaar, met een zachte wissel', () => {
  assert.match(SRC, /<a class="nu js-held-link" href="\/lees\/" data-tel="web:toestel"/)
  assert.doesNotMatch(SRC, /nu-regel|van nu\. Lees verder/) // de regel bij het toestel is eruit (Alex, ronde 2)
  assert.match(JS, /setTimeout\(function \(\) \{ if \(ac\) ac\.abort\(\); \}, 4000\)/) // was 1500: te krap na stilte, dan bleef de terugval staan
  assert.match(CSS, /\.held \.k-kop--lead\{min-height:3\.6em\}/)
  assert.match(CSS, /\.js-held-lead,\.podium \.toestel,\.podium \.uitleg\{transition:opacity \.2s ease\}/)
  assert.match(SRC, /<link rel="preload" href="\/api\/voorpagina" as="fetch" crossorigin>/)
})
test('review 13 november: de bubbel over hetzelfde als plek 01 houdt Hoot kiest bewaard', () => {
  const overlap = new Function(JS.slice(JS.indexOf('function woorden('), JS.indexOf('window.hootOverlap')) + '; return overlap;')()
  assert.equal(overlap('Belastingplan aangenomen, en nu is de vraag wat de VVD gaat doen', 'Kamer stemt na maanden gesteggel in met vermogenswinstbelasting in box 3'), true)
  assert.equal(overlap('Belastingplan aangenomen', 'Bij Fontaines D.C. in de AFAS Dome kreeg de existentiële crisis een catwalk'), false)
  assert.match(JS, /var kiesLive = !!rd && !\(bub && overlap\(bub\.title, en\[0\]\.title\)\)/)
})
test("review 13 november: de demo's spelen één keer, zonder lus en zonder onzichtbare pauzeknop", () => {
  assert.doesNotMatch(JS, /setAttribute\('role', 'button'\)|pointerenter|herhaal/)
  assert.doesNotMatch(SRC, /data-motion=/)
  assert.match(JS, /rolNaar\(bij08\(\), afstand\(\), 1600/) // bij binnenkomst van regel 08 naar de rode kaart
  assert.match(CSS, /\.sc-rest li\{-webkit-mask:linear-gradient\(90deg,#000 calc\(100% - 2em\),transparent\)/)
  const editie = vul(true).slice(vul(true).indexOf('id="demo-editie"'), vul(true).indexOf('<!-- 02 Stroom'))
  assert.doesNotMatch(editie, /<small>/) // geen datum in de bronregels van de demo
})
test('review 13 november: snelheid (palet inline, script met defer, deelletter) en zoekgegevens', () => {
  assert.match(SRC, /<script>\{\{PALET\}\}<\/script>/)
  assert.match(SRC, /<script src="\/assets\/\{\{JSFILE\}\}" defer><\/script>/)
  assert.doesNotMatch(SRC, /newsreader-tekst/)
  assert.match(BUILD, /script-src 'self' '\$\{HASH\}' '\$\{HASH_PALET\}'/)
  new Function(PALET) // geldig script
  assert.match(PALET, /'#675B4A'/) // vroege avond: derde tekstkleur 5,26 op papier
  assert.doesNotMatch(PALET, /#6F6250/)
  assert.match(SRC, /<script type="application\/ld\+json">\{\{JSONLD\}\}<\/script>/)
})
test('review 13 november: één kopschaal en knoppen uit één familie', () => {
  assert.match(CSS, /h1\{font-size:clamp\(2\.75rem,1\.6rem \+ 5\.2vw,7rem\)\}/)
  assert.match(CSS, /h2\{font-size:clamp\(2\.25rem,9\.6vw,4rem\)\}/)
  assert.match(CSS, /\.bronnen h2,\.faq h2\{font-size:clamp\(1\.875rem,3\.3vw,2\.5rem\)/)
  assert.match(CSS, /\.einde h2\{font-size:clamp\(2\.5rem,12vw,9rem\)/)
  assert.doesNotMatch(CSS, /\.held h1\{font-size/)
  assert.doesNotMatch(CSS, /letter-spacing:\.(06|08|09|1)em/) // één spatiëring voor kapitalen
  assert.match(CSS, /--kap:\.08em/)
})
test('review 13 november: de gedeelde kaart zegt waar hij vandaan komt, met herkomst deel', async () => {
  const { handleSharePage } = await import('../netlify/functions/deel.mjs')
  const r = await handleSharePage(new Request('https://gethoot.app/deel/abc'), { find: async () => ({ title: 'Een kop', url: 'https://nos.nl/a', section: 'Binnenland', source: 'NOS' }) })
  const html = await r.text()
  assert.match(html, /<a href="\/\?via=deel">Gedeeld vanuit Hoot\.<\/a> Tien verhalen, drie keer per dag\. Dan ben je bij\./)
  assert.match(html, /<a href="\/\?via=deel"><b>hoot\.<\/b><\/a>/)
})

test('de rij bronnen boven de vragen: elk merk één keer, eigen logo-bestanden, de tweede helft verborgen voor schermlezers', () => {
  assert.match(SRC, /<div class="bronrij js-bronrij"><ul class="bronrij-in" aria-label="Een greep uit de bronnen">\{\{BRONRIJ\}\}<\/ul><\/div>/)
  assert.ok(SRC.indexOf('js-bronrij') > SRC.indexOf('id="vragen"') && SRC.indexOf('js-bronrij') < SRC.indexOf('id="h-vragen"'))
  assert.match(BUILD, /const DUBBEL = \/\^\(nos-\|guardian-\|bbc-sport\|npr-music\|politico-eu\)\//)
  assert.match(BUILD, /rijBronnen\.map\(\(x\) => pilR\(x, false\)\)\.join\(''\) \+ rijBronnen\.map\(\(x\) => pilR\(x, true\)\)/)
  assert.match(readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8'), /if \(!reduce && !brSleep && !document\.hidden\) brX -= 30 \* dt \* brRem/)
})

test('held: het breedste verhaal opent (niet de eerste rustige plek), en de bronregel toont het echte logo', () => {
  const js = readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8')
  assert.match(js, /if \(top && \(Number\(top\.sourceCount\) \|\| 0\) > \(Number\(en\[0\]\.sourceCount\) \|\| 0\)\) en = \[top\]\.concat\(en\.filter/)
  assert.match(js, /lg\.src = '\/img\/bronnen\/' \+ sid \+ '\.webp'/)
  // terugval: de bronregels in de toestellen dragen het logo uit de catalogus
  const held = vul(true).match(/<div class="k-lead js-held-lead">([\s\S]*?)<\/a>/)[1]
  assert.match(held, /<div class="k-bron"><img src="\/img\/bronnen\/[a-z0-9-]+\.webp" alt=""/)
  assert.match(CSS, /\.k-bron img\{[^}]*border-radius:50%/)
})

test('nazorg: de App Store-pil onder Hoot kiest is ook op iPhone en iPad in inkt; afbreken alleen in de smalle kolommen', () => {
  assert.match(CSS, /\.redacteur \.wacht,html\.ios \.redacteur \.wacht\{background:var\(--inkt\);color:var\(--papier\)/)
  assert.match(CSS, /\.ip-kol \.k-kop\{hyphens:auto/)
  assert.doesNotMatch(CSS, /\.ipad \.k-kop\{hyphens/)
  assert.match(readFileSync(new URL('../landing/hoot.js', import.meta.url), 'utf8'), /window\.hootVerhalen\(ed\.breed, vannu, lijst\[0\]\.title\)/)
})
