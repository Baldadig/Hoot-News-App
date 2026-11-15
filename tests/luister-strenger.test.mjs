// Luister verder, herstel na de keuring (14 november 2026). "Het onderwerp moet echt matchen. Of hetzelfde, of verdiepend.
// Liefst van dezelfde bron." De keuring vond op eerdere dagen vier foute of twijfelachtige koppelingen (allemaal VI ZSM),
// een foute "hetzelfde" in PROEF-1 en een fout in het ophalen. Elke toets houdt een generieke regel vast, met de echte
// verhalen en afleveringen (tests/fixtures/luister-vi-zsm-2026-11.json: bewaarde feeds van 4 tot en met 11 november en de
// officiële feed van VI ZSM; tests/fixtures/luister-2026-11-14.json):
//   1. een aflevering over meer onderwerpen koppelt alleen via een artikellink, ook bij een show met één onderwerp;
//      het eerste onderwerp van de aflevering is het verhaal, en de rest van de beschrijving gaat er niet van af;
//   2. een vooruitblik koppelt niet bij de afloop;
//   3. een samengestelde naam telt als één naam ("Jong Oranje" is geen "Frenkie de Jong");
//   4. "hetzelfde" alleen als de aflevering na het eerste stuk kwam, of met een artikellink;
//   5. de artikellinks van de eigen uitgever blijven (dezelfde bron), alleen de pagina van de show valt weg;
//   6. de kop van het verhaal: het stuk van de kop en de aflevering delen minstens twee namen (een mengverhaal);
//   7. over de tijd van de ronde: toch koppelen, met wat binnen is (overtijd, 14 november).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { zoalsWoordregels } from './helpers/nep-oordeel.mjs'
import { koppel, koppelMetOordeel, episodeOf, describe, boundNames, showPage, luisterRonde, loadEpisodes, readHead, SHOW, KOPPEL_MS, LUISTER_MS, FEED_MS, APPLE_MS, PROEF_KEY, STORE_KEY } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { countsAsSource } from '../shared/edition-policy.mjs'

const VI = JSON.parse(readFileSync(new URL('./fixtures/luister-vi-zsm-2026-11.json', import.meta.url), 'utf8'))
const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const dag = (re) => VI.dagdelen.find((d) => re.test(d.dagdeel))
const vi = (re) => VI.episodes.find((e) => re.test(e.titel))
// Koppel één dagdeel uit de VI-fixture; geeft per verhaal (kop) de koppeling en de redenen van afvallen.
function run(d, { episodes = VI.episodes, stories = d.stories, items = d.items } = {}) {
  const byId = new Map(items.map((i) => [i.id, i]))
  const now = Date.parse(d.now)
  const r = koppel({ stories, byId, episodes: episodes.filter((e) => e.t <= now), now, mainIds: MAIN_IDS })
  const kop = (st) => byId.get(st.leadId)?.title || ''
  const of = (re) => {
    const st = stories.find((s) => re.test(kop(s)))
    return { l: r.byStory.get(st.id), af: (epRe) => r.rows.afgevallen.find((a) => a.verhaal === st.id && epRe.test(a.aflevering))?.reden }
  }
  return { ...r, of }
}

test('1. meer onderwerpen in één aflevering: alleen via een artikellink, ook bij een show met één onderwerp', () => {
  // Wat de beschrijving zelf zegt (geen namen in de regel).
  assert.equal(describe(vi(/Tandenloos Feyenoord/)).meer, true, '"Uiteraard ook aandacht voor de andere wedstrijden"')
  assert.equal(describe(vi(/Kolkende Kuip/)).meer, true, '"Ook een vooruitblik op…"')
  assert.equal(describe(vi(/onwerkelijke week van Carrick/)).meer, true, '"Verder ook aandacht voor…"')
  assert.equal(describe(vi(/Ajax - AZ: ploeg met minste balbezit/)).meer, true, 'een inhoudsopgave met tijden')
  assert.equal(describe(vi(/Casino-voetbal PSV/)).meer, false)
  assert.equal(describe(FIX.episodes.find((e) => /Galavoorstelling/.test(e.titel))).meer, false, '"Ook na rust bleef…" is geen tweede onderwerp')
  // De nasleep van Feyenoord-Inter (4 november): de nabespreking ging over alle Champions League-duels van die avond.
  for (const re of [/04-ochtend/, /04-avond/]) {
    const r = run(dag(re))
    assert.equal(r.byStory.size, 0, re.source)
  }
  assert.equal(run(dag(/04-ochtend/)).of(/Lichtkogels/).af(/Tandenloos/), 'deze aflevering gaat over meer onderwerpen, zonder artikellink')
})

