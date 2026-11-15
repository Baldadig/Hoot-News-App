// Luister verder, nieuwe shows (14 november 2026): Studio Den Haag en BNR Beurs (BNR, bron `bnr` die alleen voor podcasts
// bestaat) en de NOS Voetbalpodcast. Zie Hoot-design/podcast-concept-2026-11-14/NIEUWE-SHOWS.md (met de controle) en
// PROEF-3.md. Elke toets houdt een generieke regel vast met de echte afleveringstekst uit de feeds
// (tests/fixtures/luister-shows-2026-11-14.json: de nieuwste twintig afleveringen per show zoals de feed ze gaf, en drie
// verhalen van de avond; tests/fixtures/luister-2026-11-14.json: de verhalen van de middag).
//   1. de MEER-regel leest de hele beschrijving en kent "hebben we het ook over", "Verder deze aflevering:" en zo;
//   2. sport: speelronde, voetbalzondag, nieuwtjes en een opsomming van namen in alleen de eerste zin maken `meer`;
//   3. na de opname: een aflevering die zegt dat het nieuws pas na de opname kwam, koppelt niet aan dat nieuws;
//   4. de vaste tekst van een show (makers, "See omnystudio.com/listener…") telt niet als inhoud;
//   5. een show zonder Hoot-bron koppelt alleen onder de strenge voorwaarden (kop, actueel, eigen bron gaat voor).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { koppel, describe, vastVan, episodeOf, loadEpisodes, readHead, zonderBron, SHOW, FETCHED } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { buildStories } from '../netlify/lib/stories.mjs'

const F = JSON.parse(readFileSync(new URL('./fixtures/luister-shows-2026-11-14.json', import.meta.url), 'utf8'))
const X = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
// De afleveringen zoals de server ze leest: de vaste tekst uit de feed (vastVan), dan episodeOf.
const EPS = Object.entries(F.rauw).flatMap(([id, f]) => {
  const vast = vastVan(f.items)
  return f.items.map((it) => episodeOf(SHOW.get(id), it, f.link, vast)).filter(Boolean).map((e) => ({ ...e, ...(vast.namen.length ? { vast: vast.namen } : {}) }))
})
const ep = (show, re) => EPS.find((e) => e.show === show && re.test(e.titel))
const beurs = (re) => ep('bnr-beurs', re)
const nos = (re) => ep('nos-voetbalpodcast', re)
const studio = (re) => ep('bnr-studio-den-haag', re)
const meer = (e) => describe(e, SHOW.get(e.show)).meer

