import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composePersonal, personalRows, editionBasis, INTEREST_BONUS, storiesForReader } from '../src/lib/personal.js'
import { weight } from '../netlify/lib/desks.mjs'

const NOW = Date.parse('2026-10-22T10:00:00Z')
const ago = (h) => new Date(NOW - h * 36e5).toISOString()
const art = (id, source, title, extra = {}) => ({ id, kind: 'article', source, sourceName: source.toUpperCase(), title, summary: `Intro bij ${title}.`, publishedAt: ago(1), ...extra })

// Eigen bronnen: NOS en Tweakers. Anderen (NRC) volgt deze lezer niet.
const items = [
  art('n1', 'nos', 'Kabinet presenteert plan voor woningbouw in Utrecht'),
  art('t1', 'tweakers', 'Nieuwe chip van Nvidia verdubbelt rekenkracht voor AI', { topics: ['ai', 'tech'], publishedAt: ago(5) }),
  art('n2', 'nos', 'Storm zorgt voor schade in Zeeland, wegen afgesloten'),
  art('r1', 'nrc', 'Kabinet presenteert plan voor woningbouw, kritiek van gemeenten'),
]
const stories = [{ id: 'sWoning', leadId: 'n1', itemIds: ['n1', 'r1'], sourceCount: 2, ownCount: 1, latestAt: ago(1) }]
const global = {
  id: '2026-10-22-middag', slot: 'middag', date: '2026-10-22', next: '17:00', version: 'g@1',
  entries: [
    { kind: 'story', id: 'sWoning', leadId: 'r1', desk: 'binnenland' },
    { kind: 'item', id: 'g1', desk: 'buitenland' },
    { kind: 'item', id: 'g2', desk: 'vs' },
    { kind: 'item', id: 'b1', desk: 'bubbel', terms: [{ via: 'google' }] },
  ],
  items: [art('r1', 'nrc', 'Kabinet presenteert plan voor woningbouw'), art('g1', 'nyt', 'Wereldnieuws'), art('g2', 'nyt', 'Nieuws uit Washington'), art('b1', 'nu', 'Wat iedereen zoekt')],
  bubble: [],
}
const followed = new Set(['nos', 'tweakers'])
const make = (extra = {}) => composePersonal({ global, stories, items, followed, now: NOW, builtAt: 'T', ...extra })

test('hoofdberichten komen uit je eigen bronnen; een gedeeld verhaal krijgt een eigen bron als kop', () => {
  const e = make()
  const own = e.entries.filter((x) => x.desk !== 'extern' && x.desk !== 'bubbel')
  assert.ok(own.length >= 3)
  for (const x of own) assert.ok(followed.has(e.items.find((i) => i.id === (x.leadId || x.id)).source))
  assert.equal(own.find((x) => x.id === 'sWoning').leadId, 'n1') // NOS, niet de NRC van de algemene editie
  assert.equal(e.personal, true)
  assert.equal(e.id, global.id)
})

test('aanvullen uit de algemene editie: zonder dubbele gebeurtenis, met label', () => {
  const e = make({ interests: ['wereld'] })
  const ext = e.entries.filter((x) => x.desk === 'extern')
  assert.deepEqual(ext.map((x) => x.id), ['g1', 'g2']) // sWoning zat er al in (zelfde verhaal)
  assert.equal(ext[0].fromDesk, 'buitenland')
  assert.ok(e.items.find((i) => i.id === 'g1')) // het gepubliceerde bericht gaat mee
})

test('"Buiten je bubbel" houdt zijn plek, en nooit meer dan tien', () => {
  const e = make()
  assert.equal(e.entries.filter((x) => x.desk === 'bubbel').length, 1)
  const many = Array.from({ length: 20 }, (_, i) => art('x' + i, 'nos', `Ander nieuws nummer ${i} over onderwerp ${i}`, { publishedAt: ago(i % 5) }))
  assert.ok(make({ items: [...items, ...many] }).entries.length <= 10)
})

