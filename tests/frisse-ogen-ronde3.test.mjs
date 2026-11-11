// Frisse ogen · ronde 3 (rapport van 11 november, besluiten van Alex van 11 november), de algemene Editie op de server:
// - punt 5: bij hetzelfde feit de gratis kop van NOS, NU.nl of RTL (freeHeads);
// - punt 7: Haagse dossiers, automatisch op gedeelde namen (netlify/lib/dossiers.mjs), eerst in schaduw (alleen het archief);
// - punt 8: de Ochtendeditie op een vast, later moment, en de ochtend licht aanvullen (shared/slot-times.mjs,
//   morningTopUp, earlyMorningSlot);
// - punt 9: een rustige laatste noot (quietEnd);
// - punt 10: geen plek zonder rubriek, en de rubriek volgt het land van het onderwerp (netlify/lib/rubriek.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freeHeads, quietEnd, quietNote, editionSlot, SOURCE_PLACES_MAX, buildStories } from '../netlify/lib/stories.mjs'
import { haagsDossier, haagsPiece, dossierNames, DOSSIER_MIN } from '../netlify/lib/dossiers.mjs'
import { placeDesks, deskFor } from '../netlify/lib/rubriek.mjs'
import { morningTopUp, OCHTEND_AANVULLING } from '../netlify/lib/aanvulling.mjs'
import { earlyMorningSlot, generalEdition } from '../netlify/lib/build.mjs'
import { SLOT_START, OCHTEND_VROEG } from '../shared/slot-times.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'

const T = Date.parse('2026-11-11T07:00:00Z')
const at = (h) => new Date(T - h * 36e5).toISOString()
let n = 0
const art = (source, title, h = 1, extra = {}) => ({ id: `r3-${++n}`, kind: 'article', source, title, summary: `${title}.`, image: 'https://example.com/b.jpg', publishedAt: at(h), url: `https://example.com/nieuws/${n}`, ...extra })
const story = (id, items, lead = items[0]) => ({ entry: { kind: 'story', id, leadId: lead.id, desk: 'binnenland' }, items })

// ---------- punt 5 ----------
test('bij hetzelfde feit de gratis Nederlandse kop, niet bij een ander stuk uit hetzelfde verhaal', () => {
  const vk = art('volkskrant', 'Kabinet zet in op behoud Moerdijk, dorp kan mogelijk toch blijven bestaan', 1)
  const nos = art('nos', 'Kabinet zet in op behoud Moerdijk, voortbestaan dorp nog niet zeker', 3)
  const a = story('s-moerdijk', [vk, nos])
  const nrc = art('nrc', 'Bunker van nazi-Rijkscommissaris Seyss-Inquart mag niet worden gekocht door BOEi', 1)
  const nu = art('nu', 'Gemeente Den Haag kiest nieuwe bestemming voor oude bunkerterrein', 2)
  const b = story('s-bunker', [nrc, nu])
  const nyt = art('nyt', 'Supreme Court Allows Construction of Trump’s Border Wall in Big Bend', 1)
  const rtl = art('rtl', 'Hooggerechtshof VS staat bouw grensmuur Trump in Big Bend toe', 2)
  const c = story('s-muur', [nyt, rtl])
  const members = new Map([a, b, c].map((x) => [x.entry.id, x.items]))
  const entries = [a.entry, b.entry, c.entry]
  const changed = freeHeads(entries, { itemsOf: (e) => members.get(e.id), mainIds: MAIN_IDS, now: T })
  assert.equal(entries[0].leadId, nos.id, 'Moerdijk: hetzelfde feit, de NOS-kop')
  assert.equal(entries[1].leadId, nrc.id, 'een ander stuk uit de bundel is niet hetzelfde feit')
  assert.equal(entries[2].leadId, nyt.id, 'een Engelse kop blijft (ronde 10 · B); dat regelt de taalregel voor de top 3')
  assert.equal(changed.length, 1)
  // Bijna dezelfde kop, zonder namen.
  const vk2 = art('volkskrant', 'Kind van gehuwd stel krijgt niet meer automatisch naam van vader', 1)
  const rtl2 = art('rtl', 'Kind van gehuwd stel krijgt niet meer automatisch achternaam van vader', 0.5)
  const e2 = [{ kind: 'story', id: 's-naam', leadId: vk2.id }]
  freeHeads(e2, { itemsOf: () => [vk2, rtl2], mainIds: MAIN_IDS, now: T })
  assert.equal(e2[0].leadId, rtl2.id)
  // De uitslag gaat niet terug naar de exitpolls: kop en intro samen zijn niet genoeg.
  const nrc3 = art('nrc', 'Pro-Russische kandidaat wint Bulgaarse presidentsverkiezingen', 1)
  const nu3 = art('nu', 'Pro-Russische interim-president leidt in exitpolls Bulgaarse presidentsverkiezing', 2, { summary: 'De pro-Russische kandidaat wint de Bulgaarse presidentsverkiezingen volgens exitpolls.' })
  const e3 = [{ kind: 'story', id: 's-bg', leadId: nrc3.id }]
  freeHeads(e3, { itemsOf: () => [nrc3, nu3], mainIds: MAIN_IDS, now: T })
  assert.equal(e3[0].leadId, nrc3.id)
})