test('1. het eerste onderwerp van de aflevering is het verhaal (Ajax, Zidane, Jong Oranje: het ging eerst over iets anders)', () => {
  // 6 november, middag: "Ronaldo stopt en Ajax wint wéér" begint met het afscheid van Ronaldo, niet met Ajax.
  assert.equal(run(dag(/06-middag/)).of(/FC Midtjylland/).l, undefined)
  assert.equal(run(dag(/06-middag/)).of(/FC Midtjylland/).af(/Ronaldo stopt/), 'het eerste onderwerp van de aflevering is iets anders')
  // 10 en 11 november: "Frenkie de Jong komt dankzij Xavi in warm bad bij Oranje" begint met Maurice Steijn bij ADO.
  assert.equal(run(dag(/10-ochtend/)).of(/Zidane/).af(/Frenkie de Jong komt/), 'het eerste onderwerp van de aflevering is iets anders')
  assert.equal(run(dag(/11-ochtend/)).of(/Reiziger verklaart/).af(/Frenkie de Jong komt/), 'het eerste onderwerp van de aflevering is iets anders')
  // De goede blijven: de nabespreking van PSV-Club Brugge (5 november) en van Oranje-Griekenland (14 november).
  const psv = run(dag(/05-ochtend/)).of(/PSV op tegen Club Brugge/).l
  assert.equal(psv?.soort, 'hetzelfde')
  assert.match(psv.aflevering, /Casino-voetbal PSV/)
})

test('1. de rest van de beschrijving gaat niet over iets anders (Ronaldo stopt, en ook Ajax, NEC, Twente en AZ)', () => {
  const r = run(dag(/06-ochtend/))
  assert.equal(r.of(/Cristiano Ronaldo/).l, undefined)
  assert.equal(r.of(/Cristiano Ronaldo/).af(/Ronaldo stopt/), 'de aflevering gaat ook over andere onderwerpen')
  // Met alleen de zinnen over Ronaldo gaat de aflevering niet meer over andere onderwerpen. Toch geen "hetzelfde" (keuring 2,
  // 14 november): de kop zelf ("Cristiano Ronaldo krijgt boodschap van… Gianni Infantino") deelt alleen de naam Ronaldo met
  // de aflevering over zijn afscheid, geen kernwoord of uitslag. Bij twijfel niets.
  const e = vi(/Ronaldo stopt/)
  const alleen = { ...e, id: 'ealleen', samenvatting: e.samenvatting.split('. ')[0] + '.' }
  const r2 = run(dag(/06-ochtend/), { episodes: [alleen] }).of(/Cristiano Ronaldo/)
  assert.equal(r2.l, undefined)
  assert.equal(r2.af(/Ronaldo stopt/), 'de kop zelf deelt de gebeurtenis niet met de aflevering (geen kernwoord, uitslag of handeling, alleen namen)')
})

test('2. een vooruitblik koppelt niet bij de afloop ("Kolkende Kuip moet Feyenoord aan drie punten helpen")', () => {
  const e = vi(/Kolkende Kuip/)
  assert.equal(describe(e).vooruit, true)
  assert.equal(describe(vi(/Galavoorstelling|Casino-voetbal/)).vooruit, false)
  assert.equal(describe(FIX.episodes.find((x) => /Oranje en Jong Oranje moeten/.test(x.titel))).vooruit, true, '"blikken vooruit", "vanavond"')
  const d = dag(/04-middag/)
  assert.equal(run(d).of(/Varkenoord/).af(/Kolkende Kuip/), 'een vooruitblik van vóór de kop van het verhaal')
  // Zelfs zonder het tweede onderwerp (de vooruitblik alleen) niet: hij verscheen vóór de kop.
  const alleen = { ...e, id: 'evooruit', samenvatting: 'Een vooruitblik op de Champions League-wedstrijd van Feyenoord van vanavond tegen Inter. Een belangrijk duel voor de kansen van de Rotterdammers om de volgende ronde te halen.' }
  assert.equal(run(d, { episodes: [alleen] }).of(/Varkenoord/).af(/Kolkende Kuip/), 'een vooruitblik van vóór de kop van het verhaal')
  // De vooruitblik op Oranje-Griekenland (13 november, 's ochtends) hoort niet bij de 7-0.
  const r = koppel({ stories: FIX.stories, byId: new Map(FIX.items.map((i) => [i.id, i])), episodes: FIX.episodes, now: Date.parse(FIX.now), mainIds: MAIN_IDS })
  assert.ok(r.rows.afgevallen.some((a) => /Oranje en Jong Oranje moeten/.test(a.aflevering) && a.reden === 'een vooruitblik van vóór de kop van het verhaal'))
})