test('interesses geven voorrang: met interesse Tech gaat het (oudere) chipnieuws voor de storm', () => {
  const order = (e) => e.entries.map((x) => x.leadId || x.id)
  const plain = order(make())
  const tech = order(make({ interests: ['tech'] }))
  assert.ok(plain.indexOf('n2') < plain.indexOf('t1'), 'zonder interesse: nieuwer gaat voor')
  assert.ok(tech.indexOf('t1') < tech.indexOf('n2'), 'met interesse Tech: het chipnieuws gaat voor')
  assert.ok(tech.slice(0, 2).includes('n1'), 'het woningverhaal (twee bronnen) blijft vooraan')
  assert.ok(INTEREST_BONUS > 0)
})

test('echt groot nieuws (veel bronnen) blijft boven een bericht uit je interesses', () => {
  const many = ['nos', 'nrc', 'vk', 'nu', 'ad', 'trouw'].map((src, i) => art('w' + i, src, 'Kabinet valt na ruzie over asiel', { publishedAt: ago(2) }))
  const big = { id: 'sKabinet', leadId: 'w0', itemIds: many.map((i) => i.id), sourceCount: 6, ownCount: 1, latestAt: ago(2) }
  const e = composePersonal({ global, stories: [...stories, big], items: [...items, ...many], followed, interests: ['tech'], now: NOW, builtAt: 'T' })
  assert.equal(e.entries[0].leadId || e.entries[0].id, 'w0')
})

test('rijen voor de samenvatting volgen de plekken van jouw editie', () => {
  const e = make()
  const rows = personalRows(e)
  assert.equal(rows.length, e.entries.length)
  assert.equal(rows[0].entry, 0)
  assert.ok(rows.every((r) => r.title && r.sourceName))
})

test('zonder algemene editie geen persoonlijke', () => {
  assert.equal(composePersonal({ global: null, items, followed }), null)
})

test('sport verdringt het nieuws niet: hooguit twee, onderaan, alleen met die interesse', () => {
  const sources = [{ id: 'nos', cat: 'nl' }, { id: 'tweakers', cat: 'tech' }, { id: 'vi', cat: 'sport' }]
  const sport = Array.from({ length: 4 }, (_, i) => art('s' + i, 'vi', `Voetbal uitslag nummer ${i} Ajax Feyenoord PSV`, { publishedAt: ago(0.2) }))
  const withSport = new Set(['nos', 'tweakers', 'vi'])
  const none = composePersonal({ global, stories, items: [...items, ...sport], sources, followed: withSport, now: NOW, builtAt: 'T' })
  assert.equal(none.entries.filter((e) => (e.leadId || e.id).startsWith('s')).length, 0) // geen interesse sport: geen sport
  const fan = composePersonal({ global, stories, items: [...items, ...sport], sources, followed: withSport, interests: ['sport'], now: NOW, builtAt: 'T' })
  const ids = fan.entries.map((e) => e.leadId || e.id)
  const sp = ids.filter((id) => id.startsWith('s'))
  assert.ok(sp.length >= 1 && sp.length <= 2)
  assert.notEqual(ids[0].slice(0, 1), 's') // nooit het hoofdverhaal
  assert.ok(ids.indexOf(sp[0]) > ids.indexOf('g1')) // na het aangevulde nieuws
})

test('een podcast is nooit het hoofdbericht van een verhaal', async () => {
  const { leadCandidates } = await import('../netlify/lib/stories.mjs')
  const lead = leadCandidates([art('p', 'vi', 'Pak Schaal Podcast Extra: hoop bij Ajax'), art('q', 'nos', 'Ajax wint van Atalanta')], new Set(['vi', 'nos']))[0]
  assert.equal(lead.id, 'q')
})