test('de gratis kop: hooguit drie plekken per bron, geen opinie, video of kop van vóór de vorige Editie', () => {
  const places = []
  const members = new Map()
  for (let k = 0; k < SOURCE_PLACES_MAX; k++) {
    const own = art('nos', `NOS meldt eigen nieuws nummer ${k} over Zeeland en Friesland`, 1)
    places.push({ kind: 'story', id: `s-nos-${k}`, leadId: own.id })
    members.set(`s-nos-${k}`, [own, art('nrc', `Ander stuk ${k} over Zeeland`, 2)])
  }
  const ad = art('ad', 'Brand verwoest monumentale boerderij in Staphorst, bewoners ongedeerd', 1)
  const nos = art('nos', 'Brand verwoest monumentale boerderij in Staphorst', 2)
  members.set('s-brand', [ad, nos])
  places.push({ kind: 'story', id: 's-brand', leadId: ad.id })
  freeHeads(places, { itemsOf: (e) => members.get(e.id), mainIds: MAIN_IDS, now: T })
  assert.equal(places[3].leadId, ad.id, 'de NOS heeft al drie plekken')
  const tg = art('telegraaf', 'Bus rijdt in op terras in Leiden, twee gewonden', 1)
  const video = art('rtl', 'Video | Bus rijdt in op terras in Leiden', 2)
  const oud = art('nu', 'Bus rijdt in op terras in Leiden, twee gewonden', 30)
  const m2 = new Map([['s-bus', [tg, video, oud]]])
  const e2 = [{ kind: 'story', id: 's-bus', leadId: tg.id }]
  freeHeads(e2, { itemsOf: (e) => m2.get(e.id), mainIds: MAIN_IDS, now: T, since: T - 5 * 36e5 })
  assert.equal(e2[0].leadId, tg.id, 'geen video, en geen kop van vóór de vorige Editie')
})

test('de gratis kop: actueel gaat voor herhaald (keuring ronde 3-1, de midterms van 4 november middag)', () => {
  // De Ochtendeditie had de uitslag al op 01. De betaalde kop meldt de nieuwe ontwikkeling; de gratis kop herhaalt de
  // uitslag en deelt met de betaalde kop alleen de naam en het onderwerp.
  const previous = { at: T - 6 * 36e5, itemIds: new Set(), storyIds: new Set(), shown: [{ title: 'Enorme winst Democraten in midterms, Republikeinen verliezen meerderheid Senaat', summary: 'President Trump is keihard afgestraft bij de tussentijdse verkiezingen in de Verenigde Staten.', publishedAt: at(7) }] }
  const vk = art('volkskrant', 'Trump zegt zich neer te leggen bij uitslag midterms: ‘Democraten hebben het goed gedaan’', 3)
  const nu = art('nu', 'Verbluffende zege van Democraten in midterms is mokerslag voor Trump', 1)
  const e = [{ kind: 'story', id: 's-mid', leadId: vk.id }]
  freeHeads(e, { itemsOf: () => [vk, nu], mainIds: MAIN_IDS, now: T, since: previous.at, previous })
  assert.equal(e[0].leadId, vk.id, 'geen herhaling van de vorige Editie in plaats van de nieuwe ontwikkeling')
  // Meldt de gratis kop dezelfde ontwikkeling, dan wel de gratis kop.
  const nos = art('nos', 'Trump legt zich neer bij uitslag midterms, Democraten winnen Senaat', 1)
  const e2 = [{ kind: 'story', id: 's-mid', leadId: vk.id }]
  freeHeads(e2, { itemsOf: () => [vk, nos], mainIds: MAIN_IDS, now: T, since: previous.at, previous })
  assert.equal(e2[0].leadId, nos.id)
  // Zonder vorige Editie over dit onderwerp blijft de gewone regel.
  const e3 = [{ kind: 'story', id: 's-mid', leadId: vk.id }]
  freeHeads(e3, { itemsOf: () => [vk, nos], mainIds: MAIN_IDS, now: T })
  assert.equal(e3[0].leadId, nos.id)
})