test('3. een samengestelde naam telt als één naam: "Jong Oranje" is geen "Frenkie de Jong"', () => {
  // Gebonden: het eerste deel staat (bijna) altijd vóór dezelfde naam; "Huang" alleen blijft Jensen Huang.
  const { bound, dubbel } = boundNames([['jensen', 'huang'], ['jensen', 'huang'], ['huang'], ['nations', 'league'], ['nations', 'league'], ['huang', 'nvidia']])
  assert.equal(bound.get('jensen'), 'huang')
  assert.equal(bound.get('nations'), 'league')
  assert.ok(!bound.has('huang') && !dubbel.has('huang'), 'één keer "Huang, Nvidia" is toeval')
  // Twee betekenissen in één verhaal (Jong Oranje en De Jong): dan telt "jong" nooit.
  assert.ok(boundNames([['jong', 'oranje'], ['frenkie', 'jong'], ['jong', 'oranje'], ['jong']]).dubbel.has('jong'))
  // Het Jong Oranje-verhaal van 11 november, met de kop over Frenkie de Jong en een beschrijving die wel met Oranje begint:
  // alleen "oranje" is gedeeld, en één naam is nooit genoeg (vroeger: "twee centrale namen (jong, oranje)").
  const d = dag(/11-ochtend/)
  const lead = d.items.find((i) => /Frenkie de Jong straalt/.test(i.title))
  const stories = d.stories.map((s) => ({ ...s, leadId: lead.id }))
  const e = { ...vi(/Frenkie de Jong komt/), id: 'ezeist', samenvatting: 'Oranje is bijeengekomen in Zeist voor de Nations League-duels met Griekenland en Duitsland. Virgil van Dijk en Brian Brobbey haakten af en worden vooralsnog niet vervangen.' }
  const r = run(d, { stories, episodes: [e] })
  assert.equal(r.byStory.size, 0)
  assert.equal(r.of(/Frenkie de Jong straalt/).af(/Frenkie de Jong komt/), 'één centrale naam (oranje), geen gebeurtenis')
})

test('4. "hetzelfde" alleen als de aflevering na het eerste stuk kwam, of met een artikellink (de Volkskrant bij het crisisoverleg)', () => {
  const byId = new Map(FIX.items.map((i) => [i.id, i]))
  const st = FIX.stories.find((s) => /Crisisoverleg op landgoed/.test(byId.get(s.leadId)?.title))
  const e = FIX.episodes.find((x) => /De kamer van Klok/.test(x.titel))
  // Het eerste stuk dat als bron telt (geen aflevering, geen opinieblad).
  const items = st.itemIds.map((id) => byId.get(id)).filter(countsAsSource)
  const first = Math.min(...items.map((i) => Date.parse(i.publishedAt)))
  assert.ok(e.t < first, 'de aflevering (de stemming van donderdag) kwam vóór het eerste stuk over het overleg')
  const now = Date.parse(FIX.now)
  const l = koppel({ stories: [st], byId, episodes: [e], now, mainIds: MAIN_IDS }).byStory.get(st.id)
  assert.equal(l?.soort, 'verdiepend')
  assert.match(l.reden, /eerder verschenen/)
  // Dezelfde aflevering na het eerste stuk: dan wel hetzelfde.
  const later = { ...e, id: 'elater', t: first + 36e5 }
  assert.equal(koppel({ stories: [st], byId, episodes: [later], now, mainIds: MAIN_IDS }).byStory.get(st.id)?.soort, 'hetzelfde')
})