test('een voetbalbericht uit een gewone nieuwsbron telt als sport, niet als nieuws', () => {
  const sources = [{ id: 'nos', cat: 'nl' }, { id: 'tweakers', cat: 'tech' }, { id: 'nu', cat: 'nl' }]
  const fb = art('f1', 'nu', 'Steijn en Hadj Moussa ruziën na verlies Feyenoord', { topics: ['voetbal'], publishedAt: ago(0.1) })
  const f = new Set(['nos', 'tweakers', 'nu'])
  const plain = composePersonal({ global, stories, items: [...items, fb], sources, followed: f, now: NOW, builtAt: 'T' })
  assert.ok(!plain.entries.some((e) => (e.leadId || e.id) === 'f1'))
  const fan = composePersonal({ global, stories, items: [...items, fb], sources, followed: f, interests: ['sport'], now: NOW, builtAt: 'T' })
  const ids = fan.entries.map((e) => e.leadId || e.id)
  assert.ok(ids.includes('f1') && ids[0] !== 'f1')
})

test('een liveblog (herkend aan het adres) is geen plek in de editie', () => {
  const live = art('lb', 'nos', 'Russia bombards Kyiv with missiles', { url: 'https://www.theguardian.com/world/live/2026/oct/22/russia-ukraine-war-live', publishedAt: ago(0.1) })
  const e = composePersonal({ global, stories, items: [...items, live], followed, now: NOW, builtAt: 'T' })
  assert.ok(!e.entries.some((x) => (x.leadId || x.id) === 'lb'))
})

test('"Waar iedereen over schrijft": buiten je interesses, niet dubbel, met de lead van de server', () => {
  const wideItem = art('w1', 'nu', 'Eerste besmetting met Shamonda-virus in Frankrijk', { topics: ['gezondheid'] })
  const techWide = { storyId: 'sChip', sourceCount: 14, topics: ['ai', 'tech'], item: art('w0', 'nos', 'Chiprace') }
  const g = { ...global, wide: [techWide, { storyId: 'sVirus', sourceCount: 12, topics: ['gezondheid'], item: wideItem }] }
  const e = composePersonal({ global: g, stories, items, followed, interests: ['tech'], now: NOW, builtAt: 'T' })
  const wide = e.entries.filter((x) => x.desk === 'breed')
  assert.equal(wide.length, 1)
  assert.equal(wide[0].id, 'sVirus') // het tech-verhaal valt binnen je interesse: overgeslagen
  assert.equal(wide[0].sourceCount, 12)
  assert.ok(e.items.find((i) => i.id === 'w1'))
  assert.ok(e.entries.length <= 10)
  // Staat het al in je editie, dan niet nog eens.
  const dup = composePersonal({ global: { ...global, wide: [{ storyId: 'sWoning', sourceCount: 9, topics: [], item: items[0] }] }, stories, items, followed, now: NOW, builtAt: 'T' })
  assert.equal(dup.entries.filter((x) => x.desk === 'breed').length, 0)
})

test('server: breed gedekt alleen met een gratis bron als bericht, en geen sport', async () => {
  const { widelyCovered } = await import('../netlify/lib/stories.mjs')
  const byId = new Map([
    ['a', art('a', 'nrc', 'Betaald bericht')],
    ['b', art('b', 'nos', 'Gratis bericht')],
    ['c', art('c', 'vi', 'Voetbal', { topics: ['voetbal'] })],
    ['d', art('d', 'nu', 'Voetbal', { topics: ['voetbal'] })],
    ['e', art('e', 'nrc', 'Alleen betaald')],
  ])
  const st = [
    { id: 'sNews', sourceCount: 9, itemIds: ['a', 'b'] },
    { id: 'sSport', sourceCount: 20, itemIds: ['c', 'd'] },
    { id: 'sPaid', sourceCount: 8, itemIds: ['e'] },
  ]
  const free = new Set(['nos', 'nu', 'vi'])
  const out = widelyCovered(st, byId, { isFree: (id) => free.has(id), isDutch: () => true, isSport: (i) => (i.topics || []).includes('voetbal') })
  assert.deepEqual(out.map((w) => w.storyId), ['sNews']) // sport en alleen-betaald vallen af
  assert.equal(out[0].item.id, 'b') // de gratis bron, niet NRC
})

