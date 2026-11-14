// Persona's 14 november, punt 7: lokaal nieuws van elders zakt. Australische deelstaatpolitiek en een rechtszaak in New
// South Wales kwamen als vulsel, en puur Amerikaans binnenland (een ceremonie van Hegseth, de laatste zwarte senatoren uit
// Mississippi, een rechtszaak in Delaware, het Senaatsleiderschap van de Democraten) als opener of als Waar iedereen over
// schrijft. Nu komt zo'n plek pas als al het andere toegelaten aanbod er staat, achteraan, nooit op 01 en nooit als Waar
// iedereen over schrijft, tenzij het verhaal breder speelt (groot nieuws).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal } from '../src/lib/personal.js'
import { localAbroad } from '../netlify/lib/desks.mjs'
import { majorNews, homePublishersOf } from '../shared/edition-policy.mjs'
import { resolveTopics } from '../src/lib/topics.js'

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const FEEDS = ['feed-2026-11-05-ochtend', 'live-feed-2026-11-07', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend', 'live-feed-2026-11-04-midterms']

test('lokaal van elders: Amerikaans binnenland en deelstaten, niet wat breder gaat', () => {
  const local = (title, desk = null, url = '') => localAbroad([{ title, url }], { desk })
  assert.ok(local('Military cemetery decorum: Hegseth’s Veterans Day reprimand', 'vs'))
  assert.ok(local('Before Scott Colom, these two men were the last black US senators from Mississippi'))
  assert.ok(local('Machtsstrijd bij Democraten voor leiderschap in Senaat', 'vs'))
  assert.ok(local('Delaware judge rules on House seat dispute'))
  assert.ok(local('NSW premier announces inquiry into council'))
  assert.ok(local('Teenager charged over Bondi stabbing', null, 'https://www.theguardian.com/australia-news/2026/nov/13/bondi'))
  assert.ok(!local('Trump kondigt heffingen op Europese auto’s aan', 'vs'), 'Europa')
  assert.ok(!local('Amerikaanse militair opgepakt in VK om spionage voor Rusland', 'vs'), 'een ander land')
  assert.ok(!local('Trump en Xi ontmoeten elkaar in Peking', 'vs'))
  assert.ok(!local('Trump threatens to leave NATO', 'vs'))
  assert.ok(!local('Kabinet valt over stikstof', 'binnenland'))
  assert.ok(!local('Storm Charles batters coastline of southern Spain', 'buitenland'))
  // Brengen minstens twee uitgevers van hier het verhaal (Nederland of Vlaanderen), dan is het geen lokaal nieuws van
  // elders; een Britse krant over Amerika maakt het niet breder (tweede keuring 14 november). Geteld per uitgever, niet per
  // land: één Nederlands stuk, ook als kop, is niet genoeg (derde keuring).
  const hegseth = [{ title: 'Republicans Turn Back Effort to Impeach Hegseth' }]
  assert.ok(localAbroad(hegseth, { desk: 'vs', homePublishers: [] }))
  assert.ok(localAbroad(hegseth, { desk: 'vs', homePublishers: ['nos'] }))
  assert.ok(localAbroad(hegseth, { desk: 'vs', homePublishers: ['nos', 'nos'] }), 'één uitgever, twee keer')
  assert.ok(!localAbroad(hegseth, { desk: 'vs', homePublishers: ['nos', 'nrc'] }))
  assert.ok(!localAbroad([{ title: 'NSW premier announces inquiry into council' }], { homePublishers: ['vrt', 'standaard'] }))
})

// Derde keuring 14 november: één Nederlands stuk over een staat of een Amerikaanse stad is lokaal nieuws van elders, ook als
// het de kop is. Twee stukken van dezelfde uitgever (NOS en NOS Sport) blijven één uitgever; NOS en NRC zijn er twee.
test('lokaal van elders: één Nederlandse uitgever over een staat is niet genoeg', () => {
  const state = { title: 'Mississippi kiest Democraat als senator', source: 'rtl' }
  const city = { title: 'Twee doden nadat gebouw instort in New York', source: 'nu' }
  for (const head of [state, city]) {
    assert.deepEqual(homePublishersOf([head], {}), [head.source])
    assert.ok(localAbroad([head], { homePublishers: homePublishersOf([head], {}) }), head.title)
  }
  const shooting = [{ title: 'Schietpartij in Washington', source: 'nos' }, { title: 'Schietpartij in Washington, verdachte gezocht', source: 'nos-sport' }]
  assert.deepEqual(homePublishersOf(shooting, {}), ['nos'])
  assert.ok(localAbroad(shooting, { desk: 'vs', homePublishers: homePublishersOf(shooting, {}) }), 'één uitgever')
  const two = [...shooting, { title: 'Schutter Washington opgepakt', source: 'nrc' }]
  assert.ok(!localAbroad(two, { desk: 'vs', homePublishers: homePublishersOf(two, {}) }), 'twee uitgevers')
  // De bronnen van de hele gebeurtenis van de server tellen mee, een Britse niet.
  assert.deepEqual(homePublishersOf([state], { sourceNames: ['NOS', 'The Guardian'] }), ['nos', 'rtl'])
})

// Herstelkeuring 3, punt 7: zonder de uitzondering voor één uitgever moet de kop zelf het anker of het tweede land laten
// zien. Een land als bijvoeglijk naamwoord ("Iraanse") is een ander land, een Nederlander of een Nederlands bedrijf (ook de
// beurs) een anker van hier. Echte koppen uit de feeds; met de rubriek VS, zoals de server ze geeft.
test('lokaal van elders: een land als bijvoeglijk naamwoord, een Nederlander of een Nederlands bedrijf is niet lokaal', () => {
  for (const title of [
    'WSJ: Vance overweegt directe onderhandelingen met Iraanse topfunctionaris',
    'Ook Iraanse parlementsvoorzitter becommentarieert midterms',
    'Iraanse media: Amerikaanse drone neergehaald',
    'Philips schikt apneu-zaak met Amerikaanse justitie',
    'Vanaf Beursplein 5: techaandelen hard omlaag',
    'Nederlander opgepakt in Texas',
    'Nederlandse toerist omgekomen bij ongeluk in Florida',
    'Libanese premier spreekt met Trump',
    'Nederlandse student vast in Amerikaanse cel',
    'ASML krijgt boete van Amerikaanse toezichthouder',
  ]) assert.ok(!localAbroad([{ title, source: 'nos' }], { desk: 'vs', homePublishers: ['nos'] }), title)
  // Het bijvoeglijk naamwoord van het land zelf blijft binnenland, en een Nederlands anker bij een deelstaat telt ook.
  assert.ok(localAbroad([{ title: 'Amerikaanse senator stapt op na schandaal' }], { desk: 'vs' }))
  assert.ok(!localAbroad([{ title: 'Nederlandse backpacker vermist in Queensland' }], {}))
  assert.ok(localAbroad([{ title: 'Welsh council approves new bypass' }], {}) === false, 'geen deelstaat of binnenlandrubriek')
  assert.ok(localAbroad([{ title: 'Welsh council approves new bypass', url: 'https://www.theguardian.com/uk-news/2026/nov/13/bypass' }], {}), 'Wales in de Britse binnenlandrubriek blijft lokaal')
})

// Keuring van het herstel na herstelkeuring 3, punt 7: de bijvoeglijke vormen en inwonersnamen van alle landen (één tabel,
// COUNTRY_FORMS), Nederlands en Engels. De 17 vormen die de keuring nog als Amerikaans binnenland zag, en een paar koppen
// zoals ze in een feed kunnen staan. Amerikaanse vormen (een staat, de VS zelf) blijven binnenland.
test('lokaal van elders: elk land als bijvoeglijk naamwoord of inwonersnaam is een ander land', () => {
  for (const adj of ['Venezolaanse', 'Argentijnse', 'Pakistaanse', 'Iraakse', 'Koeweitse', 'Oegandese', 'Armeense', 'Kazachse', 'Surinaamse', 'Guatemalteekse', 'Bengaalse', 'Jordaanse', 'Emiraatse', 'Dominicaanse', 'Spanish', 'Polish', 'Turkish']) {
    assert.ok(!localAbroad([{ title: `${adj} minister ontmoet Trump` }], { desk: 'vs' }), adj)
  }
  for (const title of [
    'Amerikaanse marine beschiet Venezolaanse boot',
    'Polish president visits White House',
    'Pakistaanse premier bij Trump',
    'Iraakse regering reageert op Amerikaanse aanval',
    'Venezolanen in Florida vrezen uitzetting',
  ]) assert.ok(!localAbroad([{ title }], { desk: 'vs' }), title)
  for (const title of ['Texaanse prediker opgepakt na preek', 'Californische wet tegen deepfakes aangenomen', 'Amerikaanse senator stapt op na schandaal']) {
    assert.ok(localAbroad([{ title }], { desk: 'vs' }), title)
  }
  // Het eigen land van een binnenlandrubriek telt niet, ook niet als bijvoeglijk naamwoord.
  assert.ok(localAbroad([{ title: 'Scottish council approves new bypass', url: 'https://www.theguardian.com/uk-news/2026/nov/13/bypass' }], {}))
  assert.ok(localAbroad([{ title: 'English town votes on new bypass', url: 'https://www.theguardian.com/uk-news/2026/nov/13/bypass' }], {}))
  assert.ok(!localAbroad([{ title: 'Polish workers protest in English town', url: 'https://www.theguardian.com/uk-news/2026/nov/13/x' }], {}))
})

// Keuring na herstelkeuring 3, kleiner punt: "Holland" als achternaam (Tom Holland) is geen Nederlands anker; Holland als
// plaats of als begin van een naam van hier blijft dat wel.
test('lokaal van elders: Holland als achternaam is geen anker van hier', () => {
  for (const title of ['Tom Holland krijgt ster op Walk of Fame in Los Angeles', 'Jools Holland tours Texas']) assert.ok(localAbroad([{ title }], { desk: 'vs' }), title)
  for (const title of ['Spelers uit Holland winnen toernooi in Texas', 'Holland Casino opent vestiging in Las Vegas', 'Noord-Holland stuurt handelsmissie naar Texas', 'Nederlandse toerist omgekomen in Florida']) {
    assert.ok(!localAbroad([{ title }], { desk: 'vs' }), title)
  }
})

// Keuring 4 na herstelkeuring 3, punt 7: een werelddeel of regio, als naam of bijvoeglijk naamwoord, Nederlands of Engels,
// maakt een kop breder, net als een land. Een Amerikaanse bevolkingsgroep en Arctic als weerwoord niet.
test('lokaal van elders: een werelddeel of regio is een ander land', () => {
  for (const title of [
    'Trump begint rondreis door Azië', 'US strikes in the Caribbean', 'Trump stuurt oorlogsschepen naar Latijns-Amerika', 'Arab leaders meet Trump',
    'Trump meets African leaders', 'Afrikaanse leiders bij Trump', 'Koerdische strijders vragen Trump om hulp', 'Kurdish fighters ask Trump for help',
    'Rubio visits the Balkans', 'Trump op bezoek in Midden-Amerika', 'Trump stuurt schepen naar het Caribisch gebied', 'Arabische leiders bij Trump',
    'Trump wil Scandinavië bezoeken', 'Baltische staten vragen Trump om steun', 'Baltic states plead with Trump', 'Sahel: Trump stuurt drones',
    'Trump eyes Arctic shipping lanes', 'Asian markets slide after Trump tariff', 'Central America migrants reach Texas border',
  ]) assert.ok(!localAbroad([{ title }], { desk: 'vs' }), title)
  const latin = 'Latin America’s Swing to the Right Was Never About Trump'
  assert.ok(!localAbroad([{ title: latin }], {}) && !localAbroad([{ title: latin }], { desk: 'vs' }), latin)
  for (const title of ['African American museum opens in Ohio', 'Asian American voters in Nevada shift', 'Aziatisch-Amerikaanse kiezers in Nevada', 'Arab American leaders in Michigan back Trump', 'Arctic blast hits Midwest']) {
    assert.ok(localAbroad([{ title }], { desk: 'vs' }), title)
  }
})

// Keuring en tweede keuring van herstel 4: de rest van de reeks werelddelen en regio's (Antarctica, Mideast, Oceanië, Noordse
// landen, de Golfstaten, the Baltics) en internationale toppen en organisaties maken een kop breder. Echte koppen uit de
// bewaarde feeds en eigen varianten, Nederlands en Engels. Gulf Coast, de Pacific Northwest, Gulf State Park, een agent
// ("cop") en de National Security Council blijven Amerikaans; de South Asian burgemeester houden we (bij twijfel houden).
test('lokaal van elders: Antarctica, Mideast, Oceanië, de Golfstaten en internationale toppen zijn wereldnieuws', () => {
  for (const title of [
    // echte koppen
    'Midterm losses could give Trump a quest to emerge from Apec summit as a winner', 'Elon Musk and Michael Miebach to join Trump at Apec in Shenzhen. What about Jensen Huang?',
    'Google in, but Nvidia out as US lines up Apec CEO Summit delegation: source', 'A Decade After Henry Worsley Died in Antarctica, His Son Tries to Reach the South Pole',
    'Groepsfoto G20-top geschrapt door aanwezigheid Lavrov', 'Geopolitieke spanningen domineren eerste week COP31', 'The planet ‘is being killed’, Greta Thunberg tells Cop31 climate summit',
    '200 nations at Cop17 commit to biodiversity goals amid missed opportunities', 'Bomen geplant op klimaattop, maar ontbossing gaat sneller',
    // eigen varianten
    'Trump wil Zuidpool claimen', 'Amerikaanse basis op Antarctica uitgebreid', 'US envoy tours the Baltics', 'Mideast envoy Witkoff meets Trump', 'Trump reist naar Oceanië',
    'Oceania leaders court Trump', 'Nordic leaders meet Trump', 'Noordse landen vragen Trump om steun', 'Gulf states pledge billions to Trump', 'Golfstaten beloven Trump miljarden',
    'Gulf nations court Trump', 'Trump heads to G7', 'G-20 summit ends without Trump', 'Trump skips Asean summit', 'Amerikaanse delegatie mijdt COP 30', 'Trump in Davos',
    'IMF warns Trump on tariffs', 'Trump threatens to leave WTO', 'Hegseth naar Navo-top', 'Nato allies rebuke Hegseth', 'Trump at NATO summit', 'Trump speaks at UN General Assembly',
    'Verenigde Naties veroordelen Amerikaanse aanval', 'Opec cuts output as Trump fumes', 'Brics leaders mock Trump tariffs',
  ]) assert.ok(!localAbroad([{ title }], { desk: 'vs' }), title)
  for (const title of [
    'Pacific Northwest braces for atmospheric river', 'Gulf Coast braces for hurricane', 'Gulf State Park reopens in Alabama', 'Cop shot in Chicago', 'Cops arrest suspect in Ohio',
    'National Security Council staffer fired', 'NOAA: National Oceanic and Atmospheric Administration cuts staff', 'Senate passes stopgap bill',
  ]) assert.ok(localAbroad([{ title }], { desk: 'vs' }), title)
  assert.ok(!localAbroad([{ title: 'Nithya Raman wins LA mayoral race, becoming city’s first South Asian mayor' }], { desk: 'vs' }))
})

for (const f of FEEDS) {
  test(`${f}: lokaal nieuws van elders staat nooit op 01, nooit als Waar iedereen over schrijft, en anders achteraan`, () => {
    const feed = load(f)
    const now = Date.parse(feed.edition.builtAt)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const storyById = new Map(feed.stories.map((s) => [s.id, s]))
    for (const p of P) {
      const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(p.followed), interests: p.welkom.interests, topics: p.prefs.topics || [], now, builtAt: feed.edition.builtAt })
      if (!ed) continue
      const regular = ed.entries.filter((e) => e.desk !== 'bubbel')
      // Precies zoals rawLocal in composePersonal: een los stuk hoort bij zijn serververhaal (formerId of item.storyId), en de
      // stukken tellen zoals membersOf ze telt: de kop, bij een verhaal de stukken van het serververhaal en van de plek, bij een
      // los stuk alleen die van het serververhaal (herstelkeuring 3: zonder die koppeling leek de RTL-kop over Mississippi
      // lokaal; keuring daarna: de eigen itemIds van een los stuk telden in de toets wel mee en in de code niet). De stukken
      // komen uit dezelfde bronnen als itemAny.
      const itemAny = new Map([...feed.items, ...(feed.edition.items || []), ...[...(feed.edition.wide || []), ...(feed.edition.near || [])].map((w) => w?.item).filter(Boolean)].map((i) => [i.id, i]))
      const isLocal = (e) => {
        const head = itemAny.get(e.leadId || e.id)
        if (!head || e.desk === 'bubbel') return false
        const sid = e.kind === 'story' ? e.id : e.formerId || head.storyId || null
        const st = storyById.get(sid) || {}
        const members = new Set([e.leadId || e.id, ...(e.kind === 'story' ? [...(st.itemIds || []), ...(e.itemIds || [])] : st.itemIds || [])])
        const xs = [...members].map((x) => itemAny.get(x)).filter(Boolean)
        return localAbroad([head, ...xs.filter((i) => i !== head)], { desk: st.desk ?? e.fromDesk ?? e.desk ?? null, homePublishers: homePublishersOf([head, ...xs], st) }) && !majorNews(st, xs)
      }
      // Alleen een onderwerp dat je zelf aantikte, redt een plek van het zakken (debugveld `_local`); een onderwerp dat het
      // welkom met een interesse meegeeft niet (tweede keuring 14 november). De persona's kozen hele interesses: bij hen zakt
      // alles wat lokaal is.
      for (const e of regular) if (isLocal(e)) assert.ok(e._local, `${p.id}: "${byId.get(e.leadId || e.id)?.title}" zakt niet zonder zelf gekozen onderwerp`)
      const flags = regular.map((e) => isLocal(e))
      const title = (e) => byId.get(e.leadId || e.id)?.title
      if (regular.length) assert.ok(!isLocal(regular[0]), `${p.id}: plek 01 "${title(regular[0])}"`)
      for (const e of regular) if (e.desk === 'breed') assert.ok(!isLocal(e), `${p.id}: Waar iedereen over schrijft "${title(e)}"`)
      // Achteraan: na de eerste lokale plek alleen nog lokale plekken. Uitzondering: wat de opening, curiosaDown en heldDown
      // daarna verschuiven (een kuriositeit naar plek 6, een blijver onder de top 5).
      const first = flags.indexOf(true)
      if (first >= 0) {
        const after = regular.slice(first).filter((e, k) => !flags[first + k] && !e.held && !/^Vervolg/.test(e.why?.text || ''))
        assert.ok(after.length <= 1, `${p.id}: na "${title(regular[first])}" nog ${after.map(title).join(' | ')}`)
      }
    }
  })
}

