// Selectie-review 14 november, punt 3: "N vakbronnen schreven erover" klopte vaak niet. Cijfers en productnamen maakten
// valse groepen, en Sidebar (die alleen linkt) telde als bron. Nu: geen getal of naam als enige grond, een curator telt
// niet, en de kaart noemt de andere bronnen bij naam ("Ook bij …") in plaats van een telregel. De vier fout gegroepeerde
// gevallen uit week 45 en de echte groepen die moeten blijven.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sameSubject, composeVak, VAK_SOURCES } from '../netlify/lib/vak.mjs'

const NOW = Date.parse('2026-11-12T10:00:00Z')
const AT = '2026-11-05T09:00:00.000Z'
const src = (id) => VAK_SOURCES.find((s) => s.id === 'vak:' + id)
let n = 0
const it = (source, title, summary = '', more = {}) => ({ id: 'i' + n++, source: 'vak:' + source, sourceName: src(source).name, title, summary, url: `https://example.org/${n}`, publishedAt: AT, ...more })
const fieldOf = (out, id) => out.fields.find((f) => f.id === id)

test('Games, plek 1: een recensie van Guardians of the Galaxy hoort niet bij de verkoopcijfers van de Switch 2', () => {
  const review = it('nwtv', 'Guardians of the Galaxy Nintendo Switch 2', 'Fans van superhelden kunnen de komende tijd smullen met titels als Avengers: Doomsday.')
  for (const title of ['Nintendo says it isn’t planning any more Switch 2 price hikes', 'Nintendo verkoopt 41 procent minder Switch 2-consoles na prijsverhoging door ram', 'One of Nintendo’s Switch and Switch 2 cartridge manufacturers is exiting the business']) {
    assert.equal(sameSubject(review, it('eurogamer', title)), false, title)
  }
  const out = composeVak([review, it('eurogamer', 'Nintendo says it isn’t planning any more Switch 2 price hikes'), it('tweakers-games', 'Nintendo verkoopt 41 procent minder Switch 2-consoles na prijsverhoging door ram')], { now: NOW })
  const rev = fieldOf(out, 'gaming').top.concat(fieldOf(out, 'gaming').more).find((e) => e.title.startsWith('Guardians'))
  assert.deepEqual(rev.also, [])
})

test('Gadgets, plek 1: schermfolie en een provideractie horen niet bij de verkoop van de Switch 2, Bright wel', () => {
  const tw = it('tweakers', 'Nintendo verkoopt 41 procent minder Switch 2-consoles na prijsverhoging door ram', 'Nintendo zag de verkoop van zijn Switch 2 met 41 procent dalen in het afgelopen kwartaal vergeleken met dezelfde periode een jaar eerder.')
  assert.equal(sameSubject(tw, it('engadget', 'Why you shouldn’t remove the screen protector film on your Nintendo Switch 2')), false)
  assert.equal(sameSubject(tw, it('androidworld', 'Deze provider stunt met een gratis Nintendo Switch 2: zo claim je hem')), false)
  assert.equal(sameSubject(tw, it('bright', 'Nintendo ziet Switch 2-verkoop instorten na prijsverhoging')), true, 'echt hetzelfde verhaal: de prijsverhoging')
  // En de tweede valse groep van Gadgets: alleen "watchOS" en "27.3" gedeeld.
  const mac = it('macstories', 'Testing Audio Intelligence with Siri Recap in watchOS 27.3', 'Victoria Song, writing at The Verge, tested the new Audio Intelligence features for Apple Watch.')
  assert.equal(sameSubject(mac, it('tweakers', 'Omstreden Apple Watch-functies verschijnen in bèta van watchOS 27.3')), false)
  assert.equal(sameSubject(mac, it('iculture', 'Apple Fitness+ geeft je in iOS 27.3 een extra reden om naar de sportschool te gaan')), false)
})

test('Reizen, plek 1: een reisverhaal uit The Guardian staat niet meer bij drie hotellijstjes', () => {
  const guardian = it('guardian-travel', '‘Unable to tell morning from afternoon, I felt my sense of time opening up’: a (mostly dark) winter break in magical Swedish Lapland', 'With just a few short hours of daylight, the usual boundaries marking time fall away in Abisko.')
  const pool = [
    guardian,
    it('cntraveller', '8 of the best family-friendly hotels in Lapland for a magical Arctic escape'),
    it('cntraveller', '8 best hotels in Megève for a glamorous Alpine stay'),
    it('cntraveller', '9 best hotels in the Seychelles 2025 for the ultimate island escape'),
  ]
  const r = fieldOf(composeVak(pool, { now: NOW }), 'reizen')
  assert.deepEqual(r.top.map((e) => e.id), [guardian.id], 'de lijstjes vallen weg (punt 2), het reisverhaal staat alleen')
  assert.deepEqual(r.top[0].also, [])
  assert.deepEqual(r.top[0].why, [])
})

