// Kaartkwaliteit (7 november): elke plek in de Editie verzorgd — kop, intro en beeld.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { introMax, wholeSentences, INTRO_LINES } from '../shared/zinnen.mjs'

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const POPE = 'Less than a month after losing part of a lung, Pope Leo XIV set out this morning on one of the longest and most ambitious trips of his pontificate.'

test('web: de intro van een Editie-plek rekent op de gemeten kolom, niet op de telefoon', () => {
  const e = src('src/views/Edition.jsx')
  assert.match(e, /const width = useColumnWidth\(linkRef, introColumn\)/)
  assert.match(e, /className="fitem__link" ref=\{linkRef\}/)
  // Zijkolom, breed: de intro onder kop en beeld, over de hele kolom.
  assert.match(src('src/styles.css'), /\.front__side \.fitem__link \{\n    grid-template-areas: 'kop beeld' 'intro intro';/)
  assert.match(src('src/lib/intro.js'), /export function useColumnWidth\(ref, measure/)
  // De telefoonmaat (267 px) liet de pauszin van 147 tekens vallen; de echte kolom van een paar (± 400 px) niet.
  const smal = introMax(INTRO_LINES, { width: 267, font: 15 })
  const breed = introMax(INTRO_LINES, { width: 400, font: 15 })
  assert.equal(wholeSentences(POPE, smal.max, smal.rek), '')
  assert.equal(wholeSentences(POPE, breed.max, breed.rek), POPE)
})

test('breed: elke plek in de zijkolom houdt zijn beeld, web en app', () => {
  assert.doesNotMatch(src('src/styles.css'), /\.front__side \.fitem:not\(:last-child\) \.thumb/)
  assert.doesNotMatch(src('ios/Hoot/Views/EditionView.swift'), /thumbShown: phone \|\| i == side\.count - 1/)
})

test('een paar zonder intro: geen gat tussen kop en bron, web en app', () => {
  assert.match(src('src/styles.css'), /\.pairs > \.fitem:not\(:has\(\.fitem__sum\)\) > \.fitem__link \{\n    flex: 0 0 auto;/)
  const c = src('ios/Hoot/Views/Components.swift')
  assert.match(c, /if pinSource && krantIntro != nil \{ Spacer\(minLength: 0\) \}/)
  assert.match(c, /if pinSource && krantIntro == nil \{ Spacer\(minLength: 0\) \}/)
})

test('cardIntro: eigen intro eerst; past die niet, dan de reserve uit hetzelfde verhaal met via', async () => {
  const { cardIntro } = await import('../shared/kaart-intro.mjs')
  const fit = introMax(INTRO_LINES, { width: 267, font: 15 })
  const kort = 'Pope Leo travels to Uruguay just three weeks after having surgery for lung cancer.'
  assert.deepEqual(cardIntro({ summary: kort }, fit), { text: kort, via: null })
  assert.deepEqual(cardIntro({ summary: POPE, introAlt: kort, introAltFrom: 'BBC' }, fit), { text: kort, via: 'BBC' })
  // Op een brede kolom past de eigen intro: dan nooit de reserve.
  assert.deepEqual(cardIntro({ summary: POPE, introAlt: kort, introAltFrom: 'BBC' }, introMax(INTRO_LINES, { width: 400, font: 15 })), { text: POPE, via: null })
  assert.deepEqual(cardIntro({ summary: POPE }, fit), { text: '', via: null })
})

test('server: beeld en reserve-intro alleen van een stuk over hetzelfde feit, intro in de taal van de kop', async () => {
  const { borrowImagesFromStories, introAlternatives } = await import('../netlify/lib/build.mjs')
  const a = (id, source, sourceName, title, extra = {}) => ({ id, kind: 'article', source, sourceName, title, url: `https://${source}.example/${id}`, ...extra })
  const atl = a('atl', 'atlantic', 'The Atlantic', 'Pope Leo travels to Uruguay after lung surgery', { summary: POPE })
  const bbc = a('bbc', 'bbc', 'BBC', 'Pope Leo travels to Uruguay weeks after lung surgery', { summary: 'Pope Leo travels to Uruguay just three weeks after having surgery for lung cancer.', image: 'https://bbc.example/pope.jpg' })
  const nos = a('nos', 'nos', 'NOS', 'Paus Leo reist naar Uruguay na longoperatie', { summary: 'De paus reist naar Uruguay.', image: 'https://nos.example/paus.jpg' })
  const ander = a('ander', 'guardian', 'The Guardian', 'Pope Leo meets Argentina president Milei in Buenos Aires', { summary: 'Short.', image: 'https://g.example/x.jpg' })
  const byId = new Map([atl, bbc, nos, ander].map((i) => [i.id, i]))
  const stories = [{ id: 's', itemIds: ['atl', 'bbc', 'nos', 'ander'] }]
  assert.equal(introAlternatives(stories, byId), 1)
  assert.equal(atl.introAlt, bbc.summary)
  assert.equal(atl.introAltFrom, 'BBC') // Engels bij een Engelse kop, nooit de NOS
  assert.equal(borrowImagesFromStories(stories, byId), 1)
  assert.equal(atl.image, bbc.image)
  assert.equal(atl.imageFrom, 'BBC')
  // Botsende eigen namen (een ander geval): geen beeld.
  const los = a('los', 'nyt', 'NYT', 'Pope Leo visits Montevideo cathedral on Sunday')
  const leeg = a('leeg', 'wapo', 'Washington Post', 'Pope Leo visits Buenos Aires cathedral on Sunday', { image: 'https://w.example/y.jpg' })
  assert.equal(borrowImagesFromStories([{ id: 't', itemIds: ['los', 'leeg'] }], new Map([[los.id, los], [leeg.id, leeg]])), 0)
  assert.equal(los.image, undefined)
})

test('app: in de zijkolom staat de intro onder kop en beeld, net als op het web', () => {
  const c = src('ios/Hoot/Views/Components.swift')
  assert.match(c, /private var introBelow: Bool \{ narrow && !timeline && thumbShown \}/)
  assert.match(c, /if introBelow \{ introView \}/)
  assert.match(c, /if !introBelow \{ introView \}/)
})

// ---- Ronde 2: geen verkeerde reserve-intro (keuring 7 november: 4 van 12 op Editie-plekken fout) ----
// De echte gevallen uit de bewaarde feeds, met lange eigen intro's die op de kleinste plek niet passen.
const LANG = 'Volgens voorlopige cijfers die het Franse ministerie van Binnenlandse Zaken naar buiten bracht, zijn er donderdag door heel Frankrijk 448 mensen aangehouden bij de protesten tegen de hervormingen van de regering.'
const st = (id, source, sourceName, title, summary) => ({ id, kind: 'article', source, sourceName, title, summary, url: `https://${source}.example/${id}` })
async function reserve(ontvanger, donor) {
  const { introAlternatives } = await import('../netlify/lib/build.mjs')
  const byId = new Map([ontvanger, donor].map((i) => [i.id, i]))
  introAlternatives([{ id: 's', itemIds: [ontvanger.id, donor.id] }], byId)
  return ontvanger.introAlt || null
}

test('reserve: nooit reclame voor een liveblog ("Volg alle ontwikkelingen … in onze liveblog", "In de liveblog …")', async () => {
  const kop = 'Trump wil nog één of twee doelen in Iran aanvallen: ‘Dat kunnen we binnen tien minuten regelen’'
  assert.equal(await reserve(st('ad', 'ad', 'AD', kop, LANG), st('hln', 'hln', 'Het Laatste Nieuws', 'Trump beweert ‘nog één of twee doelen in Iran’ te moeten ‘aanpakken’', 'Volg alle ontwikkelingen over het Midden-Oosten in onze liveblog.')), null)
  const beenders = 'Minister Rob Beenders: “Algemene voorwaarden van banken hollen bescherming phishing-slachtoffers uit”'
  assert.equal(await reserve(st('hbvl', 'hbvl', 'Het Belang van Limburg', beenders, LANG), st('ds', 'standaard', 'De Standaard', 'Beenders: banken hollen bescherming phishing-slachtoffers uit', 'In de liveblog economie brengen we nog meer en sneller financieel-economisch nieuws.')), null)
})

test('reserve en eigen intro: de aanhef van een blog is geen intro ("Welkom in het blog over …")', async () => {
  const { lendableIntro, stripPromoIntros } = await import('../netlify/lib/build.mjs')
  const { cardIntro } = await import('../shared/kaart-intro.mjs')
  const { withoutAanhef, hasAanhef } = await import('../shared/aanhef.mjs')
  const blog = 'Welkom in het blog over de midtermverkiezingen in de Verenigde Staten.'
  assert.equal(await reserve(st('nos', 'nos', 'NOS', 'Groen licht voor Trumps triomfboog, maar rechter legt bouw direct stil', LANG), st('vk', 'volkskrant', 'de Volkskrant', 'Rechter blokkeert tijdelijk begin bouw van Trumps triomfboog', blog)), null)
  // Een stuk met zo'n aanhef leent helemaal niets uit, ook niet de zin erna: het is een blog over de hele dag.
  assert.equal(lendableIntro({ summary: `${blog} Trump zegt dat hij wint.`, url: 'https://vk.example/x', title: 'x' }), '')
  // De eigen intro: alleen aanhef is geen intro, op de server en op de kaart (web; de app in Item.cardIntro).
  const it = { kind: 'article', summary: blog }
  stripPromoIntros([it])
  assert.equal(it.summary, '')
  assert.deepEqual(cardIntro({ summary: blog }), { text: '', via: null })
  assert.deepEqual(cardIntro({ summary: `${blog} De rechter legt de bouw stil.` }), { text: 'De rechter legt de bouw stil.', via: null })
  for (const z of ['Op deze pagina blijft u op de hoogte van al het nieuws in het wielrennen.', 'Volg hier de persconferentie.', 'Follow our live coverage here.', 'Lees alles over de verkiezingen.', 'In ons blog houden we je op de hoogte.']) assert.ok(hasAanhef(z), z)
  // Gewoon nieuws blijft: een gemeente die vluchtelingen welkom heet, de Kamer die op de hoogte wordt gehouden.
  for (const z of ['Vluchtelingen zijn welkom in de gemeente.', 'Het kabinet houdt de Kamer op de hoogte.', 'The blogger was arrested on Friday.']) assert.equal(withoutAanhef(z), z)
})

test('reserve: geen getal dat de kop tegenspreekt ("Bijna 450 aanhoudingen" naast "565 mensen opgepakt")', async () => {
  const { numbersClash } = await import('../netlify/lib/build.mjs')
  const vk = st('vk', 'volkskrant', 'de Volkskrant', 'Bijna 450 aanhoudingen in Frankrijk bij nieuwe grootschalige betogingen', 'In Frankrijk zijn zaterdag 565 mensen opgepakt tijdens betogingen in het land. Vier politieagenten en een gendarme raakten gewond in Parijs.')
  assert.equal(await reserve(st('hln', 'hln', 'Het Laatste Nieuws', 'Bijna 450 aanhoudingen in Frankrijk in verband met protesten', LANG), vk), null)
  assert.ok(numbersClash('Iran claims three tankers catch fire', 'Iran says four tankers have caught fire.'))
  // Een getal van een andere orde is geen tegenspraak, een jaartal ook niet.
  assert.ok(!numbersClash('Zeldzame vondst in Pompeï: 2.000 jaar oude kast', 'Een kinderketting met 24 hangertjes en 38 munten.'))
  assert.ok(!numbersClash('VS keurt verkoop van 500 Patriot-raketten goed', 'De VS keuren de verkoop van 500 Patriot-raketten goed, meldt het ministerie in 2026.'))
})

test('reserve: alleen over het feit van de kop van de ontvanger, niet over een ander feit uit hetzelfde verhaal', async () => {
  const kop = 'Parket start onderzoek naar zwaard en mogelijke Hamasverwijzingen in mobilhome van Palestijnse activist in Antwerpen'
  const ds = st('ds', 'standaard', 'De Standaard', 'Pro-Palestijnse activist krijgt mobilhome terug, maar die mag drie maanden lang niet in joodse wijk van Antwerpen komen', 'Omar Almaani krijgt zijn bestickerde mobilhome, die vorige week door de Antwerpse politie in beslag werd genomen in de joodse buurt, onder voorwaarden terug.')
  assert.equal(await reserve(st('vrt', 'vrt', 'VRT NWS', kop, `${LANG} ${LANG}`), ds), null)
  // Zelfde uitzending, ander feit: het eerbetoon is niet de winnaar.
  const nu = st('nu', 'nu', 'NU.nl', 'Winnaar De slimste mens bekend, vooraf eerbetoon aan Paulien Cornelisse', 'Mats Akkerman is vrijdag uitgeroepen tot de winnaar van het 28e seizoen van De slimste mens.')
  assert.equal(await reserve(st('rtl', 'rtl', 'RTL Nieuws', 'Eerbetoon aan Paulien Cornelisse voor finale De slimste mens', LANG), nu), null)
  // Wel: dezelfde kern, dezelfde naam, hetzelfde getal.
  const nos = st('nos', 'nos', 'NOS', 'VS keurt verkoop Patriot-raketten aan Oekraïne goed', 'De Verenigde Staten heeft de verkoop van 500 Patriot-raketten aan Oekraïne goedgekeurd.')
  assert.equal(await reserve(st('rtl2', 'rtl', 'RTL Nieuws', 'VS keurt mogelijke verkoop van 500 Patriot-raketten aan Oekraïne goed', LANG), nos), nos.summary)
})