test('5. ophalen: de artikellinks van de eigen uitgever blijven, alleen de pagina van de show valt weg', () => {
  const verge = SHOW.get('vergecast')
  const html = '<p>Links: <a href="https://www.theverge.com/ai-artificial-intelligence/1031689/jensen-huang-nvidia-ceo-resigns">Huang</a> <a href="https://www.theverge.com/the-vergecast">show</a> <a href="https://www.theverge.com/podcast/123/x">aflevering</a> <a href="https://www.theverge.com/">home</a></p>'
  const e = episodeOf(verge, { title: 'Jensen Huang resigns, and our HomeView review', isoDate: '2026-11-13T15:00:00.000Z', guid: 'v1', content: html })
  assert.deepEqual(e.links, ['theverge.com/ai-artificial-intelligence/1031689/jensen-huang-nvidia-ceo-resigns'])
  assert.equal(showPage('https://www.nrc.nl/nieuws/2026/11/13/openlijk-conflict-in-kabinet-a4941374', SHOW.get('nrc-haagse-zaken')), false)
  assert.equal(showPage('https://www.nrc.nl/podcast/haagse-zaken/', SHOW.get('nrc-haagse-zaken')), true)
  assert.equal(showPage('https://www.nytimes.com/column/the-interview', SHOW.get('the-daily')), true)
  assert.equal(showPage('https://www.theguardian.com/infocus', SHOW.get('today-in-focus')), true)
  assert.equal(showPage('https://www.nytimes.com/2026/11/12/business/nvidia-stock-price-jensen-huang-ceo-affair.html', SHOW.get('the-daily')), false)
  // De route "liefst van dezelfde bron": de Vergecast linkt naar het Verge-stuk in het Nvidia-verhaal (kop van The Verge).
  const byId = new Map(FIX.items.map((i) => [i.id, i]))
  const big = FIX.stories.find((s) => /decline of the visionary/.test(byId.get(s.leadId)?.title))
  const stuk = { id: 'verge-ontslag', kind: 'article', source: 'theverge', sourceName: 'The Verge', title: 'Jensen Huang resigns as Nvidia CEO', summary: 'Jensen Huang has resigned as CEO of Nvidia.', url: 'https://www.theverge.com/ai-artificial-intelligence/1031689/jensen-huang-nvidia-ceo-resigns', publishedAt: '2026-11-12T20:00:00.000Z' }
  const ep = FIX.episodes.find((x) => /Jensen Huang resigns, and our HomeView/.test(x.titel))
  assert.ok(ep.links.includes('theverge.com/ai-artificial-intelligence/1031689/jensen-huang-nvidia-ceo-resigns'), 'de fixture heeft de links uit de echte feed')
  const r = koppel({ stories: [{ ...big, itemIds: [...big.itemIds, stuk.id] }], byId: new Map([...byId, [stuk.id, stuk]]), episodes: FIX.episodes, now: Date.parse(FIX.now), mainIds: MAIN_IDS })
  const l = r.byStory.get(big.id)
  assert.equal(l?.showId, 'vergecast')
  assert.equal(l.grond, 'link')
  assert.equal(l.dezelfdeUitgever, true)
})

test('6. de kop van het verhaal: een mengverhaal krijgt geen aflevering over iets anders dan de kop', () => {
  // 14 november, middag (PROEF-2): het Oranje-verhaal kreeg de kop "Niet-fitte De Jong mist Nations League-duel Oranje met
  // Duitsland". De nabespreking van de 7-0 tegen Griekenland deelt daarmee alleen "Oranje": geen koppeling. Met de kop van
  // 's ochtends (de 7-0, met Griekenland in de intro) wel.
  const byId = new Map(FIX.items.map((i) => [i.id, i]))
  const st = FIX.stories.find((s) => /Oranje dreigender/.test(byId.get(s.leadId)?.title))
  const kop = { id: 'n17tmn', kind: 'article', source: 'nos-sport', sourceName: 'NOS Sport', title: 'Niet-fitte De Jong mist Nations League-duel Oranje met Duitsland', summary: 'Frenkie de Jong mist komende maandag de wedstrijd van het Nederlands elftal tegen Duitsland in de strijd om de Nations League in Berlijn.', url: 'https://nos.nl/l/2639482', publishedAt: '2026-11-14T14:10:49.000Z' }
  const ep = FIX.episodes.filter((x) => /Galavoorstelling/.test(x.titel))
  const now = Date.parse('2026-11-14T14:20:21.383Z')
  const met = koppel({ stories: [{ ...st, leadId: kop.id, itemIds: [kop.id, ...st.itemIds] }], byId: new Map([...byId, [kop.id, kop]]), episodes: ep, now, mainIds: MAIN_IDS })
  assert.equal(met.byStory.size, 0)
  assert.equal(met.rows.afgevallen[0]?.reden, 'de kop van het verhaal deelt geen twee namen met de aflevering')
  assert.equal(koppel({ stories: [st], byId, episodes: ep, now, mainIds: MAIN_IDS }).byStory.get(st.id)?.soort, 'hetzelfde')
  // 10 november: een Nations League-verhaal met Zidane als kop. Zelfs als de aflevering met Oranje begon, gaat de kop over
  // Frankrijk.
  const d = dag(/10-ochtend/)
  const e = { ...vi(/Frenkie de Jong komt/), id: 'ezeist2', samenvatting: 'Oranje is bijeengekomen in Zeist voor de duels met Griekenland en Duitsland. Virgil van Dijk en Brian Brobbey haakten af en worden vooralsnog niet vervangen.' }
  const r = run(d, { episodes: [e] })
  assert.equal(r.byStory.size, 0)
  assert.equal(r.of(/Zidane/).af(/Frenkie de Jong komt/), 'de kop van het verhaal deelt geen twee namen met de aflevering')
})