// ---------- punt 7 ----------
test('Haagse stukken en hun namen: automatisch, zonder lijst van dossiers', () => {
  assert.ok(haagsPiece(art('nrc', 'Kabinet neemt het risico en stuurt Belastingplan zonder garantie naar de Kamer')))
  assert.ok(!haagsPiece(art('nrc', 'Grensbewoners zoeken vaak vertier in het buitenland')), 'geen Haags woord')
  assert.ok(!haagsPiece(art('nyt', 'Cabinet reshuffle in London')), 'geen Nederlandse bron')
  const a = art('nrc', 'Kabinet neemt het risico en stuurt Belastingplan zonder garantie naar de Kamer')
  const b = art('nos', 'Coalitie en Kamer nog geen steek verder met belastingplan')
  const c = art('nu', 'PRO steunt uitwerking stikstofplannen van kabinet: ‘Eindelijk actie’')
  const d = art('volkskrant', 'Kabinet stelt nieuwe box 3-taks uit tot ‘uiterlijk’ 2029')
  const names = dossierNames([a, b, c, d])
  assert.ok(names.get(b.id).has('belastingplan'), 'ook zonder hoofdletter, uit de woordenschat van de andere koppen')
  assert.ok(!names.get(c.id).has('eindelijk'), 'een hoofdletter na een aanhalingsteken is geen naam')
  assert.ok(names.get(c.id).has('pro'), 'een afkorting is een naam')
  assert.ok(names.get(d.id).has('box 3'), 'een woord met een klein getal erachter')
  assert.ok(!names.get(a.id).has('kamer'), 'de instellingen van de politiek zelf zijn geen dossier')
})

test('een Haags dossier van vier uitgevers krijgt één plek, met de gratis kop', () => {
  const pieces = [
    art('nrc', 'Kabinet neemt het risico en stuurt Belastingplan zonder garantie naar de Kamer', 6),
    art('volkskrant', 'Kabinet speelt blufpoker met belastingplan in de Tweede Kamer', 5),
    art('trouw', 'Debat over belastingplan zorgt voor verwarring in de coalitie', 4),
    art('nos', 'Coalitie en Kamer nog geen steek verder met belastingplan', 2),
  ]
  const other = Array.from({ length: 10 }, (_, k) => art('nyt', `World story number ${k} about markets in Asia`, 1))
  const stories = other.slice(0, 9).map((i, k) => ({ id: `s-w${k}`, itemIds: [i.id, `x${k}a`, `x${k}b`], publisherCount: 8 - (k % 3) }))
  const entries = [...stories.map((st) => ({ kind: 'story', id: st.id, leadId: st.itemIds[0], desk: 'buitenland' })), { kind: 'item', id: other[9].id, desk: 'buitenland' }]
  const newsPool = [...pieces, ...other]
  const { entries: out, dossier } = haagsDossier(entries, { newsPool, stories, now: T, mainIds: MAIN_IDS })
  assert.equal(dossier?.naam, 'belastingplan')
  assert.equal(dossier.uitgevers, DOSSIER_MIN)
  assert.equal(out.length, 10, 'de Editie blijft tien plekken')
  const placed = out.find((e) => e.desk === 'binnenland')
  assert.equal(placed.id, pieces[3].id, 'de gratis NOS-kop')
  assert.ok(!out.some((e) => e.id === other[9].id), 'de eenbronsplek maakt plaats')
  assert.notEqual(out[0], placed, 'nooit op 01')
  // Staat er al een stuk uit het dossier, of zijn het maar drie uitgevers: niets.
  assert.deepEqual(haagsDossier([...entries.slice(0, 9), { kind: 'item', id: pieces[0].id, desk: 'binnenland' }], { newsPool, stories, now: T }).entries.map((e) => e.id), [...entries.slice(0, 9).map((e) => e.id), pieces[0].id])
  assert.equal(haagsDossier(entries, { newsPool: [...pieces.slice(1), ...other], stories, now: T }).dossier, null)
  // Actueel gaat voor herhaald: alles van vóór de vorige Editie telt niet.
  assert.equal(haagsDossier(entries, { newsPool, stories, now: T, previous: { at: T - 1 * 36e5, itemIds: new Set(), storyIds: new Set() } }).entries, entries)
})