test('de showlijst: Studio Den Haag en BNR Beurs met de bron bnr (geen Hoot-bron), de NOS Voetbalpodcast met de bron nos', () => {
  for (const id of ['bnr-studio-den-haag', 'bnr-beurs', 'nos-voetbalpodcast']) {
    const s = SHOW.get(id)
    assert.equal(s.soort, 'verdieping', id)
    assert.ok(FETCHED.includes(s), id)
    assert.match(s.feed, /^https:\/\//)
  }
  assert.equal(zonderBron(SHOW.get('bnr-beurs')), true)
  assert.equal(zonderBron(SHOW.get('bnr-studio-den-haag')), true)
  assert.equal(zonderBron(SHOW.get('nos-voetbalpodcast')), false)
  assert.equal(zonderBron(SHOW.get('nos-de-dag')), false)
  assert.equal(SHOW.get('nos-voetbalpodcast').opsomming, true)
})

test('1. BNR Beurs: de MEER-regel leest de hele beschrijving; alle acht meeronderwerp-afleveringen uit de controle', () => {
  // De acht uit de controle (12, 11, 10, 9, 6, 5, 4 en 2 november), met de zin die het tweede onderwerp noemt.
  const acht = [
    [/gewipt als ceo/, /Hebben we het ook over Box 3/],
    [/ABN Amro deelt niet extra uit/, /Verder deze aflevering:/],
    [/Fed-bestuurder/, /Hebben we het ook weer over Nvidia/],
    [/verneukt Nvidia-aandeel/, /Ook hebben we het over de kwartaalcijfers van Berkshire/],
    [/Beursgang Anthropic/, /Hebben we het ook over funderingsbedrijf Sif/],
    [/Horror-hangover/, /Hebben we het ook over Het Duitse Rheinmetall/],
    [/Trump vernederd bij Midterms/, /Hebben we het ook over de cijfers van AMD/],
    [/Ahold-aandeel smelt verder weg/, /Ook hebben we het over Parijs/],
  ]
  for (const [titel, zin] of acht) {
    const e = beurs(titel)
    assert.ok(e, titel.source)
    assert.match(e.tekst, zin, titel.source)
    assert.equal(meer(e), true, titel.source)
  }
  // De samenvatting (420 tekens) is te kort: daar staat het tweede onderwerp bij de meeste niet in.
  const kort = acht.filter(([titel]) => describe({ ...beurs(titel), tekst: undefined }).meer === false)
  assert.ok(kort.length >= 5, `de samenvatting alleen mist er ${kort.length}`)
  // Ook de nieuwste (13 november) noemt een tweede onderwerp ("we hebben het ook over de beursgang van Anthropic").
  assert.equal(meer(beurs(/hert dat in de koplampen/)), true)
  // De vormen los, uit de echte beschrijvingen.
  for (const zin of ['Een bomvolle aflevering, want we hebben het ook over de beursgang van Anthropic.', 'Ook kijken we met analist Nico Inberg (De Aandeelhouder) of de bank nog meer eigen aandelen moet opkopen.', 'Hoor je trouwens ook meer over datacenterbedrijf Coreweave.', 'Verder hoor je meer over: De kwartaalcijfers van Nvidia', 'Ook in deze aflevering: AFM vermoedt handel met voorkennis', 'Dit hoor je ook deze aflevering Anthropic gaat 100 (!) miljard dollar meer uitgeven', 'Verder staan we stil bij de snoeiharde woorden van de Raad van State.']) {
    assert.equal(describe({ titel: 'x', samenvatting: zin }).meer, true, zin)
  }
  // Beurs in Zicht (weekend): één aandeel, één onderwerp.
  assert.equal(meer(beurs(/Siemens Energy/)), false)
  assert.equal(meer(beurs(/onbekende monopolist/)), false)
})

test('1. BNR Beurs koppelt dus niet zonder artikellink: elke Nvidia-aflevering gaat ook over iets anders', () => {
  const now = Date.parse(F.now)
  const byId = new Map(F.items.map((i) => [i.id, i]))
  const r = koppel({ stories: F.stories, byId, episodes: EPS.filter((e) => e.t <= now), now, mainIds: MAIN_IDS })
  assert.ok(!r.rows.koppelingen.some((k) => k.show === 'BNR Beurs'))
  const af = r.rows.afgevallen.filter((a) => a.show === 'BNR Beurs')
  assert.ok(af.length >= 2 && af.every((a) => a.reden === 'deze aflevering gaat over meer onderwerpen, zonder artikellink'))
})

test('2. NOS Voetbalpodcast: de hele speelronde of het nieuws van de week is meer; één wedstrijd of één persconferentie niet', () => {
  assert.equal(meer(nos(/#579/)), true, '"Een voetbalzondag met alles erop en eraan"')
  assert.equal(meer(nos(/#578/)), true, '"… voeren de boventoon"')
  assert.equal(meer(nos(/#576/)), true, '"Over Frenkie de Jong, Dirk Kuijt, bekerstunts en de Ballon d\'Or"; "het wel en wee"')
  assert.equal(meer(nos(/#581/)), true, '"Veel nieuwtjes bij het Nederlands elftal"')
  assert.equal(meer(nos(/#575/)), true, '"na een heerlijke speelronde"')
  assert.equal(meer(nos(/#583/)), false, 'de 7-0 tegen Griekenland')
  assert.equal(meer(nos(/#580/)), false, 'de persconferentie van Xavi')
  assert.equal(describe(nos(/#582/)).vooruit, true, '"blikken vooruit" blijft een vooruitblik')
})

test('2. de opsomming telt alleen in de eerste zin, en alleen bij een show met opsomming', () => {
  // #577: een opsomming van clubs en spelers in de eerste zin, zonder een van de woorden: alleen de opsomming maakt meer.
  const e = nos(/#577/)
  assert.equal(meer(e), true)
  assert.equal(describe(e).meer, false, 'zonder de show (geen opsomming) geen meer')
  // De makers in een latere zin tellen niet: "Jeroen Grueter, Jeroen Stekelenburg, Ibrahim Afellay en Thierry Boon praten
  // over de wedstrijd."
  assert.match(nos(/#583/).tekst, /Ibrahim Afellay en Thierry Boon praten over de wedstrijd/)
  assert.equal(meer(nos(/#583/)), false)
  // Een andere show met dezelfde eerste zin: geen opsomming-regel (Studio Den Haag noemt vaak drie partijen).
  assert.equal(describe({ titel: 'x', samenvatting: 'Coalitiepartijen CDA, D66 en VVD praten verder.' }, SHOW.get('bnr-studio-den-haag')).meer, false)
})

test('3. na de opname: #584 zegt dat het bericht over Frenkie de Jong pas na de opname kwam, en koppelt daar niet aan', () => {
  const e = nos(/#584/)
  assert.match(describe(e).naOpname, /net na het opnemen van deze podcast het bericht dat Frenkie de Jong afvalt/)
  assert.equal(describe(nos(/#583/)).naOpname, null)
  const now = Date.parse(F.now)
  const byId = new Map(F.items.map((i) => [i.id, i]))
  const r = koppel({ stories: F.stories, byId, episodes: EPS.filter((x) => x.t <= now), now, mainIds: MAIN_IDS })
  const oranje = F.stories.find((s) => s.id === 'srfd4fh')
  assert.ok(oranje.itemIds.some((id) => /Frenkie de Jong mist duel Oranje/.test(byId.get(id)?.title || '')), 'het verhaal heeft het nieuws van na de opname')
  assert.equal(r.byStory.get(oranje.id), undefined)
  assert.equal(r.rows.afgevallen.find((a) => a.verhaal === oranje.id && /#584/.test(a.aflevering))?.reden, 'de aflevering zegt dat dit nieuws pas na de opname kwam')
  // De vormen, generiek.
  for (const zin of ['Dit nieuws kwam pas na de opname.', 'Het bericht kwam pas na het opnemen van deze aflevering.', 'Ten tijde van de opname was dat nog niet bekend.', 'News of the deal broke after we recorded this episode.']) assert.ok(describe({ titel: 'x', samenvatting: zin }).naOpname, zin)
  assert.equal(describe({ titel: 'x', samenvatting: 'Ook na rust bleef Oranje aanvallen.' }).naOpname, null)
})

test('4. de vaste tekst van een show: makers en standaardzinnen tellen niet als inhoud', () => {
  const v = vastVan(F.rauw['nos-voetbalpodcast'].items)
  assert.ok(v.namen.includes('Jeroen Stekelenburg') && v.namen.includes('Thierry Boon'), v.namen.join(', '))
  assert.ok(!v.namen.includes('Ibrahim Afellay'), 'een gast is geen maker')
  assert.ok(!v.namen.some((n) => /^Het /.test(n)), '"Het Nederlands elftal" aan het begin van een zin is geen naam')
  const s = vastVan(F.rauw['bnr-studio-den-haag'].items)
  assert.ok(s.namen.includes('Sophia van Lil'))
  // De vrijdagaflevering (bijna een uur): het stuk "Over deze podcast …" en "See omnystudio.com/listener …" staan niet in
  // de tekst om op te koppelen.
  const vrijdag = studio(/^Hoog spel/)
  assert.ok(vrijdag.duur > 3000)
  assert.doesNotMatch(vrijdag.tekst, /Over deze podcast|omnystudio\.com\/listener|studiodenhaag@bnr\.nl/)
  assert.match(vrijdag.tekst, /hoog spel gespeeld in Den Haag/)
  assert.equal(meer(vrijdag), false)
  // BNR Beurs: het stuk over de makers ("… Ook is hij maker en presentator van Ons ASML …") staat niet in de tekst.
  assert.doesNotMatch(beurs(/Siemens Energy/).tekst, /Ons ASML|Hij praat graag over het aandeel Netflix|journalistiek onafhankelijke productie/)
})

test('4. de opslag: elke aflevering krijgt de hele tekst en de makers van haar show (loadEpisodes)', async () => {
  const f = F.rauw['bnr-studio-den-haag']
  const items = f.items.map((it) => `<item><title><![CDATA[${it.title}]]></title><guid>${it.guid}</guid><link>${it.link}</link><pubDate>${new Date(it.isoDate).toUTCString()}</pubDate><description><![CDATA[${it.description}]]></description></item>`).join('')
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Studio Den Haag</title><link>${f.link}</link>${items}</channel></rss>`
  const fetcher = async () => new Response(xml)
  const now = Date.parse(F.now)
  const { episodes } = await loadEpisodes({ now, deadline: Date.now() + 4000, read: (url, o) => readHead(url, { ...o, fetcher }), shows: [SHOW.get('bnr-studio-den-haag')] })
  assert.ok(episodes.length >= 2)
  for (const e of episodes) {
    assert.ok(e.tekst && !/omnystudio\.com\/listener/.test(e.tekst), e.titel)
    assert.ok(e.vast?.includes('Sophia van Lil'), e.titel)
  }
})

test('5. een show zonder Hoot-bron: het onderwerp volgt uit de kop, niet uit één gedeelde naam', () => {
  const now = Date.parse(X.now)
  const byId = new Map(X.items.map((i) => [i.id, i]))
  const r = koppel({ stories: X.stories, byId, episodes: [...X.episodes, ...EPS].filter((e) => e.t <= now), now, mainIds: MAIN_IDS })
  // "Crisisoverleg op landgoed begonnen: komen de partijen nader tot elkaar?" noemt geen partij; de intro wel. Dan koppelt
  // "Jetten wil door met het kabinet én de VVD" niet (bij een show met Hoot-bron telt het stuk van de kop: kop en intro).
  const crisis = X.stories.find((s) => /Crisisoverleg op landgoed/.test(byId.get(s.leadId)?.title || ''))
  assert.equal(r.rows.afgevallen.find((a) => a.verhaal === crisis.id && /Jetten wil door/.test(a.aflevering))?.reden, 'show zonder Hoot-bron: de kop van het verhaal deelt geen naam met de titel van de aflevering')
  assert.ok(!r.rows.koppelingen.some((k) => /Studio Den Haag|BNR Beurs/.test(k.show)))
  // Wat er bij de bestaande shows koppelde, koppelt nog steeds zo.
  assert.equal(r.byStory.get(crisis.id)?.showId, 'vk-elke-dag')
})

test('5. een show zonder Hoot-bron: een aflevering van de eigen bron gaat voor; anders hooguit tweede keus', () => {
  // De ochtend van 14 november (nabouw zoals in de proef): de kop "Crisisoverleg D66, VVD en CDA in Hilversum" is van de
  // NOS. Studio Den Haag past ("Jetten wil door met het kabinet én de VVD", verdiepend), maar De Dag van de NOS ook.
  const at = Date.parse('2026-11-14T10:50:00Z')
  const items = X.items.filter((i) => Date.parse(i.publishedAt) <= at)
  const stories = buildStories(items, {}, { mainIds: MAIN_IDS, keys: false, extended: true })
  const byId = new Map(items.map((i) => [i.id, i]))
  const run = (zonder = []) => koppel({ stories, byId, episodes: [...X.episodes, ...EPS].filter((e) => e.t <= at && !zonder.includes(e.show)), now: at, mainIds: MAIN_IDS })
  const crisis = stories.find((s) => /Crisisoverleg D66, VVD en CDA/.test(byId.get(s.leadId)?.title || ''))
  assert.ok(crisis)
  const r = run()
  assert.equal(r.byStory.get(crisis.id)?.showId, 'nos-de-dag')
  assert.ok(!(r.byStory.get(crisis.id).andere || []).some((a) => a.showId === 'bnr-studio-den-haag'))
  assert.equal(r.rows.afgevallen.find((a) => a.verhaal === crisis.id && /Jetten wil door/.test(a.aflevering))?.reden, 'show zonder Hoot-bron: een aflevering van de eigen bron van het verhaal gaat voor')
  // Zonder De Dag: de Volkskrant (een bron die de lezer volgt) gaat voor, Studio Den Haag is de tweede keus.
  const r2 = run(['nos-de-dag'])
  assert.equal(r2.byStory.get(crisis.id)?.showId, 'vk-elke-dag')
  assert.deepEqual(r2.byStory.get(crisis.id).andere.map((a) => a.showId), ['bnr-studio-den-haag'])
  // Zonder beide: Studio Den Haag, verdiepend (dezelfde kabinetscrisis, van twee dagen eerder), nooit "dezelfde uitgever".
  const l = run(['nos-de-dag', 'vk-elke-dag']).byStory.get(crisis.id)
  assert.equal(l?.showId, 'bnr-studio-den-haag')
  assert.equal(l.soort, 'verdiepend')
  assert.equal(l.dezelfdeUitgever, false)
  assert.equal(l.bron, 'bnr')
  assert.equal(l.alleenVolgers, undefined, 'Nederlandstalig: iedereen ziet haar')
})

test('5. een show zonder Hoot-bron: actueel, na het begin van het nieuws of van dezelfde of de vorige dag', () => {
  const at = Date.parse('2026-11-14T10:50:00Z')
  const items = X.items.filter((i) => Date.parse(i.publishedAt) <= at)
  const stories = buildStories(items, {}, { mainIds: MAIN_IDS, keys: false, extended: true })
  const byId = new Map(items.map((i) => [i.id, i]))
  const crisis = stories.find((s) => /Crisisoverleg D66, VVD en CDA/.test(byId.get(s.leadId)?.title || ''))
  const firstAt = Math.min(...crisis.itemIds.map((id) => Date.parse(byId.get(id)?.publishedAt) || Infinity))
  // Dezelfde aflevering, maar twee dagen vóór het begin van het nieuws: dan niet (binnen de drie dagen van verdiepend).
  const e = studio(/Jetten wil door/)
  const oud = { ...e, id: 'eoud', t: firstAt - 50 * 36e5 }
  const r = koppel({ stories, byId, episodes: [oud], now: at, mainIds: MAIN_IDS })
  assert.equal(r.byStory.get(crisis.id), undefined)
  assert.equal(r.rows.afgevallen.find((a) => a.verhaal === crisis.id)?.reden, 'show zonder Hoot-bron: de aflevering is ouder dan de dag voor het begin van het nieuws')
  // Van de vorige dag mag wel (met de andere afleveringen van de ronde erbij, zoals live: die kennen "gesprekken" als gewoon
  // woord, zodat "Gesprekken" aan het begin van een zin geen naam is; zonder De Dag en de Volkskrant, die zouden voorgaan).
  const gisteren = { ...e, id: 'egisteren', t: firstAt - 20 * 36e5 }
  const ronde = [...X.episodes, ...EPS].filter((x) => x.t <= at && x.id !== e.id && !['nos-de-dag', 'vk-elke-dag'].includes(x.show))
  assert.equal(koppel({ stories, byId, episodes: [gisteren, ...ronde], now: at, mainIds: MAIN_IDS }).byStory.get(crisis.id)?.showId, 'bnr-studio-den-haag')
})

test('alle shows: de kop zelf noemt iets uit de aflevering, niet alleen de intro (een mengverhaal over de interlands)', () => {
  // Proef 14 november, middag: het Oranje-verhaal kreeg de kop "Van Bommel heeft Lukaku terug voor duel met Italië,
  // Frankrijk beschikt weer over Mbappé". Alleen de intro noemt Oranje, Griekenland en de Nations League. De nabespreking
  // van de 7-0 (#583) past bij de stukken, maar niet bij de kop die de lezer ziet: dan niets.
  const m = F.mengverhaal
  const now = Date.parse(m.now)
  const byId = new Map(m.items.map((i) => [i.id, i]))
  assert.match(byId.get(m.stories[0].leadId).title, /^Van Bommel heeft Lukaku terug/)
  assert.match(byId.get(m.stories[0].leadId).summary, /Oranje speelt twee duels in de Nations League \(tegen Griekenland en Duitsland\)/)
  const r = koppel({ stories: m.stories, byId, episodes: EPS.filter((e) => e.t <= now), now, mainIds: MAIN_IDS })
  assert.equal(r.byStory.size, 0)
  assert.equal(r.rows.afgevallen.find((a) => /#583/.test(a.aflevering))?.reden, 'de kop zelf noemt niets uit de aflevering (alleen de intro)')
  // Met een kop over Oranje koppelt dezelfde aflevering wel (hetzelfde: de 7-0).
  const oranje = m.items.find((i) => /^Oranje na ruime zege op Grieken/.test(i.title))
  const r2 = koppel({ stories: [{ ...m.stories[0], leadId: oranje.id }], byId, episodes: EPS.filter((e) => e.t <= now), now, mainIds: MAIN_IDS })
  assert.match(r2.byStory.get(m.stories[0].id)?.aflevering || '', /#583/)
})

// ---------- Keuring 14 november (avond): herstel ----------
// Elke toets houdt een generieke regel vast; de nagebouwde afleveringen zijn realistische beschrijvingen in de vorm van de
// echte feeds, niet de tekst van één aflevering.
const VI = JSON.parse(readFileSync(new URL('./fixtures/luister-vi-zsm-2026-11.json', import.meta.url), 'utf8'))
// Een nagebouwde aflevering, drie uur voor `now`.
const nabouw = (show, titel, tekst, now) => ({ id: `nb-${show}-${titel.length}-${tekst.length}`, show, titel, samenvatting: tekst.slice(0, 420), tekst, t: now - 3 * 36e5, guid: null, duur: 1500, links: [], web: null })

test('keuring 1. de kop zelf: één gedeelde naam die alleen het kader is (een competitie, een land) is niet genoeg', () => {
  // Terugblik 10 november: de kop "Zinédine Zidane roept speler van Duitse tweedeklasser op voor tweeluik in de Nations
  // League" deelt met de persconferentie van Oranje (#580) alleen "Nations League" en "Duitse" (Duitsland). De lezer ziet een
  // kop over Frankrijk: niets.
  const d = VI.dagdelen.find((x) => /10-ochtend/.test(x.dagdeel))
  const byId = new Map(d.items.map((i) => [i.id, i]))
  const now = Date.parse(d.now)
  const r = koppel({ stories: d.stories, byId, episodes: [...VI.episodes, ...EPS].filter((e) => e.t <= now), now, mainIds: MAIN_IDS })
  const zidane = d.stories.find((s) => /^Zinédine Zidane roept/.test(byId.get(s.leadId)?.title || ''))
  assert.equal(r.byStory.get(zidane.id), undefined)
  assert.equal(r.rows.afgevallen.find((a) => a.verhaal === zidane.id && /#580/.test(a.aflevering))?.reden, 'de kop zelf deelt alleen het kader met de aflevering (niet de eerste naam van de kop, geen naam uit de titel)')
  // Met een kop over Oranje en Xavi uit hetzelfde verhaal past #580 wel bij de kop (dan beslissen de andere regels).
  const xavi = d.items.find((i) => zidane.itemIds.includes(i.id) && /^Xavi rekent op fitte Brobbey/.test(i.title))
  const r2 = koppel({ stories: [{ ...zidane, leadId: xavi.id }], byId, episodes: EPS.filter((e) => e.t <= now), now, mainIds: MAIN_IDS })
  assert.notEqual(r2.rows.afgevallen.find((a) => /#580/.test(a.aflevering))?.reden, 'de kop zelf deelt alleen het kader met de aflevering (niet de eerste naam van de kop, geen naam uit de titel)')
  // De goede koppelingen van de woordregels blijven: de eerste naam van de kop ("Trump gives Scott Colom …": Scott Colom) of
  // de enige ("Jensen Huang and the decline …") staat in de aflevering. (Sinds het herstel van 14 november koppelt The Daily
  // daar niet meer: die aflevering zegt dat het vertrek pas na de opname bekend werd.)
  const xnow = Date.parse(X.now)
  const xr = koppel({ stories: X.stories, byId: new Map(X.items.map((i) => [i.id, i])), episodes: X.episodes, now: xnow, mainIds: MAIN_IDS })
  const kop = (re) => X.stories.find((s) => re.test(X.items.find((i) => i.id === s.leadId)?.title || ''))
  assert.equal(xr.byStory.get(kop(/Scott Colom/).id)?.showId, 'today-in-focus')
  assert.equal(xr.byStory.get(kop(/decline of the visionary/).id)?.showId, 'today-in-focus')
  assert.ok(!(xr.byStory.get(kop(/decline of the visionary/).id).andere || []).some((a) => a.showId === 'the-daily'))
  // En PSV/Club Brugge bij VI ZSM (5 november).
  const d5 = VI.dagdelen.find((x) => /05-ochtend/.test(x.dagdeel))
  const r5 = koppel({ stories: d5.stories, byId: new Map(d5.items.map((i) => [i.id, i])), episodes: [...VI.episodes, ...EPS].filter((e) => e.t <= Date.parse(d5.now)), now: Date.parse(d5.now), mainIds: MAIN_IDS })
  assert.ok(r5.rows.koppelingen.some((k) => /PSV/.test(k.kop) && /Casino-voetbal PSV/.test(k.aflevering)))
})

test('keuring 2. BNR Beurs die halverwege overstapt: de volgorde-woorden, en één naam buiten het verhaal is genoeg', () => {
  const now = Date.parse(X.now)
  const byId = new Map(X.items.map((i) => [i.id, i]))
  // De kop van RTL noemt de gebeurtenis zelf ("het vertrek"); de kop van The Verge ("the decline of the visionary showman")
  // deelt alleen de naam, en dan is het geen "hetzelfde" (keuring 2: de kop zelf deelt de gebeurtenis).
  const st0 = X.stories.find((s) => /decline of the visionary/.test(byId.get(s.leadId)?.title || ''))
  const st = { ...st0, leadId: st0.itemIds.find((id) => /^Wat betekent het vertrek van Jensen Huang/.test(byId.get(id)?.title || '')) }
  assert.ok(st.leadId)
  const titel = 'Jensen Huang weg bij Nvidia: wat nu voor het aandeel? | Beurs in Zicht'
  const basis = 'Jensen Huang is vertrokken als topman van Nvidia na een tweede affaire. Ook zijn band met president Trump en handelsminister Lutnick ligt onder vuur. Wat betekent dat voor het aandeel Nvidia en voor beleggers? Deze Beurs in Zicht zoeken we het voor je uit.'
  const run = (tekst, show = 'bnr-beurs') => {
    const r = koppel({ stories: [st], byId, episodes: [nabouw(show, titel, tekst, now)], now, mainIds: MAIN_IDS })
    return { l: r.byStory.get(st.id), af: r.rows.afgevallen[0]?.reden }
  }
  // Eén onderwerp: koppelt (hetzelfde). Een gast hoort bij het panel, niet bij de inhoud.
  assert.equal(run(basis).l?.soort, 'hetzelfde')
  assert.equal(run(basis + ' Te gast: Jean Paul van Oudheusden van eToro').l?.soort, 'hetzelfde')
  // "Daarna duiken we in …" en "Tot slot: …": meer onderwerpen.
  const daarna = run(basis + ' Daarna duiken we in de cijfers van Ahold Delhaize en de dividendplannen van Shell. Tot slot: de rente van de ECB.')
  assert.equal(daarna.l, undefined)
  assert.equal(daarna.af, 'deze aflevering gaat over meer onderwerpen, zonder artikellink')
  // Zonder zo'n woord: één eigen naam buiten de zin van het eerste onderwerp die nergens in het verhaal staat.
  const stil = basis + ' Tegelijk zakt Ahold Delhaize hard na zwakke cijfers.'
  assert.equal(describe(nabouw('bnr-beurs', titel, stil, now), SHOW.get('bnr-beurs')).meer, false, 'de MEER-regel ziet het niet')
  assert.equal(run(stil).l, undefined)
  assert.equal(run(stil).af, 'show zonder Hoot-bron: de beschrijving noemt ook iets anders (Ahold)')
  // Alleen voor een show zonder Hoot-bron (de strenge voorwaarden van het besluit van 14 november).
  assert.equal(run(stil, 'nos-de-dag').l?.soort, 'hetzelfde')
})

test('keuring 3. een weekterugblik van Studio Den Haag: een kale "Verder:", de week, en namen buiten het verhaal', () => {
  const now = Date.parse(F.now)
  const byId = new Map(F.items.map((i) => [i.id, i]))
  const crisis = F.stories.find((s) => s.id === 'sts2z5a')
  const titel = 'Jetten, de VVD en een week vol crisis'
  const basis = 'Premier Jetten, VVD-leider Yesilgöz en CDA-leider Bontenbal praten verder over de toekomst van het kabinet op De Zwaluwenberg in Hilversum. De coalitiepartijen zoeken een uitweg uit de crisis.'
  const run = (tekst) => {
    const r = koppel({ stories: [crisis], byId, episodes: [nabouw('bnr-studio-den-haag', titel, tekst, now)], now, mainIds: MAIN_IDS })
    return { l: r.byStory.get(crisis.id), af: r.rows.afgevallen[0]?.reden }
  }
  assert.equal(run(basis).l?.soort, 'hetzelfde')
  // Het panel (een verslaggever die niet in het verhaal staat) telt niet als ander onderwerp.
  assert.equal(run(basis + ' We bespreken het met politiek verslaggever Leendert Beekman.').l?.soort, 'hetzelfde')
  const verder = run(basis + ' Verder: de stikstofwet van minister Wiersma, het asieldebat met Faber en de Dublin-top van Europese regeringsleiders.')
  assert.equal(verder.l, undefined)
  assert.equal(verder.af, 'deze aflevering gaat over meer onderwerpen, zonder artikellink')
  assert.equal(run(basis + ' We kijken terug op de afgelopen week in Den Haag.').af, 'deze aflevering gaat over meer onderwerpen, zonder artikellink')
  const revue = run(basis + ' Ook de stikstofwet van minister Wiersma en het asieldebat met Faber passeren de revue.')
  assert.equal(revue.l, undefined)
  assert.equal(revue.af, 'show zonder Hoot-bron: de beschrijving noemt ook iets anders (Wiersma)')
})

test('keuring: de MEER-vormen van een volgorde, en "Lees ook:" is geen tweede onderwerp', () => {
  for (const zin of ['Daarna duiken we in de cijfers van Shell.', 'Vervolgens kijken we naar de rente.', 'Tot slot: de rente van de ECB.', 'Verder: de stikstofwet en het asieldebat.', 'Ten slotte hebben we het over Ajax.', 'We blikken terug op de afgelopen week.']) {
    assert.equal(describe({ titel: 'x', samenvatting: zin }).meer, true, zin)
  }
  for (const zin of ['Lees ook: Tweede Kamer straft machtspolitiek VVD af.', 'Daarna bleef het stil in de Kamer.', 'Ook na rust bleef Oranje aanvallen.']) {
    assert.equal(describe({ titel: 'x', samenvatting: zin }).meer, false, zin)
  }
})

test('keuring: de NOS Voetbalpodcast, een opsomming in elke zin (#570); de makers en het panel tellen niet', () => {
  // #570: "De bal heeft weer gerold in de eredivisie. … Met een nieuwe koploper, veel VAR-discussies en een opvallende move
  // van Clarence Seedorf." De opsomming staat in de derde zin: de hele speelronde.
  assert.match(nos(/#570/).tekst, /Met een nieuwe koploper, veel VAR-discussies en een opvallende move/)
  assert.equal(meer(nos(/#570/)), true)
  // Eén wedstrijd of één persconferentie blijft één onderwerp, ook met het panel in een opsomming.
  for (const re of [/#583/, /#580/, /#584/, /#568/, /#565/, /#571/]) assert.equal(meer(nos(re)), false, re.source)
  assert.equal(describe({ titel: 'x', samenvatting: 'Van een slechte eerste helft en een 2-0 achterstand naar een knap herstel en een 2-2 gelijkspel.' }, SHOW.get('nos-voetbalpodcast')).meer, false, 'zonder komma geen opsomming')
})

test('keuring: de makers worden geteld zonder de vaste zinnen ("Wall Street" bij BNR Beurs is geen maker)', () => {
  const v = vastVan(F.rauw['bnr-beurs'].items)
  assert.ok(!v.namen.includes('Wall Street'), v.namen.join(', '))
  assert.ok(v.namen.includes('Jelle Maasbach'), v.namen.join(', '))
  // Een vaste zin die de makers noemt, telt wel ("We bespreken het met politiek verslaggever Sophia van Lil.").
  assert.ok(vastVan(F.rauw['bnr-studio-den-haag'].items).namen.includes('Sophia van Lil'))
  // En de inhoud houdt "Wall Street" ("Horror-hangover op Wall Street").
  const e = beurs(/Horror-hangover/)
  assert.ok(!e.vast.includes('Wall Street'))
})

// ---------- Keuring 2 (14 november): herstel ----------
// tests/fixtures/luister-keuring2-2026-11-14.json: het verhaal over Oranje van de avond (live kern, met de kop "Vijf
// Oranje-spelers … geschorst voor kwartfinale") en #583 van de NOS Voetbalpodcast, zoals de opslag van de proef ze had.
const K2 = JSON.parse(readFileSync(new URL('./fixtures/luister-keuring2-2026-11-14.json', import.meta.url), 'utf8'))
// Het Huang-verhaal van de middag met de kop van RTL, die de gebeurtenis zelf noemt ("het vertrek van Jensen Huang").
const huang = () => {
  const byId = new Map(X.items.map((i) => [i.id, i]))
  const st0 = X.stories.find((s) => /decline of the visionary/.test(byId.get(s.leadId)?.title || ''))
  const st = { ...st0, leadId: st0.itemIds.find((id) => /^Wat betekent het vertrek van Jensen Huang/.test(byId.get(id)?.title || '')) }
  const now = Date.parse(X.now)
  const titel = 'Jensen Huang weg bij Nvidia: wat nu voor het aandeel? | Beurs in Zicht'
  const basis = 'Jensen Huang is vertrokken als topman van Nvidia na een tweede affaire. Ook zijn band met president Trump en handelsminister Lutnick ligt onder vuur. Wat betekent dat voor het aandeel Nvidia en voor beleggers?'
  const run = (tekst, show = 'bnr-beurs', t = titel) => {
    const r = koppel({ stories: [st], byId, episodes: [nabouw(show, t, tekst, now)], now, mainIds: MAIN_IDS })
    return { l: r.byStory.get(st.id), af: r.rows.afgevallen[0]?.reden }
  }
  return { run, basis }
}

test('keuring 2.1 "hetzelfde": de kop zelf deelt de gebeurtenis (een kernwoord, een uitslag, twee eigen namen), niet alleen het kader', () => {
  const byId = new Map(K2.items.map((i) => [i.id, i]))
  const [st] = K2.stories
  const run = (re) => {
    const leadId = K2.items.find((i) => re.test(i.title)).id
    const r = koppel({ stories: [{ ...st, leadId }], byId, episodes: K2.episodes, now: Date.parse(K2.now), mainIds: MAIN_IDS })
    return { l: r.byStory.get(st.id), af: r.rows.afgevallen[0]?.reden }
  }
  // Live, de avond: #583 (de nabespreking van de 7-0) deelt met de kop over de schorsingen alleen Oranje (en via het verhaal de
  // Nations League). Dat is het kader, geen gebeurtenis: niets, ook geen verdiepend.
  const geschorst = run(/^Vijf Oranje-spelers/)
  assert.equal(geschorst.l, undefined)
  assert.equal(geschorst.af, 'de kop zelf deelt de gebeurtenis niet met de aflevering (geen kernwoord, uitslag of handeling, alleen namen)')
  // Hetzelfde verhaal met een kop die de uitslag noemt: wel.
  assert.equal(run(/^Nagenieten bij Oranje van 7-0/).l?.soort, 'hetzelfde')
  // De goede van main blijven (twee eigen namen uit de kop, of de uitslag in "7-0-overwinning").
  const xById = new Map(X.items.map((i) => [i.id, i]))
  const rx = koppel({ stories: X.stories, byId: xById, episodes: X.episodes, now: Date.parse(X.now), mainIds: MAIN_IDS })
  assert.ok(rx.rows.koppelingen.some((k) => /Galavoorstelling Oranje/.test(k.aflevering) && /7-0/.test(k.kop) && k.soort === 'hetzelfde'))
  // Twee eigen namen uit de kop zelf ("Wat betekent het vertrek van Jensen Huang voor Nvidia?") zijn de partijen: wel.
  const { run: hr, basis } = huang()
  assert.equal(hr(basis).l?.soort, 'hetzelfde')
})

test('keuring 2.2 BNR: ook het eerste woord van een zin telt als naam, maar een gewoon woord niet', () => {
  const { run, basis } = huang()
  assert.equal(run(basis).l?.soort, 'hetzelfde')
  // Een naam vooraan in de zin, buiten het verhaal: af.
  assert.equal(run(basis + ' Unilever opent woensdag de boeken.').af, 'show zonder Hoot-bron: de beschrijving noemt ook iets anders (Unilever)')
  assert.equal(run(basis + ' Shell verhoogt het dividend fors.').af, 'show zonder Hoot-bron: de beschrijving noemt ook iets anders (Shell)')
  assert.equal(run(basis + ' “Unilever opent de boeken,” zegt een analist.').af, 'show zonder Hoot-bron: de beschrijving noemt ook iets anders (Unilever)', 'ook na een aanhalingsteken')
  // Een gewoon woord vooraan in de zin: een functiewoord, een dag, of een woord dat elders met een kleine letter staat
  // ("beleggers" in de eerste zinnen).
  for (const zin of [' Wat betekent dat voor Nvidia?', ' Deze Beurs in Zicht zoeken we het uit.', ' Woensdag weten we meer.', ' Beleggers zijn nerveus.']) assert.equal(run(basis + zin).l?.soort, 'hetzelfde', zin)
  // Alleen bij een show zonder Hoot-bron.
  assert.equal(run(basis + ' Shell verhoogt het dividend fors.', 'nos-de-dag', 'Jensen Huang weg bij Nvidia: wat nu?').l?.soort, 'hetzelfde')
})

test('keuring 2.3 BNR: meer woorden voor een tweede onderwerp ("En verder", "Na de pauze", "In het tweede deel", "Ondertussen", "in vogelvlucht")', () => {
  const zinnen = ['En verder de woningmarkt en de olieprijs.', 'Na de pauze: de kwartaalcijfers van een supermarkt.', 'In het tweede deel gaat het over de woningmarkt.', 'Ondertussen debatteert de Tweede Kamer over de infrastructuur.', 'De rente daalt intussen weer.', 'En natuurlijk de rest van de politieke week in vogelvlucht.', 'De rest van de week bespreken we kort.', 'En: waarom de rente op spaarrekeningen weer daalt.']
  for (const zin of zinnen) {
    assert.equal(describe({ titel: 'x', samenvatting: 'Een onderwerp. ' + zin }, SHOW.get('bnr-beurs')).meer, true, zin)
    assert.equal(describe({ titel: 'x', samenvatting: 'Een onderwerp. ' + zin }, SHOW.get('bnr-studio-den-haag')).meer, true, zin)
    // Een show van een Hoot-bron: daar staan zulke woorden ook binnen één verhaal.
    assert.equal(describe({ titel: 'x', samenvatting: 'Een onderwerp. ' + zin }, SHOW.get('nos-de-dag')).meer, false, zin)
  }
  // De echte Studio Den Haag van 28 oktober (box 3, en "Ondertussen debatteert de Tweede Kamer over … infrastructuur"):
  // meer, ook zonder de zin "Hij zei tegen BNR".
  const e = studio(/Heinen verrast/)
  assert.match(e.tekst, /Ondertussen debatteert de Tweede Kamer/)
  const zonder = { ...e, tekst: e.tekst.replace(/Hij zei tegen BNR[^.]*\.\s*/, '') }
  assert.equal(meer(zonder), true)
  const { run, basis } = huang()
  assert.equal(run(basis + ' En verder de woningmarkt en de olieprijs.').af, 'deze aflevering gaat over meer onderwerpen, zonder artikellink')
  // "Opgenomen voor publiek" of een woord als "verderop" is geen tweede onderwerp.
  assert.equal(describe({ titel: 'x', samenvatting: 'Een onderwerp. Verderop in de straat bleef het rustig.' }, SHOW.get('bnr-beurs')).meer, false)
})

test('keuring 2.4 alle shows: "opgenomen voordat … bekend werd" is nieuws van na de opname', () => {
  for (const zin of ['Deze aflevering is opgenomen voordat bekend werd dat Huang vertrekt.', 'Deze aflevering werd opgenomen vóór de uitspraak.', 'Deze aflevering is opgenomen op donderdagmiddag, voordat het overleg begon.', 'Deze podcast is opgenomen voor het bericht over de schorsingen.', 'This episode was recorded before the news broke.']) assert.ok(describe({ titel: 'x', samenvatting: zin }).naOpname, zin)
  for (const zin of ['De aflevering is opgenomen voor publiek in Utrecht.', 'Hij werd opgenomen in het ziekenhuis.']) assert.equal(describe({ titel: 'x', samenvatting: zin }).naOpname, null, zin)
  const { run } = huang()
  const titel = 'Nvidia: hoe lang blijft Jensen Huang nog?'
  const tekst = 'Jensen Huang staat onder druk bij Nvidia na een affaire. Deze aflevering is opgenomen voordat bekend werd dat Huang vertrekt.'
  for (const show of ['bnr-beurs', 'nos-de-dag']) assert.equal(run(tekst, show, titel).af, 'de aflevering zegt dat dit nieuws pas na de opname kwam', show)
  // Ook zonder naam in die zin: een kernwoord van de kop ("vertrek" in "Wat betekent het vertrek van Jensen Huang …").
  const zonderNaam = 'Jensen Huang staat onder druk bij Nvidia na een affaire. Deze aflevering is opgenomen voordat zijn vertrek bekend werd.'
  assert.equal(run(zonderNaam, 'nos-de-dag', titel).af, 'de aflevering zegt dat dit nieuws pas na de opname kwam')
})