test('7. over de tijd: het koppelen gebeurt toch, met wat binnen is; een hangende feed of lookup houdt niets op', async () => {
  assert.ok(KOPPEL_MS >= 8000 && KOPPEL_MS <= 12000, 'na het ophalen (LUISTER_MS), ruim onder de 15 s van de planner')
  assert.ok(FEED_MS < LUISTER_MS && APPLE_MS < LUISTER_MS, 'elke feed en de lookup een eigen, kortere wachttijd')
  const byId = new Map(FIX.items.map((i) => [i.id, i]))
  const now = Date.parse(FIX.now)
  const opts = { stories: FIX.stories, byId, episodes: FIX.episodes, now, mainIds: MAIN_IDS }
  const gewoon = koppel(opts)
  assert.ok(gewoon.byStory.size >= 3)
  assert.equal(koppel({ ...opts, deadline: Date.now() - 1 }).byStory.size, gewoon.byStory.size, 'geen grens in het koppelen')

  // De ronde is al over de tijd: toch dezelfde koppelingen, en de proef zegt overTijd.
  const kv = new Map()
  const laat = FIX.stories.map((st) => ({ ...st }))
  // Met een nep-oordeel dat ja zegt waar de woordregels koppelen (geen echte AI in de toetsen). Het vangnet (de kop deelt de
  // gebeurtenis, herstel 14 november) houdt er een paar van tegen; op tijd geeft dezelfde koppelingen.
  const client = zoalsWoordregels(opts)
  const opTijd = new Map()
  const verwacht = (await koppelMetOordeel({ ...opts, client: zoalsWoordregels(opts), get: (k) => opTijd.get(k), update: (k, fn) => opTijd.set(k, fn(opTijd.get(k) ?? null)) })).byStory.size
  assert.ok(verwacht >= 2)
  const n = await luisterRonde({ stories: laat, byId, now, episodesP: Promise.resolve({ episodes: FIX.episodes, status: {} }), slot: '2026-11-14-middag', mainIds: MAIN_IDS, update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)), get: (k) => kv.get(k), client, deadline: Date.now() - 1 })
  assert.equal(n, verwacht)
  assert.equal(laat.filter((st) => st.luister).length, n)
  assert.equal(kv.get(PROEF_KEY).dagdelen[0].overTijd, true)
  assert.equal(kv.get(PROEF_KEY).dagdelen[0].koppelingen.length, n)

  // Nep-fetch: De Dag hangt (het verzoek komt nooit terug en negeert het signaal), net als de iTunes-lookup; de andere
  // feeds komen meteen. De Dag valt terug op de opslag, de rest wacht er niet op, en de ronde koppelt toch.
  const shows = [...new Set(FIX.episodes.map((e) => e.show))].map((id) => SHOW.get(id))
  const store = { shows: Object.fromEntries(shows.map((s) => [s.id, { at: 0, items: FIX.episodes.filter((e) => e.show === s.id) }])) }
  const opslag = new Map([[STORE_KEY, store]])
  const hangt = () => new Promise(() => {})
  const rss = (s) => `<?xml version="1.0"?><rss version="2.0"><channel><title>${s.naam}</title><link>${s.web}</link><item><title>Iets anders</title><pubDate>${new Date(now - 36e5).toUTCString()}</pubDate><guid>${s.id}-x</guid></item></channel></rss>`
  const fetcher = (url) => (url === SHOW.get('nos-de-dag').feed ? hangt() : Promise.resolve(new Response(rss(shows.find((s) => s.feed === url)))))
  const t0 = Date.now()
  const episodesP = loadEpisodes({ now, deadline: Date.now() + 400, get: (k) => opslag.get(k), set: (k, v) => opslag.set(k, v), read: (url, o) => readHead(url, { ...o, fetcher }), shows, lookup: hangt })
  const { episodes, status } = await episodesP
  assert.ok(Date.now() - t0 < 1500, `${Date.now() - t0} ms: de hangende feed hield de ronde niet op`)
  assert.match(status['nos-de-dag'], /^mislukt/)
  assert.match(status.apple, /^mislukt/)
  assert.equal(status['vk-elke-dag'], 'opgehaald')
  assert.equal(episodes.filter((e) => e.show === 'nos-de-dag').length, FIX.episodes.filter((e) => e.show === 'nos-de-dag').length, 'De Dag uit de opslag')
  const hang = FIX.stories.map((st) => ({ ...st }))
  const m = await luisterRonde({ stories: hang, byId, now, episodesP: Promise.resolve({ episodes, status }), slot: '2026-11-14-middag', mainIds: MAIN_IDS, update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)), get: (k) => kv.get(k), client, deadline: Date.now() - 1 })
  // Dit is de tweede ronde op dezelfde opslag (sinds keuring 4 halen meer paren het oordeel dan er in één ronde gevraagd
  // worden, MAX_AANROEPEN): vergelijk met de tweede ronde op tijd.
  const tweede = await koppelMetOordeel({ ...opts, client: zoalsWoordregels(opts), get: (k) => opTijd.get(k), update: (k, fn) => opTijd.set(k, fn(opTijd.get(k) ?? null)) })
  assert.equal(m, tweede.byStory.size, 'dezelfde koppelingen als zonder hangende feed')
  const gekoppeld = (sts) => sts.filter((st) => st.luister).map((st) => `${st.id}: ${st.luister.aflevering}`).sort()
  assert.deepEqual(gekoppeld(hang), [...tweede.byStory].map(([id, l]) => `${id}: ${l.aflevering}`).sort())

  // De ronde geeft de grens mee: KOPPEL_MS vanaf de start van buildFeed.
  const build = readFileSync(new URL('../netlify/lib/build.mjs', import.meta.url), 'utf8')
  assert.match(build, /const roundStart = Date\.now\(\)/)
  assert.match(build, /await luisterRonde\(\{.*deadline: roundStart \+ KOPPEL_MS, oordeelTot: roundStart \+ OORDEEL_TOT_MS \}\)/)
})

