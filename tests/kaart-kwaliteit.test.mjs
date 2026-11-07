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

test('reserve en eigen intro: de tekst van een blog is geen intro ("Welkom in het blog over …")', async () => {
  const { reserveIntro, lendableIntro, stripPromoIntros } = await import('../netlify/lib/build.mjs')
  const { cardIntro, ownIntro } = await import('../shared/kaart-intro.mjs')
  const { introShown, hasAanhef, isBlog } = await import('../shared/aanhef.mjs')
  const blog = 'Welkom in het blog over de midtermverkiezingen in de Verenigde Staten.'
  assert.equal(await reserve(st('nos', 'nos', 'NOS', 'Groen licht voor Trumps triomfboog, maar rechter legt bouw direct stil', LANG), st('vk', 'volkskrant', 'de Volkskrant', 'Rechter blokkeert tijdelijk begin bouw van Trumps triomfboog', blog)), null)
  // Een stuk met zo'n tekst leent als reserve helemaal niets uit, ook niet de zin erna: het is een blog over de hele dag.
  assert.equal(reserveIntro({ summary: `${blog} Trump zegt dat hij wint.`, url: 'https://vk.example/x', title: 'x' }), '')
  // De eigen intro: een blogtekst is geen intro, ook niet wat erna komt (web en app: ownIntro, Item.shownSummary).
  assert.deepEqual(cardIntro({ summary: blog }), { text: '', via: null })
  assert.deepEqual(cardIntro({ summary: `${blog} De rechter legt de bouw stil.` }), { text: '', via: null })
  // Maar pas bij het tonen: de samenvatting waarmee de redacteur rekent, blijft (keuring ronde 2: het nieuws verschoof).
  const it = { kind: 'article', summary: blog }
  stripPromoIntros([it])
  assert.equal(it.summary, blog)
  assert.equal(lendableIntro({ summary: `${blog} Trump zegt dat hij wint.`, url: 'https://vk.example/x', title: 'x' }), `${blog} Trump zegt dat hij wint.`)
  for (const z of ['Op deze pagina blijft u op de hoogte van al het nieuws in het wielrennen.', 'Volg hier de persconferentie.', 'Follow our live coverage here.', 'In ons blog houden we je op de hoogte.', 'Of dat lukt, leest u in deze liveblog.']) assert.ok(isBlog(z), z)
  assert.ok(hasAanhef('Lees alles over de verkiezingen.'))
  // Gewoon nieuws blijft: een gemeente die vluchtelingen welkom heet, de Kamer die op de hoogte wordt gehouden.
  for (const z of ['Vluchtelingen zijn welkom in de gemeente.', 'Het kabinet houdt de Kamer op de hoogte.', 'The blogger was arrested on Friday.']) assert.equal(introShown(z), z)
  assert.equal(ownIntro({ summary: 'Iets anders.', introLoose: true }), '')
})

test('restanten van een liveblog zijn geen intro en lenen niet; een losse verwijzing gaat er alleen zelf uit', async () => {
  const { introShown } = await import('../shared/aanhef.mjs')
  const { reserveIntro } = await import('../netlify/lib/build.mjs')
  const nu = 'Hallo en welkom in dit liveblog. Hier houden we je op de hoogte van de laatste ontwikkelingen rond de oorlog in Oekraïne. Heb je een vraag? Mail die naar redactie@nu.nl.'
  const ad = 'De Formule 1 dendert door in deze periode. Volg alle ontwikkelingen hier.'
  const knvb = 'Welkom in dit liveblog! Mijn naam is Hein Nooijens en ik begeleid je bij de loting voor ronde 2 in de KNVB-beker. Veel plezier!'
  const ds = 'Club Brugge is al vijf competitiewedstrijden op rij ongeslagen, en wil die reeks graag verderzetten op het veld van Zulte Waregem. Of dat lukt, leest u in deze liveblog.'
  for (const t of [nu, ad, knvb, ds]) {
    assert.equal(introShown(t), '', t)
    assert.equal(reserveIntro({ summary: t, url: 'https://x.example/a', title: 'Een kop' }), '', t)
  }
  // "Read more", "Lees hier …", "This story was updated …": alleen die zin.
  assert.equal(introShown('Sony has snatched up the movie rights for Mouthwashing, the hit independent horror video game released in 2024. Read more'), 'Sony has snatched up the movie rights for Mouthwashing, the hit independent horror video game released in 2024.')
  assert.equal(introShown('This story was updated on November 5, 2026 at 11:00 am EST.'), '')
  // Een welkom verderop is gewoon tekst.
  const wired = 'With these high-tech automatic litter boxes, gone are the days of scooping and smells. Welcome to the future.'
  assert.equal(introShown(wired), wired)
})