test('een breed verhaal dat anders als aanvulling zou komen, krijgt zijn eigen label; nooit minder plekken', () => {
  // g1 (algemene editie, buitenland) is ook het breedst gedekte verhaal buiten je interesses.
  const g = { ...global, wide: [{ storyId: 'g1', sourceCount: 11, topics: ['wereld'], item: global.items[1] }] }
  const st = [...stories, { id: 'g1', itemIds: ['g1'], sourceCount: 11 }]
  const e = composePersonal({ global: g, stories: st, items, followed, interests: ['tech'], now: NOW, builtAt: 'T' })
  assert.equal(e.entries.find((x) => x.id === 'g1').desk, 'breed')
  assert.equal(e.entries.filter((x) => x.id === 'g1').length, 1)
  // Alles al in je eigen editie: dan geen breed verhaal, maar ook geen plek minder.
  const all = composePersonal({ global: { ...global, wide: [{ storyId: 'sWoning', sourceCount: 9, topics: [], item: items[0] }] }, stories, items, followed, now: NOW, builtAt: 'T' })
  const none = composePersonal({ global, stories, items, followed, now: NOW, builtAt: 'T' })
  assert.equal(all.entries.length, none.entries.length)
})

test('"Waar iedereen over schrijft" nooit over een verhaal dat je eigen bronnen ook brengen', () => {
  // Kyiv: de Guardian (gratis) is de lead van de server, maar NOS (die je volgt) schrijft er ook over.
  const kyiv = art('k1', 'guardian', 'Russia bombards Kyiv with missiles')
  const nosKyiv = art('k2', 'nos', 'Rusland bestookt Kyiv met raketten', { publishedAt: ago(30) })
  const st = [...stories, { id: 'sKyiv', leadId: 'k1', itemIds: ['k1', 'k2'], sourceCount: 6 }]
  const g = { ...global, wide: [{ storyId: 'sKyiv', sourceCount: 6, topics: ['oekraine'], item: kyiv }] }
  const e = composePersonal({ global: g, stories: st, items: [...items, nosKyiv], followed, now: NOW, builtAt: 'T' })
  assert.ok(!e.entries.some((x) => x.desk === 'breed'))
  assert.ok(e.items.some((i) => i.source === 'guardian'), 'de beschikbare eigen versie is dertig uur oud; een actuele externe versie mag met een eerlijke aanvulreden')
  assert.equal(e.entries.find(x=>(x.leadId||x.id)==='k1')?.supplement,'groot')
  // Zonder eigen bron in het verhaal komt het er wel, via de gratis bron.
  const st2 = [...stories, { id: 'sKyiv', leadId: 'k1', itemIds: ['k1'], sourceCount: 6 }]
  const e2 = composePersonal({ global: g, stories: st2, items, followed, now: NOW, builtAt: 'T' })
  assert.ok(!e2.entries.some(x=>x.desk === 'breed'), 'zes uitgevers uit één land is zonder Wereld geen groot nieuws')
  const st3 = st2.map(s=>s.id === 'sKyiv' ? {...s,publisherCount:8,publisherCountries:['GB']} : s)
  const e3 = composePersonal({global:g,stories:st3,items,followed,now:NOW,builtAt:'T'})
  assert.equal(e3.entries.find(x=>x.desk === 'breed')?.id,'sKyiv')
})

test('een bericht van een vakbron krijgt de rubriek van de bron (buiten de indeling)', () => {
  // De zetels Buitenland gaan naar de bredere verhalen uit Londen en Parijs; de review komt bij het
  // aanvullen en heet dan Tech, niet Buitenland ("Britse fabrikant").
  const sources = [{ id: 'nos', cat: 'nl' }, { id: 'tweakers', cat: 'tech' }]
  const review = art('rv', 'tweakers', 'Review: koptelefoon van Britse fabrikant Nothing', { publishedAt: ago(0.2) })
  const abroad = [
    art('bu1', 'nos', 'Britse premier stapt op na nederlaag in Londen', { publishedAt: ago(0.5) }),
    art('bu2', 'nos', 'Britse regering in crisis na vertrek premier', { publishedAt: ago(0.4) }),
    art('fr1', 'nos', 'Franse president ontbindt parlement in Parijs', { publishedAt: ago(0.5) }),
  ]
  const st = [...stories, { id: 'sBrit', leadId: 'bu1', itemIds: ['bu1', 'bu2'], sourceCount: 3, latestAt: ago(0.4) }, { id: 'sFrans', leadId: 'fr1', itemIds: ['fr1'], sourceCount: 3, latestAt: ago(0.5) }]
  const e = composePersonal({ global, stories: st, items: [...items, ...abroad, review], sources, followed, interests: ['wereld'], now: NOW, builtAt: 'T' })
  assert.deepEqual(['sBrit', 'sFrans'].map((id) => e.entries.find((x) => x.id === id).desk), ['buitenland', 'buitenland'])
  assert.equal(e.entries.find((x) => (x.leadId || x.id) === 'rv').desk, 'tech')
})