test('herstel keuring 14 november: het vangnet voor na de opname en vooruitblik, en de zinssplitser na afkortingen', async () => {
  const { sentences } = await import('../netlify/lib/luister.mjs')
  const d = (t) => describe({ titel: 'x', samenvatting: t, tekst: t })
  const daily = 'This episode was recorded before the news of Mr. Huang’s resignation was made public. Jensen Huang resigned as the chief executive of Nvidia.'
  assert.deepEqual(sentences(daily).length, 2)
  assert.match(d(daily).naOpname, /Mr\. Huang/, 'de zin loopt door na "Mr."')
  assert.equal(sentences('Een gesprek met dr. Jansen en J. Huang. Daarna de rest.').length, 2)
  for (const t of [
    'We namen deze aflevering op voor het begin van de gesprekken op het landgoed. Wat willen de partijen?',
    'Deze aflevering namen we op voordat het crisisoverleg begon.',
    'Deze podcast werd woensdag opgenomen, vóór het nieuws over Jetten bekend werd.',
    'We spoke before the news of the resignation broke.',
    'This conversation was taped prior to the announcement.',
  ]) assert.ok(d(t).naOpname, t)
  for (const t of ['Deze aflevering is opgenomen voor publiek in Carré.', 'We namen het op tegen Ajax.']) assert.equal(d(t).naOpname, null, t)
  assert.equal(d('Morgen begint het crisisoverleg. Wat staat er op het spel?').vooruit, true)
  assert.equal(d('Tomorrow the Senate votes on the bill.').vooruit, true)
  assert.equal(d('De Kamer stemde in met de wet. Wat betekent dat voor boeren?').vooruit, false)
})