test('Haagse dossiers draaien in schaduw: de Jetten-proef (keuring ronde 3-1) verandert de Editie niet', () => {
  // Vier Haagse koppen van vier uitgevers over vier verschillende feiten, die alleen de naam van de premier delen.
  const jetten = [
    art('nos', 'Premier Jetten op werkbezoek in Groningen: excuses voor gaswinning herhaald', 2),
    art('nu', 'Kabinet-Jetten wil zondagsrust in winkels terug', 3),
    art('nrc', 'Jetten en Bontenbal botsen in debat over defensie', 4),
    art('trouw', 'Minister: Jetten belde koning over staatsbezoek', 5),
  ]
  // haagsDossier zelf bundelt ze nog (dat is wat de schaduw vastlegt) ...
  const filler = Array.from({ length: 8 }, (_, k) => ({ kind: 'item', id: `fill-${k}`, desk: 'buitenland' }))
  const r = haagsDossier(filler, { newsPool: jetten, stories: [], now: T, mainIds: MAIN_IDS })
  assert.equal(r.dossier?.naam, 'jetten')
  assert.equal(r.dossier.koppen.length, 4, 'de schaduw bewaart de koppen onder de naam, voor Alex')
  // ... maar de algemene Editie neemt het niet over: zelfde plekken met en zonder de schaduw.
  const world = ['Lima', 'Quito', 'Bogota', 'Caracas', 'Santiago', 'Havana', 'Managua', 'Panama', 'La Paz', 'Asuncion', 'Brasilia', 'Montevideo']
    .flatMap((p, k) => ['nos', 'nrc', 'bbc', 'nyt', 'guardian', 'lemonde'].map((src) => art(src, `Regering in ${p} valt na massaal protest`, 1 + k / 10)))
  const pool = [...world, ...jetten]
  const stories = buildStories(pool, {}, { mainIds: MAIN_IDS, keys: true, extended: true })
  const shadow = {}
  const withShadow = generalEdition({ stories, pool, now: T, shadow })
  const without = generalEdition({ stories, pool, now: T })
  assert.deepEqual(withShadow, without)
  if (shadow.dossier && shadow.dossier.plek !== 'al') assert.ok(!withShadow.some((e) => e.id === shadow.dossier.leadId || e.leadId === shadow.dossier.leadId), 'het dossier krijgt geen plek')
})

// ---------- punt 8 ----------
test('de Ochtendeditie wordt een uur later vastgelegd; bij de uitrol blijft een vroege Ochtendeditie staan', () => {
  assert.equal(SLOT_START.ochtend, 6 * 60 + 30)
  assert.equal(OCHTEND_VROEG, 5 * 60 + 30)
  assert.equal(editionSlot(new Date('2026-12-01T05:29:00Z')).id, '2026-11-30-avond') // 06:29
  assert.equal(editionSlot(new Date('2026-12-01T05:30:00Z')).id, '2026-12-01-ochtend') // 06:30
  assert.equal(earlyMorningSlot(Date.parse('2026-12-01T04:29:00Z')), null) // 05:29
  assert.equal(earlyMorningSlot(Date.parse('2026-12-01T04:30:00Z')).id, '2026-12-01-ochtend') // 05:30
  assert.equal(earlyMorningSlot(Date.parse('2026-12-01T05:30:00Z')), null) // 06:30: gewoon de ochtend
  assert.equal(earlyMorningSlot(Date.parse('2026-07-01T03:45:00Z')).id, '2026-07-01-ochtend') // zomer, 05:45
})

test('de ochtend licht aanvullen: hooguit twee gratis Nederlandse plekken erbij, wat er staat blijft staan', () => {
  const placed = Array.from({ length: 6 }, (_, k) => art('nrc', `Vast verhaal ${k} over de Europese begroting en Brussel`, 3))
  const entries = [...placed.map((i) => ({ kind: 'item', id: i.id, desk: 'buitenland' })), { kind: 'item', id: 'bubbel-1', desk: 'bubbel' }]
  const free = [
    art('nos', 'Treinverkeer rond Utrecht urenlang plat door storing in seinhuis', 0.5),
    art('nu', 'Zware storm verwacht in Friesland, KNMI geeft code oranje af', 0.6),
    art('rtl', 'Rotterdamse haven test eerste waterstofschip van Nederland', 0.7),
  ]
  const newsPool = [...placed, ...free]
  const add = morningTopUp(entries, { newsPool, stories: [], mainIds: MAIN_IDS, now: T, size: 10 })
  assert.equal(add.length, OCHTEND_AANVULLING)
  assert.ok(add.every((e) => free.some((i) => i.id === e.id)))
  assert.equal(morningTopUp(entries, { newsPool, stories: [], mainIds: MAIN_IDS, now: T, size: 10, done: 2 }).length, 0, 'niet meer dan twee per ochtend')
  const full = Array.from({ length: 10 }, (_, k) => ({ kind: 'item', id: `vol-${k}` }))
  assert.equal(morningTopUp(full, { newsPool, stories: [], mainIds: MAIN_IDS, now: T, size: 10 }).length, 0, 'een volle Editie blijft zoals ze is')
})