// Tweede keuring 14 november. De uitslag van de Democraten op 5 november brengen ook NOS, NRC en de Volkskrant: dat is
// geen lokaal nieuws van elders, voor wie Politiek koos en voor wie niet. Niet via de interesse: die geeft het welkom met
// Politiek mee (geërfd) en telt niet als keuze.
test('lokaal van elders: wat ook een uitgever van hier brengt, zakt niet, met of zonder Politiek', () => {
  const feed = load('feed-2026-11-05-ochtend')
  const now = Date.parse(feed.edition.builtAt)
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const followed = new Set(['nos', 'nu', 'rtl', 'nrc', 'volkskrant', 'trouw', 'ad', 'telegraaf'])
  const run = (interests) => composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed, interests, topics: resolveTopics(interests, []), now, builtAt: feed.edition.builtAt })
  const usResult = (ed) => ed.entries.find((e) => e.itemIds.some((x) => /veroveringstocht Democraten/.test(byId.get(x)?.title || '')))
  const withPol = usResult(run(['politiek', 'binnenland', 'wereld']))
  assert.ok(withPol, 'met Politiek: de uitslag staat erin')
  assert.ok(!withPol._local, 'en zakt niet')
  const without = usResult(run(['binnenland', 'wereld']))
  assert.ok(!without || !without._local, 'zonder Politiek zakt hij ook niet')
})