test('UI/UX, plek 1: Sidebar linkt alleen en telt niet als bron die schreef', () => {
  const url = 'https://uxdesign.cc/otherwise-youre-just-a-machine-a9d3b21179b5'
  const pool = [it('uxcollective', 'Otherwise you’re just a machine', 'AI is getting better at design. Designers should too.', { url }), it('sidebar', 'Otherwise you’re just a machine', 'Why designers need their craft now that AI gets better at design.', { url })]
  const top = fieldOf(composeVak(pool, { now: NOW }), 'ux').top
  assert.equal(top.length, 1)
  assert.deepEqual(top[0].also, [])
  assert.deepEqual(top[0].why, ['Gekozen door de redactie van Sidebar'], 'geen "2 vakbronnen", wel de keuze van de redactie')
})

test('echte groepen blijven: Vier minus drei, de cannabisvondst, de Whitney Biennial, Peter Isaac', () => {
  const vier = it('filmkrant', 'Vier minus drei', 'Valerie Pachner zet een knappe hoofdrol neer als een vrouw die bijna in één klap haar hele gezin verliest.')
  assert.ok(sameSubject(vier, it('filmtotaal', 'Recensie ‘Vier Minus Drei’: aangrijpend Oostenrijks drama met een fenomenale Valerie Pachner verdient alle erkenning')))
  assert.ok(sameSubject(vier, it('vk-films', '‘Vier minus drei’, over een vrouw op de rand van de afgrond die naar licht en troost tast, grijpt regelmatig naar de strot')))
  const cannabis = it('scientias', 'Archeologische vondst onthult dat cannabis 2.800 jaar geleden al werd gebruikt als geestverruimend middel', 'Cannabis staat wereldwijd bekend om haar geestverruimende werking.')
  const graf = it('nu-wetenschap', 'Siberische graftombe van 2.800 jaar oud toont oudste sporen van cannabisgebruik')
  const wiet = it('vk-wetenschap', 'Nieuw onderzoek: mensen gebruikten 2.800 jaar geleden al wiet, bewijs gevonden in mensenhaar')
  assert.ok(sameSubject(cannabis, graf), '2.800 en jaar, zeldzaam in de week')
  assert.ok(sameSubject(cannabis, wiet))
  // In de samenstelling: de vondst blijft één verhaal met meer bronnen ("jaar" en "2.800" staan hier in alle drie de
  // stukken en zijn dus niet zeldzaam; "geleden" deelt de Volkskrant wel).
  const w = fieldOf(composeVak([cannabis, graf, wiet], { now: NOW }), 'wetenschap')
  assert.equal(w.top[0].id, cannabis.id)
  assert.ok(w.top[0].also.some((a) => a.sourceName === 'de Volkskrant Wetenschap'))
  const whitney = it('artnet', 'Whitney Museum Taps a Choreographer to Co-Curate Its Next Biennial', 'Zack Winokur and Whitney curator Meg Onli will helm the prestigious art exhibition.')
  assert.ok(sameSubject(whitney, it('theartnewspaper', 'Whitney Museum selects a staff curator and a stage director to lead 2028 biennial')))
  assert.ok(sameSubject(whitney, it('hyperallergic', 'Meg Onli and Zack Winokur to Curate 2028 Whitney Biennial')))
  const isaac = it('distrifood', 'Peter Isaac, voorganger Anrico Maat bij Jumbo België, verlaat bedrijf', 'Peter Isaac verlaat Jumbo België. Eerder dit jaar nam Anrico Maat het stokje al van hem over als directeur van de Belgische tak.')
  assert.ok(sameSubject(isaac, it('retailtrends', 'Peter Isaac trekt de deur bij Jumbo België definitief achter zich dicht')), 'vier gedeelde namen: dezelfde persoon bij hetzelfde bedrijf')
  assert.ok(sameSubject(isaac, it('retaildetail', 'Peter Isaac verlaat Jumbo België nu helemaal')))
})

test('de kaart: geen telregel meer, de andere bronnen bij naam en elk één keer', () => {
  const pool = [
    it('tweakers', 'Nintendo verkoopt 41 procent minder Switch 2-consoles na prijsverhoging door ram', 'Nintendo zag de verkoop van zijn Switch 2 met 41 procent dalen.'),
    it('bright', 'Nintendo ziet Switch 2-verkoop instorten na prijsverhoging'),
    it('iculture', 'Nintendo Switch 2-verkoop daalt na prijsverhoging, meldt Nintendo'),
    it('iculture', 'Nintendo Switch 2: verkoop zakt na prijsverhoging fors in'),
  ]
  const top = fieldOf(composeVak(pool, { now: NOW }), 'gadgets').top[0]
  assert.ok(!top.why.some((w) => /vakbronnen/.test(w)))
  assert.deepEqual(top.also.map((a) => a.sourceName).sort(), ['Bright', 'iCulture'])
})
