// Frisse ogen · ronde 2 (rapport van 11 november, besluiten van Alex van 11 november), de algemene Editie op de server:
// - punt 6: één gebeurtenis, één plek, ook over de taalgrens (netlify/lib/taalgrens.mjs, generalEdition);
// - punt 4: bovenaan nieuws, geen portret; een Nederlandse portretkop gaat voor een Engelse nieuwskop (dutchHeads,
//   newsBeforePeople over de top 3);
// - besluit 1 en 3: de taalregel voor de top 3, alleen Nederlands (geen Vlaamse terugval); besluit 2: plek 01 (dutchTop);
// - besluit 5: dun is aanvullen met gratis Nederlands nieuws, hooguit één eenbronsplek en drie plekken per bron
//   (netlify/lib/aanvulling.mjs, sourceCap).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { crossLanguageEvent, crossLanguagePairs } from '../netlify/lib/taalgrens.mjs'
import { dutchHeads, dutchTop, newsBeforePeople, sourceCap, portraitTitle, DUTCH_OPEN_SHARE, SOURCE_PLACES_MAX } from '../netlify/lib/stories.mjs'
import { freeDutchFill, FREE_FILL, FILL_PER_SOURCE } from '../netlify/lib/aanvulling.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'

const T = Date.parse('2026-11-11T05:00:00Z')
const at = (h) => new Date(T - h * 36e5).toISOString()
let n = 0
const art = (source, title, h = 1, extra = {}) => ({ id: `r2-${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), url: `https://example.com/nieuws/${n}`, ...extra })

// ---------- punt 6 ----------
test('over de taalgrens: dezelfde handeling plus hetzelfde land of dezelfde stad is één gebeurtenis', () => {
  const nrc = art('nrc', 'Hooggeplaatste Amerikaanse militair in VK opgepakt op verdenking van spionage voor Rusland')
  const lemonde = art('lemonde', 'UK arrests US soldier suspected of spying for Russia')
  const fairford = art('aljazeera', 'US charges 3 men over alleged Iranian-backed plot at UK Fairford air base')
  const nos = art('nos', 'Twee vrouwen en een man dood gevonden in huis schutter Krakau, vermoedelijk familie')
  const bbc = art('bbc', 'What we know so far after Krakow gun attack')
  const markle = art('nu', 'Vader Meghan Markle opgesloten omdat hij enkelband afknipte tijdens huisarrest')
  const jemen = art('nos', 'Zeker 25 mensen gedood bij luchtaanval in de buurt van hoofdstad Jemen')
  const krakowKills = art('independent', 'Horrific mass shooting in Krakow as gunman kills six in Polish tourist spot')
  assert.ok(crossLanguageEvent(nrc, lemonde), 'de militair: opgepakt, VK, VS, Rusland')
  assert.ok(crossLanguageEvent(nos, bbc), 'Krakau en Krakow: dezelfde stad, een schietpartij')
  assert.ok(crossLanguageEvent(krakowKills, nos))
  // Alleen landen delen is te grof: een aanklacht is geen arrestatie (het risico uit het rapport, dezelfde dag).
  assert.equal(crossLanguageEvent(nrc, fairford), null)
  assert.equal(crossLanguageEvent(markle, lemonde), null)
  assert.equal(crossLanguageEvent(jemen, krakowKills), null, 'gedood delen zonder plaats is geen gebeurtenis')
  // Binnen één taal doen de gewone regels het.
  assert.equal(crossLanguageEvent(nrc, art('nos', 'Amerikaanse militair in VK opgepakt voor spionage voor Rusland')), null)
  // De eindcontrole geeft het lagere van de twee.
  const entries = [nos, nrc, lemonde, bbc].map((i) => ({ kind: 'item', id: i.id }))
  const byId = new Map([nos, nrc, lemonde, bbc].map((i) => [i.id, i]))
  assert.deepEqual(crossLanguagePairs(entries, { leadOf: (e) => byId.get(e.id) }).map((p) => [p.hoger, p.lager]), [[0, 3], [1, 2]])
})

test('de algemene Editie van 8 november ochtend: Krakow valt weg naast Krakau en de plek wordt aangevuld', async () => {
  const { loadSet, rebuild } = await import('../scripts/scorekaart.mjs')
  const set = loadSet([fileURLToPath(new URL('./fixtures/taalgrens/feed-2026-11-08-ochtend.json.gz', import.meta.url))])
  const [x] = await rebuild(set, fileURLToPath(new URL('..', import.meta.url)))
  const heads = x.edition.entries.filter((e) => e.desk !== 'bubbel').map((e) => x.byId.get(e.leadId || e.id)?.title || '')
  assert.equal(heads.filter((t) => /Krak(au|ow)/.test(t)).length, 1, heads.join('\n'))
  assert.ok(heads.some((t) => /Krakau/.test(t)), 'de Nederlandse kop blijft, de lagere Engelse valt weg')
  assert.equal(heads.length, 10, 'aangevuld tot tien')
})

// ---------- punt 4 ----------
const storyOfMembers = (members) => ({
  itemsOf: (e) => members.get(e.id),
  storyOf: (e) => ({ publisherCount: new Set(members.get(e.id).map((i) => i.source)).size }),
})

test('bovenaan een Nederlandse nieuwskop in plaats van een portret; zonder Nederlandse nieuwskop blijft de Nederlandse portretkop', () => {
  assert.ok(portraitTitle({ title: 'Nvidia-topman Jensen Huang zat midden in de American dream, totdat hij viel voor een vermeende Chinese spion' }))
  assert.ok(portraitTitle({ title: 'Een zwarte leren jas en AI-visionair: wie is Nvidia-topman Jensen Huang?' }))
  assert.ok(!portraitTitle({ title: 'Nvidia en topman Huang aangeklaagd in verband met spionagezaak' }))
  const members = new Map()
  const story = (id, its, lead) => (members.set(id, its), { kind: 'story', id, leadId: its[lead].id, desk: 'buitenland' })
  const chip = story('chip', [
    art('volkskrant', 'Topman Kraxa zat midden in de droom, totdat hij viel voor een vermeende spion', 1),
    art('nrc', 'Kraxa en topman Velden aangeklaagd in spionagezaak Kraxa', 2),
    art('nyt', 'Kraxa Chief Velden Charged in Kraxa Spy Case', 1),
    art('bbc', 'Kraxa boss Velden charged over Kraxa spy affair', 2),
  ], 0)
  // Alleen een Engelse nieuwskop naast de Nederlandse portretkop: de Nederlandse blijft (besluit van Alex).
  const solo = story('solo', [
    art('volkskrant', 'Wie is Hanna Velden, de vrouw achter het Kraxa-schandaal', 1),
    art('nyt', 'Kraxa Board Ousts Hanna Velden', 1),
    art('bbc', 'Kraxa board ousts Hanna Velden', 2),
  ], 0)
  // Een Engelse kop met alleen een Nederlandse portretkop: Nederlands wint.
  const eng = story('eng', [
    art('nyt', 'Kraxa Shares Slide After Velden Spy Charges', 1),
    art('bbc', 'Kraxa shares slide after Velden spy charges', 1),
    art('nrc', 'Wie is Velden, de topman door wie de aandelen van Kraxa kelderen', 2),
  ], 0)
  const { itemsOf } = storyOfMembers(members)
  const lead = (e) => itemsOf(e).find((i) => i.id === e.leadId)
  const out = dutchHeads([chip, solo, eng].map((e) => ({ ...e })), { itemsOf, mainIds: MAIN_IDS, now: T })
  assert.equal(lead(out[0]).source, 'nrc', 'de Nederlandse nieuwskop')
  assert.equal(lead(out[1]).source, 'volkskrant', 'geen Engelse nieuwskop boven een Nederlandse portretkop')
  assert.equal(lead(out[2]).source, 'nrc', 'een Nederlandse portretkop gaat voor een Engelse nieuwskop')
})

test('een bekend persoon op 02 of 03 wijkt voor groot nieuws over politiek of economie; een misdaadzaak alleen op 01', () => {
  const members = new Map()
  const story = (id, its) => (members.set(id, its), { kind: 'story', id, leadId: its[0].id, desk: 'buitenland' })
  const p = (s, t) => art(s, t, 1)
  const open = story('open', [p('nos', 'Kabinet valt over Belastingplan'), p('nrc', 'Kabinet gevallen'), p('rtl', 'Kabinet valt'), p('nu', 'Kabinet valt over begroting'), p('volkskrant', 'Kabinet valt')])
  const second = story('second', [p('nos', 'Rente stijgt hard, beurzen onderuit'), p('nrc', 'Beurzen onderuit door rente'), p('fd', 'Aandelen zakken door rente')])
  const people = story('people', [p('nos', 'Broer van zangeres Lina Vos opgepakt'), art('nu', 'Broer Lina Vos aangehouden', 1, { url: 'https://example.com/boulevard/1' }), art('telegraaf', 'Broer Lina Vos opgepakt', 1, { url: 'https://example.com/entertainment/2' }), p('ad', 'Broer van Lina Vos vast')])
  const money = story('money', [p('nos', 'Inflatie stijgt naar 4 procent, energie duurder'), p('volkskrant', 'Inflatie stijgt naar 4 procent'), p('fd', 'Inflatie hoger door energie')])
  const { itemsOf, storyOf } = storyOfMembers(members)
  const order = (es, heads) => newsBeforePeople(es.map((e) => ({ ...e })), { itemsOf, storyOf, heads }).map((e) => e.id)
  assert.deepEqual(order([open, second, people, money], 3), ['open', 'second', 'money', 'people'])
  assert.deepEqual(order([open, second, people, money], 1), ['open', 'second', 'people', 'money'], 'zonder heads alleen 01, zoals vroeger')
})

// ---------- besluit 1, 2, 3 ----------
test('de taalregel voor de top 3: een plek met een Engelse kop zakt naar 04, een Nederlandse nieuwsplek komt ervoor; Vlaams telt niet', () => {
  const members = new Map()
  const story = (id, its, lead = 0) => (members.set(id, its), { kind: 'story', id, leadId: its[lead].id, desk: 'buitenland' })
  const p = (s, t) => art(s, t, 1)
  const nl01 = story('nl01', [p('nos', 'Kabinet valt over Belastingplan'), p('nrc', 'Kabinet gevallen')])
  const en02 = story('en02', [p('nyt', 'Senate Passes Budget Bill'), p('bbc', 'US Senate passes budget')])
  const vl03 = story('vl03', [p('vrt', 'Belgische regering valt over begroting'), p('bbc', 'Belgian government collapses')])
  const nl04 = story('nl04', [p('nos', 'Stikstofplan rond'), p('volkskrant', 'Stikstofplan is rond')])
  const nl05 = story('nl05', [p('nu', 'Treinstaking morgen'), p('rtl', 'Morgen treinstaking')])
  const { itemsOf, storyOf } = storyOfMembers(members)
  const out = dutchTop([nl01, en02, vl03, nl04, nl05].map((e) => ({ ...e })), { itemsOf, storyOf }).map((e) => e.id)
  assert.deepEqual(out, ['nl01', 'nl04', 'nl05', 'vl03', 'en02'])
})

test('plek 01 zonder Nederlandse kop: een vers Nederlands verhaal van bijna gelijk gewicht opent, anders blijft de Engelse kop', () => {
  assert.equal(DUTCH_OPEN_SHARE, 0.9)
  const members = new Map()
  const pubs = (k, base, t) => Array.from({ length: k }, (_, j) => art(['nyt', 'bbc', 'guardian', 'ft', 'npr', 'dw', 'aljazeera', 'politico', 'independent', 'lemonde'][j] || base, t, 1))
  const story = (id, its) => (members.set(id, its), { kind: 'story', id, leadId: its[0].id, desk: 'vs' })
  const beurs = story('beurs', pubs(10, 'nyt', 'Wall Street Tumbles as Tech Stocks Slide'))
  const nl9 = story('nl9', ['nos', 'nu', 'rtl', 'nrc', 'volkskrant', 'ad', 'telegraaf', 'trouw', 'parool'].map((s) => art(s, 'Kabinet valt over Belastingplan', 1)))
  const nl8 = story('nl8', ['nos', 'nu', 'rtl', 'nrc', 'volkskrant', 'ad', 'telegraaf', 'trouw'].map((s) => art(s, 'Kabinet valt over Belastingplan', 1)))
  const { itemsOf, storyOf } = storyOfMembers(members)
  assert.deepEqual(dutchTop([beurs, nl9].map((e) => ({ ...e })), { itemsOf, storyOf, top: 1 }).map((e) => e.id), ['nl9', 'beurs'], '9 van 10 uitgevers')
  assert.deepEqual(dutchTop([beurs, nl8].map((e) => ({ ...e })), { itemsOf, storyOf, top: 1 }).map((e) => e.id), ['beurs', 'nl8'], '8 van 10: de verse Engelse kop blijft')
})

// ---------- besluit 5 ----------
test('dun is aanvullen: eerst gratis Nederlands nieuws, hooguit één eenbronsplek per bron, nooit het ND', () => {
  assert.deepEqual([...FREE_FILL].sort(), ['nos', 'nos-economie', 'nu', 'rtl'])
  assert.equal(FILL_PER_SOURCE, 1)
  const big = [art('nos', 'Kabinet valt over Belastingplan', 1), art('nrc', 'Kabinet gevallen', 1), art('rtl', 'Kabinet valt', 1)]
  const nd = [art('nd', 'Korpschef ziet geen verband', 2)]
  const verge = [art('theverge', 'Sonos adds presets', 2), art('theverge', 'OpenAI search grows', 3), art('theverge', 'AMD posts record quarter', 4)]
  const nrcCol = art('nrc', 'Flappentapper', 2)
  const nuFree = art('nu', 'Zeehondencentrum voorlopig gered van faillissement', 2)
  const rtlFree = art('rtl', 'Kinderopvang wordt duurder per januari', 3)
  const rtlTwo = art('rtl', 'Treinverkeer rond Utrecht weer op gang', 2)
  const opinion = art('nu', 'Column: waarom ik niet meer stem', 1, { type: 'opinie' })
  const pool = [...big, ...nd, ...verge, nrcCol, nuFree, rtlFree, rtlTwo, opinion]
  const stories = [
    { id: 'big', itemIds: big.map((i) => i.id), publisherCount: 3, sourceCount: 3 },
    { id: 'nd', itemIds: nd.map((i) => i.id), publisherCount: 1, sourceCount: 1 },
  ]
  const sel = [
    { kind: 'story', id: 'big', leadId: big[0].id, desk: 'binnenland' },
    { kind: 'story', id: 'nd', leadId: nd[0].id, desk: 'binnenland' },
    ...verge.map((i) => ({ kind: 'item', id: i.id, desk: 'tech' })),
    { kind: 'item', id: nrcCol.id, desk: 'binnenland' },
  ]
  const out = freeDutchFill(sel, { stories, newsStories: stories, newsPool: pool, mainIds: MAIN_IDS, now: T, size: 5 })
  const src = (e) => pool.find((i) => i.id === (e.leadId || e.id)).source
  assert.deepEqual(out.map(src), ['nos', 'nu', 'rtl', 'theverge', 'nrc'], 'het grote verhaal, dan NU.nl en RTL (één elk), dan één Verge en één NRC; geen ND')
  // Ruimer: dan nog steeds hooguit één Verge-stuk en geen tweede RTL.
  const wide = freeDutchFill(sel, { stories, newsStories: stories, newsPool: pool, mainIds: MAIN_IDS, now: T, size: 10 })
  assert.equal(wide.filter((e) => src(e) === 'theverge').length, 1)
  assert.equal(wide.filter((e) => src(e) === 'rtl').length, 1, 'één RTL-eenbronsplek, niet twee')
  assert.ok(!wide.some((e) => src(e) === 'nd'))
  assert.ok(!wide.some((e) => e.id === opinion.id), 'geen opinie als aanvulling')
})

test('hooguit drie plekken van één bron: de laagste krijgt de kop van een andere bron uit hetzelfde verhaal; de top 3 blijft', () => {
  assert.equal(SOURCE_PLACES_MAX, 3)
  const members = new Map()
  const story = (id, its) => (members.set(id, its), { kind: 'story', id, leadId: its[0].id, desk: 'binnenland' })
  const s = (id, a, b) => story(id, [art('nos', a, 1), art('nu', b, 2)])
  const es = [s('a', 'Kabinet valt over Belastingplan', 'Kabinet valt over het Belastingplan'), s('b', 'Stikstofplan Van Essen rond', 'Stikstofplan van Van Essen is rond'), s('c', 'Treinstaking Utrecht morgen', 'Morgen treinstaking rond Utrecht'), s('d', 'Zeehondencentrum Pieterburen gered', 'Zeehondencentrum Pieterburen voorlopig gered')]
  const { itemsOf } = storyOfMembers(members)
  const out = es.map((e) => ({ ...e }))
  sourceCap(out, { itemsOf, mainIds: MAIN_IDS, now: T, isFree: () => true })
  const src = out.map((e) => itemsOf(e).find((i) => i.id === e.leadId).source)
  assert.deepEqual(src, ['nos', 'nos', 'nos', 'nu'])
})