// Alleen een onderwerp dat je zelf aantikt (origin 'gekozen') redt Amerikaans binnenland van het zakken, en nooit naar
// plek 01. Wie Politiek en Wereld koos (Verenigde Staten geërfd) ziet het zakken: zo kwam het in de top 3 (tweede keuring).
test('lokaal van elders: alleen een zelf gekozen onderwerp redt een plek, en nooit naar 01', () => {
  const feed = load('live-feed-2026-11-11-ochtend')
  const now = Date.parse(feed.edition.builtAt)
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const followed = new Set(['nyt', 'politico', 'guardian', 'bbc', 'atlantic'])
  const interests = ['politiek', 'wereld']
  const run = (picked) => composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed, interests, topics: resolveTopics(interests, picked), now, builtAt: feed.edition.builtAt }).entries.filter((e) => e.desk !== 'bubbel')
  const at = (entries) => entries.findIndex((e) => /Impeach Hegseth/.test(byId.get(e.leadId || e.id)?.title || ''))
  const inherited = run([])
  const k = at(inherited)
  assert.ok(k === -1 || (k >= 3 && inherited[k]._local), 'geërfd: de Hegseth-plek zakt, buiten de top 3')
  for (const e of inherited.slice(0, 3)) assert.ok(!e._local, `geërfd: geen lokale plek in de top 3 ("${byId.get(e.leadId || e.id)?.title}")`)
  const chosen = run(['vs-politiek'])
  const c = at(chosen)
  assert.ok(c > 0 && !chosen[c]._local, 'zelf gekozen: de Hegseth-plek zakt niet')
  assert.ok(c !== 0, 'en staat niet op 01')
})
