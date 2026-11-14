// Luister verder: het oordeel van De Redacteur (besluit Alex, 14 november). De woordregels zoeken de kandidaten en sluiten
// hard uit; het laatste woord over "zelfde zaak of verdieping, één onderwerp" ligt bij het AI-oordeel. Alleen een duidelijk
// ja koppelt. Geen echte AI: een nep-client (tests/helpers/nep-oordeel.mjs) die de vraag leest zoals het model hem krijgt.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { koppel, koppelMetOordeel, paren, vangnet, paarKey, leesOordelen, codesVoor, oordeelPrompt, luisterRonde, OORDEEL_KEY, OORDEEL_MODEL, PER_VRAAG, MAX_POGINGEN, PROEF_KEY } from '../netlify/lib/luister.mjs'
import { MODEL } from '../netlify/lib/editie-ai.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, leesVraag, JA, NEE } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const OPTS = { stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS }
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
// Het paar uit de proef: VI ZSM over de 7-0 bij het Oranje-verhaal.
const ORANJE = (v) => /Galavoorstelling Oranje/.test(v.titel) && /Veerman/.test(v.kop)
const lijst = (r) => r.rows.koppelingen.map((k) => `${k.kop} | ${k.show}: ${k.aflevering}`).sort()

test('het model: hetzelfde als filters-ai van De Redacteur', () => {
  assert.equal(OORDEEL_MODEL, MODEL)
  const src = readFileSync(new URL('../netlify/lib/build.mjs', import.meta.url), 'utf8')
  assert.match(src, /luisterRonde\(\{[^\n]*client: anthropic[^\n]*\}\)/, 'dezelfde client als de rest van de Redacteur')
})

