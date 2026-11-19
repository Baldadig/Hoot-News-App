// Luister verder: meer koppelingen (besluit Alex, 19 november). Twee besluiten:
//   1. Dezelfde aflevering mag bij meer verhalen staan. Vier GTA-verhalen tegelijk: NRC Vandaag "Luidt GTA VI het einde van
//      een gametijdperk in?" hoort bij elk verhaal waar het oordeel ja zegt. De regels per verhaal blijven: welke aflevering
//      een verhaal krijgt, dezelfde bron gaat voor, één aflevering per verhaal (de rest in `andere`).
//   2. Een bijnaam of citaat in de kop houdt een koppeling niet meer tegen. Live (proef 18 november): de kop "‘Edward Cullen’
//      wordt 007 …" (Robert Pattinson wordt James Bond) kreeg Today in Focus "Robert Pattinson is Bond" niet, omdat het
//      vangnet (kopDeelt) Edward en Cullen als "waar de kop over gaat" nam. Een naam tussen aanhalingstekens telt daar niet
//      meer; het oordeel van De Redacteur beslist. Een echt mengverhaal (namen buiten het verhaal zonder aanhalingstekens)
//      blijft hard.
// De gevallen zijn illustraties; de regels zelf zijn generiek (geen namen in de code). Geen echte AI: de nep-client.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { paren, vangnet, koppelMetOordeel, kopCitaten, urlKey, vastVan, episodeOf, SHOW } from '../netlify/lib/luister.mjs'
import { afleveringen } from '../shared/luister-weergave.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, leesVraag, JA, VERDIEPING, NEE } from './helpers/nep-oordeel.mjs'