// ---------- punt 9 ----------
test('een rustige laatste noot: een licht maar waardig verhaal schuift naar de laatste plek, alleen schuiven', () => {
  const heads = ['Hegseth', 'Nvidia', 'Brand', 'Journalistiek', 'Korpschef', 'Russell Brand cel', 'Grensmuur', 'Klimaattop']
  const items = heads.map((h) => [art('nos', `${h} krijgt nieuws vandaag in Den Haag`, 1), art('nrc', `${h} nieuws`, 2)])
  const booker = [art('nos', 'Booker Prize gaat naar M. John Harrison, oudste winnaar ooit', 1), art('guardian', 'M John Harrison wins the Booker prize', 2)]
  const last = [art('volkskrant', 'Vechtersbaas Dana White als persvoorlichter van Trump was maar een grapje', 1), art('nyt', 'Dana White press job', 2)]
  const all = [...items.slice(0, 7), booker, items[7], last]
  const entries = all.map((its, k) => ({ kind: 'story', id: `q${k}`, leadId: its[0].id }))
  const members = new Map(entries.map((e, k) => [e.id, all[k]]))
  quietEnd(entries, { itemsOf: (e) => members.get(e.id) })
  assert.equal(entries[9].id, 'q7', 'de Booker Prize sluit af')
  assert.deepEqual(entries.slice(7, 9).map((e) => e.id), ['q8', 'q9'], 'de rest schuift één op')
  assert.ok(!quietNote({}, [art('nyt', 'Israel’s Election Ended With No Clear Winner'), art('bbc', 'Israel election')], art('nyt', 'Israel’s Election Ended With No Clear Winner')), 'een winnaar van een verkiezing is geen prijs')
  assert.ok(!quietNote({}, booker, art('nos', 'Schrijver M. John Harrison (1945-2026) overleden')), 'geen overlijdensbericht')
})

// ---------- punt 10 ----------
test('geen plek zonder rubriek, en de rubriek volgt het land van het onderwerp', () => {
  const booker = [art('nos', 'Booker Prize gaat naar M. John Harrison, oudste winnaar ooit', 1, { summary: 'De Britse schrijver M. John Harrison wint de Booker Prize.' }), art('guardian', 'M John Harrison wins the Booker prize', 2)]
  const nvidia = [art('nd', 'Koers Nvidia verder omlaag op Wall Street door affaire topman', 1, { summary: 'Op de Amerikaanse beurs zakte Nvidia verder.' })]
  const paraguay = [art('nos', 'Paraguayaanse president Peña stapt op na massale protesten om bankblokkade', 1)]
  const inflatie = [art('volkskrant', 'Inflatie stijgt verder tot 3,7 procent: energie en brandstof opnieuw duurder', 1)]
  const sets = [booker, nvidia, paraguay, inflatie]
  const entries = [{ kind: 'story', id: 'b', leadId: booker[0].id, desk: null }, { kind: 'item', id: nvidia[0].id, desk: null }, { kind: 'item', id: paraguay[0].id, desk: 'economie' }, { kind: 'item', id: inflatie[0].id, desk: 'economie' }]
  const members = new Map(entries.map((e, k) => [e.id, sets[k]]))
  placeDesks(entries, { itemsOf: (e) => members.get(e.id) })
  assert.deepEqual(entries.map((e) => e.desk), ['buitenland', 'vs', 'buitenland', 'economie'])
  assert.equal(deskFor([art('telegraaf', 'Fan hoopt op comeback van de zanger', 1, { url: 'https://example.com/nieuws/binnenland/1' }), art('rtl', 'Zanger zet eerste stappen richting comeback', 2)]), 'binnenland', 'zonder land: het land van de uitgevers, met de eigen rubriek van de uitgever als anker')
  // Keuring ronde 3-1: zonder Nederlands anker geen Binnenland (Matthew Perry in twee Nederlandse kranten).
  assert.equal(deskFor([art('nrc', 'Matthew Perry: zo grappig, zo sociaal, zo zelfdestructief', 1, { summary: 'De aan een overdosis overleden acteur Matthew Perry vertelde veel zelf al.' }), art('parool', 'In de docuserie zien we hoe hij verslaafd raakte', 2, { url: 'https://example.com/kunst-media/2' })]), 'buitenland')
})