test('zinnen knippen met de afkortingenregel: "No. 150" is geen zinseinde', async () => {
  const { sentencesOf, introShown } = await import('../shared/aanhef.mjs')
  assert.deepEqual(sentencesOf('Hi, friends! Welcome to Installer No. 150, your guide to the best stuff.'), ['Hi, friends!', ' Welcome to Installer No. 150, your guide to the best stuff.'])
  assert.deepEqual(sentencesOf('Dat zei dr. Jansen. Lees hier meer.'), ['Dat zei dr. Jansen.', ' Lees hier meer.'])
  // Nooit "Hi, friends! 150, your guide …": een nieuwsbrief die met een welkom opent, heeft geen intro.
  assert.equal(introShown('Hi, friends! Welcome to Installer No. 150, your guide to the best and Verge-iest stuff in the world.'), '')
  assert.equal(introShown('De bus van lijn nr. 12 reed door rood. Lees ook ons achtergrondstuk.'), 'De bus van lijn nr. 12 reed door rood.')
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

test('app: dezelfde patronen als het web, en het rek-vangnet met de reserve in IntroText', async () => {
  const { BLOG_SOURCE, GREETING_SOURCE, PROMO_SOURCE } = await import('../shared/aanhef.mjs')
  const m = src('ios/Hoot/Models.swift')
  assert.ok(m.includes(`static let blogPattern = #"${BLOG_SOURCE}"#`), 'Aanhef.blogPattern gelijk aan BLOG_SOURCE')
  assert.ok(m.includes(`static let greetingPattern = #"${GREETING_SOURCE}"#`), 'Aanhef.greetingPattern gelijk aan GREETING_SOURCE')
  assert.ok(m.includes(`static let promoPattern = #"${PROMO_SOURCE}"#`), 'Aanhef.promoPattern gelijk aan PROMO_SOURCE')
  // Zinnen met de afkortingenregel van de intro, zoals sentencesOf.
  assert.match(m, /for end in Sentences\.ends\(in: ns\)/)
  // De eigen intro zoals hij getoond mag worden: ook de app laat een losse geleende intro weg (introLoose).
  assert.match(m, /guard introLoose != true, let summary else \{ return nil \}/)
  assert.match(m, /Aanhef\.shown\(EditionDisplay\.cleanIntro\(summary, author: author\)\)/)
  assert.match(m, /cardIntro\(max: max\) \?\? cardIntro\(max: max, rek: Self\.longer\(max, by: line\)\)/)
  assert.match(src('ios/Hoot/Views/IntroText.swift'), /var fallback: \(text: String, suffix: \(String\) -> String\)\? = nil/)
  const c = src('ios/Hoot/Views/Components.swift')
  assert.equal((c.match(/fallback: item\.introFallback\(for: intro/g) || []).length, 2)
  // Het hoofdverhaal en de vouw tonen ook alleen wat getoond mag worden, net als het web (ownIntro).
  assert.equal((c.match(/item\.shownSummary\.map/g) || []).length, 3)
  assert.doesNotMatch(c, /item\.summary\.map\(\{ wholeSentences/)
  for (const f of ['src/views/Story.jsx', 'src/views/Vak.jsx']) assert.match(src(f), /wholeSentences\(ownIntro\(item\)/, f)
  assert.match(src('src/components/Items.jsx'), /introTekst: lead \? wholeSentences\(ownIntro\(item\)/)
})

test('intro lenen binnen een verhaal (borrowFromStories): dezelfde toets als de reserve, alleen bij het tonen', async () => {
  // De keuze van de donor blijft zoals hij was (de samenstelling rekent met de samenvatting), maar een geleende
  // tekst over een ander feit staat er niet: het eerbetoon is niet de winnaar.
  const { borrowFromStories } = await import('../netlify/lib/build.mjs')
  const { cardIntro } = await import('../shared/kaart-intro.mjs')
  const rtl = { id: 'rtl', kind: 'article', source: 'rtl', sourceName: 'RTL Nieuws', title: 'Eerbetoon aan Paulien Cornelisse voor finale De slimste mens', url: 'https://rtl.example/a' }
  const nu = { id: 'nu', kind: 'article', source: 'nu', sourceName: 'NU.nl', title: 'Winnaar De slimste mens bekend, vooraf eerbetoon aan Paulien Cornelisse', summary: 'Mats Akkerman is vrijdag uitgeroepen tot de winnaar van het 28e seizoen van De slimste mens.', url: 'https://nu.example/a' }
  assert.equal(borrowFromStories([{ id: 's', itemIds: ['rtl', 'nu'] }], new Map([[rtl.id, rtl], [nu.id, nu]])), 1)
  assert.equal(rtl.summary, nu.summary)
  assert.equal(rtl.introLoose, true)
  assert.deepEqual(cardIntro(rtl), { text: '', via: null })
  // Wel over hetzelfde feit: dan gewoon met "via".
  const a = { id: 'a', kind: 'article', source: 'rtl', sourceName: 'RTL Nieuws', title: 'VS keurt verkoop van 500 Patriot-raketten aan Oekraïne goed', url: 'https://rtl.example/b' }
  const b = { id: 'b', kind: 'article', source: 'nos', sourceName: 'NOS', title: 'VS keurt verkoop Patriot-raketten aan Oekraïne goed', summary: 'De Verenigde Staten heeft de verkoop van 500 Patriot-raketten aan Oekraïne goedgekeurd.', url: 'https://nos.example/b' }
  borrowFromStories([{ id: 't', itemIds: ['a', 'b'] }], new Map([[a.id, a], [b.id, b]]))
  assert.equal(a.introLoose, false)
  assert.deepEqual(cardIntro(a), { text: b.summary, via: 'NOS' })
})

test('reserve-intro alleen als hele zin, nooit een stuk tot een komma van een ander', async () => {
  const { cardIntro } = await import('../shared/kaart-intro.mjs')
  const ahold = 'Ahold Delhaize, eigenaar van onder meer Albert Heijn, Etos, Gall & Gall en bol, verwacht dat de omzet in het vierde kwartaal tussen de 200 miljoen en 250 miljoen euro lager uitvalt als gevolg van de cyberaanval van vorige maand.'
  const item = { summary: 'x'.repeat(300).replace(/x{10}/g, 'woordenlang '), introAlt: ahold, introAltFrom: 'AD' }
  const smal = introMax(INTRO_LINES, { width: 267, font: 15 })
  assert.deepEqual(cardIntro(item, smal), { text: '', via: null })
  assert.deepEqual(cardIntro(item, { max: 260, rek: 260 }), { text: ahold, via: 'AD' })
  assert.match(src('ios/Hoot/Models.swift'), /return alt\.range\(of: #"\[\.!\?\]\["'’”\)\]\?\$"#, options: \.regularExpression\) == nil \? nil : \(alt, introAltFrom\)/)
})

test('een bewaarde geleende intro van vóór de toets wordt alsnog getoetst, zonder de samenvatting te veranderen', async () => {
  const { borrowPreviews } = await import('../netlify/lib/build.mjs')
  const { cardIntro } = await import('../shared/kaart-intro.mjs')
  const winnaar = 'WNL-verslaggever Mats Akkerman heeft de finale van het dertigste seizoen van kennisquiz De Slimste Mens gewonnen.'
  const oud = { id: 'o', kind: 'article', source: 'nu', sourceName: 'NU.nl', title: 'Video | Zo nam De slimste mens afscheid van Paulien Cornelisse', summary: winnaar, borrowedFrom: 'NOS', url: 'https://nu.example/o' }
  const goed = { id: 'g', kind: 'article', source: 'trouw', sourceName: 'Trouw', title: 'Spaanse transportminister stapt op na dodelijke treinramp', summary: 'De Spaanse minister van Transport Óscar Puente treedt af na de dodelijke treinramp van vorige week.', borrowedFrom: 'Nederlands Dagblad', url: 'https://trouw.example/g' }
  borrowPreviews([oud, goed], [])
  assert.equal(oud.summary, winnaar)
  assert.equal(oud.introLoose, true)
  assert.deepEqual(cardIntro(oud), { text: '', via: null })
  assert.equal(goed.introLoose, false)
  assert.equal(cardIntro(goed).via, 'Nederlands Dagblad')
})