test('vingerafdruk: andere bronnen of interesses geven een andere afdruk, volgorde maakt niet uit', () => {
  const a = editionBasis(['nos', 'nyt', 'atlantic'], ['tech'], [])
  assert.equal(a, editionBasis(['atlantic', 'nos', 'nyt'], ['tech'], []))
  assert.notEqual(a, editionBasis(['nos', 'nyt', 'atlantic', 'guardian'], ['tech'], [])) // startbronnen erbij
  assert.notEqual(a, editionBasis(['nos', 'nyt', 'atlantic'], [], []))
})

test('wat je vaak leest, krijgt voorrang in je editie', async () => {
  const { learn, emptyAffinity } = await import('../src/lib/affinity.js')
  let affinity = emptyAffinity()
  const liked = items.find((i) => (i.topics || []).length) || items[0]
  for (let n = 0; n < 12; n++) affinity = learn(affinity, liked)
  const withTaste = make({ affinity })
  assert.ok(withTaste.entries.length > 0)
  assert.ok(withTaste.items.some((i) => i.id === liked.id || (i.topics || []).some((t) => (liked.topics || []).includes(t))))
})

test('voorkeursbronnen gaan voor: hun verhaal hoger en hun bericht als hoofdbericht', () => {
  const both = new Set(['nos', 'tweakers', 'nrc'])
  const plain = composePersonal({ global, stories, items, followed: both, now: NOW, builtAt: 'T' })
  const fav = composePersonal({ global, stories, items, followed: both, favorites: ['nrc'], now: NOW, builtAt: 'T' })
  const lead = (e) => e.entries.find((x) => x.id === 'sWoning')?.leadId
  assert.equal(lead(plain), 'n1') // zonder voorkeur: NOS (Nederlands, eerder gekozen)
  assert.equal(lead(fav), 'r1') // met voorkeur voor NRC: het NRC-bericht
})

test('eigen bronnen zijn die van de lezer: één gekozen uitgever geeft een begrensde bijdrage', () => {
  // Carbon Brief is geen basisbron: de server telde dit verhaal als ownCount 0.
  const its = [
    art('c1', 'carbonbrief', 'China zet nieuwe stap richting klimaatdoel voor COP31', { publishedAt: ago(2) }),
    art('x1', 'guardian', 'China pledges new climate target ahead of COP31 talks', { publishedAt: ago(2) }),
    art('n9', 'nos', 'Storm zorgt voor schade in Zeeland, wegen afgesloten', { publishedAt: ago(1) }),
  ]
  const st = [{ id: 'sCop', leadId: 'x1', itemIds: ['c1', 'x1'], sourceCount: 2, ownCount: 0, latestAt: ago(2) }]
  const fol = new Set(['carbonbrief', 'nos'])
  const [mine] = storiesForReader(st, its, fol)
  assert.equal(mine.ownCount, 1)
  assert.equal(weight(mine, NOW) - weight(st[0], NOW), 2)
  assert.equal(st[0].ownCount, 0) // het origineel blijft zoals de server het gaf
  const ids = composePersonal({ global, stories: st, items: its, followed: fol, interests: ['wereld'], now: NOW, builtAt: 'T' }).entries.map((x) => x.id)
  assert.ok(ids.includes('sCop') && ids.indexOf('sCop') < ids.indexOf('n9'), ids.join(','))
})