test('alleen een duidelijk ja koppelt: zelfde of verdieping, één onderwerp ja en zeker ja', async () => {
  const geval = async (o) => {
    const { get, update } = memKv()
    const client = nepClient((v) => (ORANJE(v) ? o : NEE))
    const r = await koppelMetOordeel({ ...OPTS, client, get, update })
    return r.rows.koppelingen.filter((k) => /Galavoorstelling/.test(k.aflevering))
  }
  const zelfde = await geval(JA)
  assert.equal(zelfde.length, 1)
  assert.equal(zelfde[0].soort, 'hetzelfde')
  assert.deepEqual(zelfde[0].oordeel, { zaak: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' })
  assert.equal(zelfde[0].reden, 'nep')
  const verdieping = await geval({ zaak: 'verdieping', eenOnderwerp: 'ja', zeker: 'ja' })
  assert.equal(verdieping.length, 1)
  assert.equal(verdieping[0].soort, 'verdiepend')
  for (const o of [{ zaak: 'zelfde', eenOnderwerp: 'nee', zeker: 'ja' }, { zaak: 'zelfde', eenOnderwerp: 'ja', zeker: 'nee' }, { zaak: 'verdieping', eenOnderwerp: 'ja', zeker: 'nee' }, { zaak: 'anders', eenOnderwerp: 'ja', zeker: 'ja' }, null]) {
    assert.equal((await geval(o)).length, 0, JSON.stringify(o))
  }
  // Nee overal: geen enkele koppeling, ook geen artikellink van de eigen uitgever (het model heeft het laatste woord).
  const { get, update } = memKv()
  const r = await koppelMetOordeel({ ...OPTS, client: nepClient(() => NEE), get, update })
  assert.equal(r.byStory.size, 0)
  assert.ok(r.rows.afgevallen.some((a) => a.oordeel && /^oordeel: zaak anders/.test(a.reden)), 'de afgevallen kandidaten met de reden van het oordeel')
})

test('een oordeel dat niet op tijd is: geen koppeling voor dat paar, nooit terugvallen op losser; de volgende ronde opnieuw', async () => {
  const { kv, get, update } = memKv()
  const hangt = nepClient(() => JA, { hangt: true })
  const t0 = Date.now()
  const r = await koppelMetOordeel({ ...OPTS, client: hangt, get, update, timeoutMs: 60 })
  assert.ok(Date.now() - t0 < 1000, 'de eigen tijdgrens houdt de ronde niet op')
  assert.equal(r.byStory.size, 0, 'ook geen artikellink van de eigen uitgever')
  assert.ok(r.ai.timeouts >= 1)
  assert.ok(r.rows.afgevallen.some((a) => /geen oordeel op tijd/.test(a.reden)))
  assert.deepEqual(kv.get(OORDEEL_KEY).o, {}, 'niets bewaard')
  assert.ok(Object.keys(kv.get(OORDEEL_KEY).p).length > 0, 'wel geteld als poging')
  // De volgende ronde (het model antwoordt nu): dan wel.
  const goed = nepClient((v) => (ORANJE(v) ? JA : NEE))
  const r2 = await koppelMetOordeel({ ...OPTS, client: goed, get, update })
  assert.equal(r2.rows.koppelingen.filter((k) => /Galavoorstelling/.test(k.aflevering)).length, 1)
})

test('zonder sleutel of bij een fout: alleen een artikellink van de eigen uitgever, verder niets', async () => {
  const zonder = await koppelMetOordeel({ ...OPTS, client: null })
  assert.ok(zonder.byStory.size >= 1, 'de fixture heeft een artikellink van de eigen uitgever')
  assert.ok(zonder.rows.koppelingen.every((k) => k.grond === 'link' && k.dezelfdeUitgever && !k.oordeel))
  // De woordregels koppelen meer, maar die tellen zonder oordeel niet.
  assert.ok(koppel(OPTS).byStory.size > zonder.byStory.size)
  const { get, update } = memKv()
  const fout = await koppelMetOordeel({ ...OPTS, client: nepClient(() => JA, { fout: new Error('overbelast') }), get, update })
  assert.deepEqual(lijst(fout), lijst(zonder))
  assert.ok(fout.ai.fouten >= 1)
  // De opslag is niet te lezen: niets vragen, en ook dan alleen de eigen artikellink.
  const client = nepClient(() => JA)
  const kvWeg = await koppelMetOordeel({ ...OPTS, client, get: () => Promise.reject(new Error('kv weg')), update })
  assert.equal(client.calls.length, 0)
  assert.deepEqual(lijst(kvWeg), lijst(zonder))
})

test('de opslag: elk paar (verhaal, aflevering) wordt één keer beoordeeld', async () => {
  const { kv, get, update } = memKv()
  const client = nepClient((v) => (ORANJE(v) ? JA : NEE))
  const r1 = await koppelMetOordeel({ ...OPTS, client, get, update })
  const n1 = client.calls.length
  assert.ok(n1 >= 1)
  assert.equal(r1.ai.gevraagd, r1.ai.kandidaten)
  const doc = kv.get(OORDEEL_KEY)
  assert.equal(Object.keys(doc.o).length, r1.ai.kandidaten)
  for (const [k, v] of Object.entries(doc.o)) assert.ok(k.includes('|') && v.length === 5 && typeof v[4] === 'number')
  const r2 = await koppelMetOordeel({ ...OPTS, client, get, update })
  assert.equal(client.calls.length, n1, 'de tweede ronde vraagt niets')
  assert.equal(r2.ai.uitOpslag, r1.ai.kandidaten)
  assert.deepEqual(lijst(r2), lijst(r1))
  // Een paar zonder geldig oordeel (het model slaat het over): hooguit MAX_POGINGEN keer gevraagd.
  const leeg = memKv()
  const zwijgt = nepClient(() => null)
  for (let k = 0; k < MAX_POGINGEN + 2; k++) await koppelMetOordeel({ ...OPTS, client: zwijgt, get: leeg.get, update: leeg.update })
  const perPaar = new Map()
  for (const c of zwijgt.calls) for (const v of leesVraag(c.messages[0].content)) perPaar.set(`${v.kop}|${v.titel}`, (perPaar.get(`${v.kop}|${v.titel}`) || 0) + 1)
  assert.ok(perPaar.size > 0 && [...perPaar.values()].every((n) => n === MAX_POGINGEN))
  // Oude oordelen (ouder dan vier dagen) gaan bij het schrijven weg.
  const oud = memKv()
  oud.kv.set(OORDEEL_KEY, { v: 1, o: { 'x|y': ['zelfde', 'ja', 'ja', 'oud', NOW - 5 * 864e5] } })
  await koppelMetOordeel({ ...OPTS, client: nepClient(() => NEE), get: oud.get, update: oud.update })
  assert.ok(!('x|y' in oud.kv.get(OORDEEL_KEY).o))
})

test('per verhaal gebundeld: elk verhaal één keer in een aanroep, hooguit PER_VRAAG paren per aanroep, het hele verhaal in de vraag', async () => {
  const { get, update } = memKv()
  const client = nepClient(() => NEE)
  const r = await koppelMetOordeel({ ...OPTS, client, get, update })
  assert.equal(client.calls.length, Math.ceil(r.ai.gevraagd / PER_VRAAG))
  for (const c of client.calls) {
    const vragen = leesVraag(c.messages[0].content)
    assert.ok(vragen.length >= 1 && vragen.length <= PER_VRAAG)
    const koppen = vragen.map((v) => v.kop)
    assert.equal(new Set(koppen).size, koppen.filter((k, i) => k !== koppen[i - 1]).length, 'de afleveringen van één verhaal staan bij elkaar')
    assert.equal(c.model, OORDEEL_MODEL)
    assert.deepEqual(c.thinking, { type: 'disabled' })
    assert.equal(c.output_config.format.type, 'json_schema')
  }
  // Het hele verhaal: elke kop en elke link van de stukken staat in de vraag, en de hele beschrijving van de aflevering.
  const p = paren(OPTS)
  const c = p.paren.find((c) => !vangnet(c, NOW) && c.x.items.length >= 4 && c.x.items.length <= 20)
  const tekst = oordeelPrompt([c])
  for (const i of c.x.items) {
    assert.ok(tekst.includes(String(i.title).slice(0, 60)), i.title)
    assert.ok(tekst.includes(String(i.url).slice(0, 60)), i.url)
  }
  assert.ok(tekst.includes(String(c.e.tekst || c.e.samenvatting).slice(-80)), 'de hele beschrijving')
})

test('Editie eerst: gaan twee verhalen over dezelfde zaak, dan krijgt het verhaal met een Editieplek de aflevering', async () => {
  const oranje = FIX.stories.find((st) => byId.get(st.leadId)?.title?.includes('Veerman'))
  assert.ok(oranje)
  const kopie = { ...oranje, id: 'kopie-oranje' }
  const stories = [...FIX.stories, kopie]
  const run = async (editie) => {
    const { get, update } = memKv()
    const r = await koppelMetOordeel({ ...OPTS, stories, client: nepClient((v) => (ORANJE(v) ? JA : NEE)), get, update, editie })
    return { r, aan: [...r.byStory].filter(([, l]) => /Galavoorstelling/.test(l.aflevering)).map(([id]) => id) }
  }
  assert.deepEqual((await run(null)).aan, [], 'geen Editieplek: geen van beide')
  assert.deepEqual((await run({ algemeen: new Set(['kopie-oranje']), pool: new Set() })).aan, ['kopie-oranje'])
  assert.deepEqual((await run({ algemeen: new Set(), pool: new Set([oranje.id]) })).aan, [oranje.id])
  const beide = await run({ algemeen: new Set(['kopie-oranje']), pool: new Set([oranje.id, 'kopie-oranje']) })
  assert.deepEqual(beide.aan, ['kopie-oranje'], 'de algemene Editie gaat voor de pool')
  assert.ok(beide.r.rows.afgevallen.some((a) => a.verhaal === oranje.id && /dat krijgt haar/.test(a.reden)))
  assert.equal(beide.r.rows.koppelingen.find((k) => k.verhaal === 'kopie-oranje').editie, 'de algemene Editie')
  assert.deepEqual((await run({ algemeen: new Set([oranje.id, 'kopie-oranje']), pool: new Set() })).aan, [], 'dezelfde plek: geen van beide')
  // En bij het vragen gaan de verhalen met een Editieplek voor (een kleine begroting: alleen die).
  const { get, update } = memKv()
  const client = nepClient(() => NEE)
  await koppelMetOordeel({ ...OPTS, client, get, update, editie: { algemeen: new Set([oranje.id]), pool: new Set() }, maxVragen: 1 })
  assert.equal(client.calls.length, 1)
  assert.match(leesVraag(client.calls[0].messages[0].content)[0].kop, /Veerman/)
})

test('de harde uitsluitingen gaan voor: ook bij een ja van het model, en ze worden niet eens gevraagd', async () => {
  const { get, update } = memKv()
  const client = nepClient(() => JA)
  const r = await koppelMetOordeel({ ...OPTS, client, get, update })
  const p = paren(OPTS)
  const hard = p.paren.filter((c) => vangnet(c, NOW))
  assert.ok(hard.length >= 3, 'de fixture heeft harde uitsluitingen (vooruitblik, meer onderwerpen, weekshow)')
  const gevraagd = new Set(client.calls.flatMap((c) => leesVraag(c.messages[0].content).map((v) => `${v.kop}|${v.titel}`)))
  const kop = (c) => byId.get(c.x.st.leadId)?.title || c.x.items[0].title
  for (const c of hard) {
    assert.ok(!gevraagd.has(`${kop(c)}|${c.e.titel}`), `niet gevraagd: ${c.e.titel}`)
    assert.ok(!r.rows.koppelingen.some((k) => k.verhaal === c.x.st.id && k.aflevering === c.e.titel), `niet gekoppeld: ${c.e.titel}`)
    assert.ok(r.rows.afgevallen.some((a) => a.verhaal === c.x.st.id && a.aflevering === c.e.titel && a.reden === vangnet(c, NOW)))
  }
  // Een aflevering die zegt dat het nieuws pas na de opname kwam, en een vooruitblik van vóór de kop: hard.
  const lead = byId.get(FIX.stories.find((st) => byId.get(st.leadId)?.title?.includes('Veerman')).leadId)
  const basis = FIX.episodes.find((e) => /Galavoorstelling/.test(e.titel))
  const na = { ...basis, id: 'e-na', titel: 'Oranje na de 7-0 tegen Griekenland', samenvatting: 'Net na het opnemen van deze aflevering kwam het bericht dat Veerman en De Jong op het middenveld Oranje dreigender maakten.', tekst: '' }
  const voor = { ...basis, id: 'e-voor', titel: 'Vooruitblik: Oranje tegen Griekenland', samenvatting: 'We blikken vooruit op Oranje tegen Griekenland, met Veerman en De Jong op het middenveld.', tekst: '', t: Date.parse(lead.publishedAt) - 6 * 36e5 }
  const eps = [...FIX.episodes, na, voor]
  const r2 = await koppelMetOordeel({ ...OPTS, episodes: eps, client: nepClient(() => JA), get: memKv().get, update: memKv().update })
  for (const id of ['e-na', 'e-voor']) assert.ok(!r2.rows.koppelingen.some((k) => k.aflevering === eps.find((e) => e.id === id).titel), id)
  assert.ok(r2.rows.afgevallen.some((a) => a.aflevering === na.titel && /na de opname/.test(a.reden)))
  assert.ok(r2.rows.afgevallen.some((a) => a.aflevering === voor.titel && /vooruitblik/.test(a.reden)))
})

test('het antwoord nalopen: alleen het goede nummer met de goede code; tegenstrijdige oordelen vervallen', () => {
  const p = paren(OPTS)
  const twee = p.paren.filter((c) => !vangnet(c, NOW)).slice(0, 2)
  const codes = codesVoor(twee)
  assert.equal(new Set(codes).size, 2)
  const tekst = JSON.stringify({ oordelen: [{ nr: 1, code: codes[1], ...JA, reden: 'verschoven' }, { nr: 2, code: codes[1], ...JA, reden: 'goed' }, { nr: 2, code: codes[1], ...JA, reden: 'dubbel, gelijk' }] })
  const m = leesOordelen(tekst, 2, codes)
  assert.ok(!m.has(1), 'de verkeerde code telt niet')
  assert.equal(m.get(2).reden, 'goed')
  const strijd = leesOordelen(JSON.stringify({ oordelen: [{ nr: 1, code: codes[0], ...JA, reden: 'a' }, { nr: 1, code: codes[0], ...NEE, reden: 'b' }] }), 2, codes)
  assert.equal(strijd.size, 0)
  assert.equal(leesOordelen('geen json', 2, codes).size, 0)
  assert.equal(leesOordelen(JSON.stringify({ oordelen: [{ nr: 1, code: codes[0], zaak: 'misschien', eenOnderwerp: 'ja', zeker: 'ja', reden: 'x' }] }), 2, codes).size, 0)
  assert.equal(paarKey(twee[0]), `${twee[0].x.st.id}|${twee[0].e.id}`)
})

test('in de ronde: de proef toont per koppeling het oordeel en de reden, de afgevallen kandidaten met de reden van het oordeel, en de tellingen', async () => {
  const { kv, get, update } = memKv()
  const stories = FIX.stories.map((st) => ({ ...st }))
  const client = nepClient((v) => (ORANJE(v) ? JA : NEE))
  const n = await luisterRonde({ stories, byId, now: NOW, episodesP: Promise.resolve({ episodes: FIX.episodes, status: {} }), slot: '2026-11-14-middag', mainIds: MAIN_IDS, update, get, client, editie: { algemeen: new Set(), pool: new Set() } })
  assert.equal(n, 1)
  const d = kv.get(PROEF_KEY).dagdelen[0]
  assert.equal(d.koppelingen[0].oordeel.zaak, 'zelfde')
  assert.equal(d.koppelingen[0].reden, 'nep')
  assert.ok(d.afgevallen.some((a) => a.oordeel?.zaak === 'anders' && /^oordeel: /.test(a.reden)))
  assert.equal(d.oordeel.model, OORDEEL_MODEL)
  assert.ok(d.oordeel.gevraagd >= 1 && d.oordeel.invoerTokens > 0)
  assert.equal(stories.filter((st) => st.luister).length, 1)
})