const NOW = Date.parse('2026-11-18T12:00:00Z')
const stuk = (id, source, sourceName, title, summary, at, url = `https://${source}.example/${id}`) => ({ id, kind: 'article', source, sourceName, title, summary, url, publishedAt: at })
const ep = (id, show, titel, samenvatting, at, links = []) => ({ id, show, titel, samenvatting, tekst: samenvatting, t: Date.parse(at), guid: id, duur: 1500, links, pagina: `https://pod.example/${id}` })
const memKv = () => {
  const kv = new Map()
  return { get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const ronde = async ({ stories, byId, episodes, now = NOW, editie = null }, beslis) => {
  const { get, update } = memKv()
  const client = nepClient(beslis)
  const r = await koppelMetOordeel({ stories, byId, episodes, now, mainIds: MAIN_IDS, editie, client, get, update, maxAanroepen: Infinity, maxVragen: Infinity })
  return { r, gevraagd: client.calls.flatMap((c) => leesVraag(c.messages[0].content)) }
}
// Alle afleveringen bij een verhaal (de eerste en `andere`), op titel.
const bij = (r, id) => {
  const l = r.byStory.get(id)
  return l ? [l, ...(l.andere || [])].map((a) => a.aflevering) : []
}

// ---------- 1. Dezelfde aflevering bij meer verhalen ----------

const GTA_ITEMS = [
  // Vier GTA-verhalen, elk met een eigen kop (een andere kant van dezelfde zaak).
  stuk('a1', 'nu', 'NU.nl', 'Maker promoot GTA VI in China ondanks missende verkooptoestemming', 'Rockstar maakt in China reclame voor GTA VI, terwijl het spel daar nog geen verkooptoestemming heeft.', '2026-11-18T07:30:00Z'),
  stuk('a2', 'tweakers', 'Tweakers', 'Rockstar adverteert GTA VI op Chinese platforms', 'Take-Two promoot GTA VI in China zonder goedkeuring van de toezichthouder.', '2026-11-18T08:00:00Z'),
  stuk('b1', 'guardian', 'The Guardian', 'Amazon and Best Buy’s Black Friday sales will be competing with GTA 6', 'Retailers fear GTA 6 will draw shoppers away from Black Friday deals.', '2026-11-18T06:00:00Z'),
  stuk('b2', 'nyt', 'The New York Times', 'Black Friday Meets GTA 6: Retailers Brace for the Biggest Game Launch', 'GTA 6 arrives the same week as Black Friday.', '2026-11-18T06:30:00Z'),
  stuk('c1', 'nrc', 'NRC', 'GTA VI: hoe Rockstar tien jaar aan één game werkte', 'Rockstar werkte meer dan tien jaar aan GTA VI, de duurste game ooit.', '2026-11-18T05:00:00Z'),
  stuk('c2', 'nos', 'NOS', 'GTA VI is de duurste game ooit gemaakt', 'De ontwikkeling van GTA VI kostte Rockstar naar schatting twee miljard dollar.', '2026-11-18T05:30:00Z'),
  stuk('d1', 'nos', 'NOS', "Vrij nemen voor GTA VI: 'Het is gewoon leuk om de slechterik te spelen'", 'Duizenden gamers nemen vrij om donderdag meteen GTA VI te kunnen spelen.', '2026-11-17T15:00:00Z'),
  stuk('d2', 'ad', 'AD', 'Gamers massaal vrij voor GTA VI', 'Werkgevers zien veel vrije dagen rond de lancering van GTA VI.', '2026-11-17T16:00:00Z'),
  // Een ander verhaal.
  stuk('h1', 'nos', 'NOS', 'Elizabeth Holmes vraagt gratie aan bij president', 'De oprichter van Theranos zit een celstraf uit.', '2026-11-17T12:00:00Z'),
  stuk('h2', 'nyt', 'The New York Times', 'Elizabeth Holmes Seeks Pardon', 'The Theranos founder is serving a prison sentence.', '2026-11-17T13:00:00Z'),
]
const GTA_STORIES = [
  { id: 'schina', leadId: 'a1', itemIds: ['a1', 'a2'] },
  { id: 'sfriday', leadId: 'b1', itemIds: ['b1', 'b2'] },
  { id: 'snrc', leadId: 'c1', itemIds: ['c1', 'c2'] },
  { id: 'svrij', leadId: 'd1', itemIds: ['d1', 'd2'] },
  { id: 'sholmes', leadId: 'h1', itemIds: ['h1', 'h2'] },
]
const GTA = ['schina', 'sfriday', 'snrc', 'svrij']
const gtaById = new Map(GTA_ITEMS.map((i) => [i.id, i]))
const NRC = ep('enrc', 'nrc-vandaag', 'Luidt GTA VI het einde van een gametijdperk in?', 'Donderdag verschijnt GTA VI, na jaren wachten. Het is de duurste game ooit gemaakt en de verwachtingen zijn torenhoog. Hoe kan een game zo’n hype veroorzaken, en wat betekent de lancering voor de rest van de game-industrie? Techredacteur Joost Vink legt het uit.', '2026-11-17T04:00:00Z')
const TIF = ep('etif', 'today-in-focus', 'GTA 6: the cultural event of the decade?', 'After years of delays, GTA 6 is finally about to be released. Why has a video game become the cultural event of the decade? Keza MacDonald explains.', '2026-11-17T03:00:00Z')
const HOLMES = ep('ehol', 'the-daily', 'The Rise and Fall of Elizabeth Holmes, Revisited', 'A new documentary looks back at Theranos and its founder, Elizabeth Holmes.', '2026-11-17T10:00:00Z')
const GTA_RONDE = { stories: GTA_STORIES, byId: gtaById, episodes: [NRC, TIF, HOLMES] }
const isGta = (v) => /GTA|Grand Theft Auto/.test(v.titel) && /GTA/.test(v.kop)

test('1a. NRC Vandaag komt bij alle vier de GTA-verhalen waar het oordeel ja zegt', async () => {
  const kand = paren(GTA_RONDE).paren.filter((c) => c.e.id === NRC.id && !vangnet(c, NOW)).map((c) => c.x.st.id)
  assert.deepEqual(kand.sort(), [...GTA].sort(), 'een kandidaat bij elk GTA-verhaal, zonder harde uitsluiting')
  const { r, gevraagd } = await ronde(GTA_RONDE, (v) => (isGta(v) ? VERDIEPING : NEE))
  assert.equal(new Set(gevraagd.filter((v) => v.titel === NRC.titel).map((v) => v.kop)).size, 4, 'De Redacteur beoordeelt elk paar apart')
  for (const id of GTA) assert.ok(bij(r, id).includes(NRC.titel), `${id}: NRC Vandaag staat erbij`)
  assert.ok(!r.byStory.has('sholmes'), 'het andere verhaal krijgt niets')
  assert.ok(!r.rows.afgevallen.some((a) => /krijgt haar|geen van beide|past bij \d+ verhalen/.test(a.reden)), 'geen afvaller omdat een ander verhaal haar ook krijgt')
  assert.equal(r.rows.koppelingen.filter((k) => k.aflevering === NRC.titel || k.andere.includes(`NRC Vandaag: ${NRC.titel}`)).length, 4)
})

test('1b. het oordeel blijft per verhaal: een nee bij één GTA-verhaal houdt haar daar tegen, de andere drie houden haar', async () => {
  const chinaKop = gtaById.get('a1').title
  const { r } = await ronde(GTA_RONDE, (v) => (isGta(v) && !(v.titel === NRC.titel && v.kop === chinaKop) ? VERDIEPING : NEE))
  assert.ok(!bij(r, 'schina').includes(NRC.titel), 'nee: niet bij het China-verhaal')
  for (const id of ['sfriday', 'snrc', 'svrij']) assert.ok(bij(r, id).includes(NRC.titel), id)
  assert.ok(r.rows.afgevallen.some((a) => a.verhaal === 'schina' && a.aflevering === NRC.titel && /^oordeel: soort anders/.test(a.reden)))
})

test('1c. de regels per verhaal blijven: dezelfde bron gaat voor, één aflevering vooraan, de rest in andere, nooit dubbel', async () => {
  const { r } = await ronde(GTA_RONDE, (v) => (isGta(v) ? VERDIEPING : NEE))
  // Het NRC-verhaal: NRC Vandaag vooraan (dezelfde uitgever als de kop); het Guardian-verhaal: Today in Focus vooraan.
  assert.equal(r.byStory.get('snrc').aflevering, NRC.titel)
  assert.equal(r.byStory.get('snrc').dezelfdeUitgever, true)
  assert.equal(r.byStory.get('sfriday').aflevering, TIF.titel)
  assert.ok(bij(r, 'sfriday').includes(NRC.titel), 'NRC Vandaag bij het Guardian-verhaal in andere')
  // De Nederlandse koppen zonder eigen show: de Nederlandse show vooraan.
  for (const id of ['schina', 'svrij']) assert.equal(r.byStory.get(id).aflevering, NRC.titel, id)
  for (const id of GTA) {
    const t = bij(r, id)
    assert.equal(new Set(t).size, t.length, `${id}: geen aflevering dubbel binnen één verhaal`)
    assert.equal(r.rows.koppelingen.filter((k) => k.verhaal === id).length, 1, `${id}: één koppeling per verhaal`)
  }
  // Wat de lezer ziet (shared/luister-weergave.mjs, gelijk aan Luister.swift): per verhaal een eigen lijst, een Engelse show
  // alleen voor wie die bron volgt. Dezelfde aflevering bij een ander verhaal verandert daar niets aan.
  const volgt = () => false
  for (const id of GTA) {
    const lijst = afleveringen(r.byStory.get(id), volgt)
    assert.ok(lijst.some((a) => a.aflevering === NRC.titel), `${id}: de algemene lezer ziet NRC Vandaag`)
    assert.ok(!lijst.some((a) => a.aflevering === TIF.titel), `${id}: Today in Focus alleen voor wie de Guardian volgt`)
  }
})

test('1d. een artikellink wijst niet meer één verhaal aan: een ja bij een ander verhaal telt ook; vangnet en Editieplek veranderen niets', async () => {
  // NRC Vandaag linkt naar het NRC-stuk (verhaal snrc); bij de andere GTA-verhalen beslist het oordeel op de tekst.
  const linkt = { ...NRC, links: [urlKey(gtaById.get('c1').url)] }
  const opts = { ...GTA_RONDE, episodes: [linkt, HOLMES] }
  const { r } = await ronde(opts, (v) => (isGta(v) ? VERDIEPING : NEE))
  assert.equal(r.rows.koppelingen.find((k) => k.verhaal === 'snrc').grond, 'link')
  for (const id of GTA) assert.ok(bij(r, id).includes(NRC.titel), id)
  // Met Editieplekken (algemene Editie, pool, geen): elk verhaal met een ja houdt haar.
  const editie = { algemeen: new Set(['snrc']), pool: new Set(['sfriday']) }
  const met = await ronde({ ...opts, editie }, (v) => (isGta(v) ? VERDIEPING : NEE))
  for (const id of GTA) assert.ok(bij(met.r, id).includes(NRC.titel), `${id} (Editieplek)`)
  // Een aflevering die ouder is dan drie dagen: bij geen enkel verhaal, ook niet met een ja.
  const oud = { ...NRC, id: 'eoud', t: NOW - 80 * 36e5 }
  const o = await ronde({ ...GTA_RONDE, episodes: [oud] }, () => VERDIEPING)
  assert.equal(o.r.byStory.size, 0)
})

// ---------- 2. Een bijnaam of citaat in de kop ----------

const BOND_ITEMS = [
  stuk('p1', 'ad', 'AD', '‘Edward Cullen’ wordt 007 en veel vrouwen zitten spontaan weer in hun tienerjaren: ‘Soms ging het ver’', 'Robert Pattinson wordt de nieuwe James Bond. Fans van Twilight zijn door het dolle heen.', '2026-11-18T08:00:00Z'),
  stuk('p2', 'guardian', 'The Guardian', 'Robert Pattinson is the new James Bond: the surprise casting choice explained', 'Amazon MGM has confirmed Robert Pattinson as the next 007.', '2026-11-17T16:00:00Z'),
  stuk('p3', 'nos', 'NOS', 'Robert Pattinson wordt de nieuwe James Bond', 'De Britse acteur Robert Pattinson speelt in de nieuwe Bondfilm van Denis Villeneuve.', '2026-11-17T17:00:00Z'),
  stuk('p4', 'nu', 'NU.nl', 'Pattinson volgt Craig op als Bond', 'Robert Pattinson is gekozen als opvolger van Daniel Craig.', '2026-11-17T18:00:00Z'),
]
const BOND = { id: 'sbond', leadId: 'p1', itemIds: ['p1', 'p2', 'p3', 'p4'] }
const BOND_TIF = ep('ebond', 'today-in-focus', 'Robert Pattinson is Bond: is he the right choice for 007?', 'Robert Pattinson has been confirmed as the next James Bond. Is the former Twilight star the right choice? Our film editor weighs in.', '2026-11-18T04:00:00Z')
const BOND_ANDERS = ep('ebat', 'today-in-focus', 'The new Batman: why the studio bet on a newcomer', 'Warner Bros has cast a relative unknown as the Dark Knight. Our film editor on the gamble behind the casting.', '2026-11-18T04:00:00Z')
const metKop = (title) => {
  const by = new Map(BOND_ITEMS.map((i) => [i.id, i]))
  by.set('p1', { ...by.get('p1'), title })
  return by
}
const bondPaar = (title, e = BOND_TIF) => paren({ stories: [BOND], byId: metKop(title), episodes: [e], now: NOW }).paren.find((c) => c.e.id === e.id)

test('2a. kopCitaten: de woorden tussen aanhalingstekens; een apostrof opent of sluit niets', () => {
  assert.deepEqual([...kopCitaten('‘Edward Cullen’ wordt 007: ‘Soms ging het ver’')], ['edward', 'cullen', 'soms', 'ging', 'het', 'ver'])
  assert.deepEqual([...kopCitaten("'Kabinet langs de rand van de afgrond'")], ['kabinet', 'langs', 'de', 'rand', 'van', 'afgrond'])
  assert.deepEqual([...kopCitaten('“Mr. Bean” wordt Q')], ['mr', 'bean'])
  assert.deepEqual([...kopCitaten("Wynia's Week stopt, Pattinson’s Bond begint")], [])
  assert.deepEqual([...kopCitaten('Van Bommel heeft Lukaku terug voor duel met Italië')], [])
})

test('2b. de Bond-kop met een bijnaam tussen aanhalingstekens: geen mengverhaal; het oordeel beslist', async () => {
  const c = bondPaar(BOND_ITEMS[0].title)
  assert.ok(c, 'een kandidaat')
  assert.equal(c.kop, true, 'geen mengverhaal: Edward Cullen is een bijnaam, niet waar de kop over gaat')
  assert.equal(vangnet(c, NOW), null)
  const opts = { stories: [BOND], byId: metKop(BOND_ITEMS[0].title), episodes: [BOND_TIF] }
  const ja = await ronde(opts, () => JA)
  assert.equal(ja.r.byStory.get('sbond')?.aflevering, BOND_TIF.titel, 'een ja koppelt')
  const nee = await ronde(opts, () => NEE)
  assert.equal(nee.r.byStory.size, 0, 'een nee houdt haar tegen')
  // Een citaat in plaats van een bijnaam, en dubbele aanhalingstekens: hetzelfde.
  for (const t of ['“Hij is een betere Bond dan Craig”: fans juichen om 007-keuze', '"Edward Cullen" wordt 007, en dat vinden fans prima']) {
    const k = bondPaar(t)
    assert.ok(k, t)
    assert.equal(vangnet(k, NOW), null, t)
  }
})

test('2c. tegenvoorbeelden: een naam buiten het verhaal zonder aanhalingstekens blijft een mengverhaal, ook naast een citaat', () => {
  // Batman en Cillian Murphy staan niet in het verhaal, en Today in Focus over Bond noemt ze niet.
  for (const t of ['Cillian Murphy wordt Batman en veel vrouwen zitten spontaan weer in hun tienerjaren', 'Cillian Murphy wordt Batman en veel vrouwen zitten weer in hun tienerjaren: ‘Soms ging het ver’', 'De rol van Batman gaat naar ‘Tommy Shelby’ en veel fans zijn blij']) {
    const c = bondPaar(t)
    assert.ok(c, `${t}: een kandidaat`)
    assert.equal(c.kop, false, `${t}: mengverhaal`)
    assert.match(vangnet(c, NOW), /^een mengverhaal/, t)
  }
  // Een aflevering die geen enkele centrale naam van het verhaal noemt, blijft een mengverhaal, ook bij een kop met alleen een
  // citaat (regel a van kopDeelt verandert niet).
  const c = bondPaar(BOND_ITEMS[0].title, BOND_ANDERS)
  if (c) assert.match(vangnet(c, NOW) || '', /mengverhaal|meer onderwerpen|naam/)
})

test('2d. de echte mengverhalen blijven dicht: Lukaku en Mbappé bij Oranje, ook met een citaat in de kop', async () => {
  const F = JSON.parse(readFileSync(new URL('./fixtures/luister-shows-2026-11-14.json', import.meta.url), 'utf8'))
  const EPS = Object.entries(F.rauw).flatMap(([id, f]) => {
    const vast = vastVan(f.items)
    return f.items.map((it) => episodeOf(SHOW.get(id), it, f.link, vast)).filter(Boolean).map((e) => ({ ...e, ...(vast.namen.length ? { vast: vast.namen } : {}) }))
  })
  const M = F.mengverhaal
  const M_NOW = Date.parse(M.now)
  const lead = M.items.find((i) => i.id === M.stories[0].leadId)
  const eps = EPS.filter((e) => e.t <= M_NOW)
  for (const title of [lead.title, 'Van Bommel: ‘Lukaku is terug voor het duel met Italië’, Frankrijk beschikt weer over Mbappé', '‘Ik ben er klaar voor’: Mbappé terug bij Frankrijk']) {
    const by = new Map(M.items.map((i) => [i.id, i])).set(lead.id, { ...lead, title })
    const c = paren({ stories: M.stories, byId: by, episodes: eps, now: M_NOW }).paren.find((c) => /^#583/.test(c.e.titel))
    assert.ok(c, `${title}: de nabespreking van de 7-0 is een kandidaat`)
    assert.equal(c.kop, false, title)
    assert.match(vangnet(c, M_NOW), /^een mengverhaal/, title)
    const { get, update } = memKv()
    const r = await koppelMetOordeel({ stories: M.stories, byId: by, episodes: eps, now: M_NOW, mainIds: MAIN_IDS, client: nepClient(() => JA), get, update })
    assert.equal(r.byStory.size, 0, title)
  }
})