test('verhalen per lezer: ownCount telt verschillende eigen bronnen, de rubriek gaat ongewijzigd mee', () => {
  const its = [art('a', 'nos', 'x'), art('b', 'nos', 'y'), art('c', 'nrc', 'z'), art('d', 'nyt', 'w')]
  const st = [
    { id: 's1', itemIds: ['a', 'b', 'c', 'd'], sourceCount: 3, ownCount: 2, desk: 'vs' },
    { id: 's2', itemIds: ['d'], sourceCount: 1, ownCount: 1, desk: null },
  ]
  const r = storiesForReader(st, its, new Set(['nos', 'nrc']))
  assert.deepEqual(r.map((x) => [x.id, x.ownCount, x.desk]), [['s1', 2, 'vs'], ['s2', 0, null]])
  assert.deepEqual(storiesForReader(st, its, new Set(['nyt'])).map((x) => x.desk), ['vs', null])
})

test('verhalen per lezer: zonder st.desk van de server rekenen we hem uit alle berichten uit', () => {
  const its = [
    art('u1', 'nyt', 'Trump signs order in the White House on tariffs'),
    art('u2', 'nos', 'Trump tekent decreet over importheffingen in het Witte Huis'),
  ]
  const st = [{ id: 'sT', itemIds: ['u1', 'u2'], sourceCount: 2, ownCount: 1 }]
  const a = storiesForReader(st, [its[1]], new Set(['nos']), its)
  const b = storiesForReader(st, [its[0]], new Set(['nyt']), its)
  assert.equal(a[0].desk, 'vs')
  assert.equal(b[0].desk, 'vs')
})

// Keuring 1 november (live feed 10:40, hertagd): een buitenlands verhaal met één NU-bericht erin was voor wie
// Binnenland koos "Omdat je Binnenland volgt", en nam als Nederlandse voorpagina een van de twee internationale
// plekken in. De geo van een verhaalplek volgt het hele verhaal (storyForeignOf, internationalNews), niet dat
// ene lid: NU zegt binnenland, RTL en de BBC zeggen VS, Telegraaf en Variety niets.
test('een buitenlands verhaal met een NU-lid is geen Binnenland (Heidi Klum op Halloween)', async () => {
  const { internationalNews } = await import('../shared/edition-policy.mjs')
  const { storyForeignOf } = await import('../netlify/lib/desks.mjs')
  const sources = [{ id: 'nu', cat: 'nl', lang: 'nl' }, { id: 'rtl', cat: 'nl', lang: 'nl' }, { id: 'telegraaf', cat: 'nl', lang: 'nl' }, { id: 'bbc', cat: 'nieuws', lang: 'en' }, { id: 'variety', cat: 'cultuur', lang: 'en' }]
  // De zes berichten zoals de live feed ze leverde (alleen de tijden zijn verschoven).
  const klum = [
    art('1q071xd', 'rtl', 'Heidi Klum stapt in eigen afgehakte linkerhand voor Halloween', { summary: 'Heid Klum organiseert ieder jaar een Halloweenfeest in New York. En ook dit jaar steelt ze de show.', topics: [], url: 'https://www.rtl.nl/nieuws/buitenland/video/2110b44c-4cf6-456e-9439-d953753921f2/heidi-klum-stapt-eigen-afgehakte', publishedAt: ago(1.2) }),
    art('v0ocyu', 'nu', 'Heidi Klum pakt weer uit met Halloween en gaat verkleed als afgezaagde hand', { summary: 'Heidi Klum ging dit jaar tijdens haar jaarlijkse Halloweenfeest verkleed als afgezaagde hand.', topics: [], url: 'https://www.nu.nl/achterklap/6415107/heidi-klum-pakt-weer-uit-met-halloween-en-gaat-verkleed-als-afgezaagde-hand.html', publishedAt: ago(2.2) }),
    art('kdfyzg', 'telegraaf', 'Heidi Klum verschijnt in gruwelijk Halloweenkostuum op rode loper', { summary: 'Heidi Klum (53) heeft opnieuw alles uit de kast gehaald voor haar jaarlijkse Halloweenfeest in New York.', topics: [], url: 'https://www.telegraaf.nl/video/heidi-klum-verschijnt-in-gruwelijk-halloweenkostuum-op-rode-loper/163912344.html', publishedAt: ago(2.4) }),
    art('15u8ija', 'rtl', 'Heidi Klum maakt zichzelf opnieuw onherkenbaar voor Halloween', { summary: 'Heidi Klum (53) heeft Halloween opnieuw naar haar hand gezet.', topics: [], url: 'https://www.rtl.nl/boulevard/artikel/5662295/heidi-klum-maakt-zichzelf-opnieuw-onherkenbaar-voor-halloween', publishedAt: ago(3.4) }),
    art('1xjlp5z', 'bbc', 'Watch: Heidi Klum as giant severed hand for Halloween bash', { summary: 'The supermodel and TV host provided a gory new shock at her New York event.', topics: [], url: 'https://www.bbc.co.uk/news/videos/cj040yd1xdrlo', publishedAt: ago(5.3) }),
    art('7sjk91', 'variety', 'Heidi Klum Dressed Up as a Severed Human Hand for Her Annual Halloween Party', { summary: 'Is it really Halloween without Heidi Klum?', topics: ['gezondheid', 'film'], url: 'https://variety.com/2026/scene/news/heidi-klum-halloween-2026-severed-human-hand-costume-1236935653/', publishedAt: ago(7.5) }),
  ]
  const home = [
    art('h1', 'nu', 'Sovjet Ereveld in Leusden opnieuw beklad, leuzen tegen communisten', { publishedAt: ago(1) }),
    art('h2', 'telegraaf', 'Sovjet-ereveld in Leusden opnieuw beklad met leuzen', { publishedAt: ago(1.1) }),
    art('h3', 'rtl', 'Ereveld in Leusden beklad', { publishedAt: ago(1.3) }),
    art('h4', 'nu', 'Geen deal met oppositie over belastingplan, woensdag debat in Tweede Kamer', { publishedAt: ago(2) }),
    art('h5', 'telegraaf', 'Nog geen deal belastingplan na nieuwe gespreksronde in Den Haag', { publishedAt: ago(2.2) }),
    art('h6', 'nu', 'Gewonden bij steekpartij in bus in Breda', { publishedAt: ago(3) }),
    art('h7', 'rtl', 'Tilburgse studenten overmeesteren inbreker in studentenhuis', { publishedAt: ago(3.5) }),
  ]
  assert.ok(storyForeignOf(klum) && internationalNews(klum, null, { publisherCountries: ['NL', 'GB', 'US'] }), 'het verhaal zelf is buitenlands')
  const st = [
    { id: 's1gfhthv', leadId: 'v0ocyu', itemIds: klum.map((i) => i.id), sourceCount: 5, latestAt: ago(1.2), desk: null, publisherCountries: ['NL', 'GB', 'US'] }, // de rubriek zoals de nieuwe server hem zet (deskOfStory),
    { id: 'sLeusden', leadId: 'h1', itemIds: ['h1', 'h2', 'h3'], sourceCount: 3, latestAt: ago(1), desk: 'binnenland', publisherCountries: ['NL'] },
    { id: 'sBelasting', leadId: 'h4', itemIds: ['h4', 'h5'], sourceCount: 2, latestAt: ago(2), desk: 'binnenland', publisherCountries: ['NL'] },
  ]
  const e = composePersonal({ global, stories: st, items: [...klum, ...home], sources, followed: new Set(['nu', 'rtl', 'telegraaf']), interests: ['binnenland'], now: NOW, builtAt: 'T' })
  const k = e.entries.find((x) => x.id === 's1gfhthv' || klum.some((i) => i.id === (x.leadId || x.id)))
  if (k) {
    assert.notEqual(k.why?.text, 'Omdat je Binnenland volgt', JSON.stringify(k.why))
    assert.notEqual(k._parts?.interest?.f, 'binnenland', JSON.stringify(k._parts))
  }
  assert.ok(!/Klum/.test(e.items.find((i) => i.id === (e.entries[0].leadId || e.entries[0].id))?.title || ''), 'geen Klum als opening')
})
