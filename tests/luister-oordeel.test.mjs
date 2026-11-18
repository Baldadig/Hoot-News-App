// Luister verder: het oordeel van De Redacteur (besluit Alex, 14 november). De woordregels zoeken de kandidaten en sluiten
// hard uit; het laatste woord over "zelfde zaak of verdieping, één onderwerp" ligt bij het AI-oordeel. Alleen een duidelijk
// ja koppelt. Geen echte AI: een nep-client (tests/helpers/nep-oordeel.mjs) die de vraag leest zoals het model hem krijgt.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { koppel, koppelMetOordeel, paren, vangnet, paarKey, leesOordelen, codesVoor, oordeelPrompt, luisterRonde, OORDEEL_KEY, OORDEEL_MODEL, PER_VRAAG, MAX_POGINGEN, PROEF_KEY, STEMMEN } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, leesVraag, JA, NEE, VERDIEPING } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const OPTS = { stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS }
// Alle paren in één ronde (sinds keuring 4 halen meer paren het oordeel dan MAX_AANROEPEN per ronde; het plafond per ronde
// en per dag heeft eigen toetsen).
const ALLES = { maxAanroepen: Infinity, maxVragen: Infinity }
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
// Het paar uit de proef: VI ZSM over de 7-0 bij het Oranje-verhaal.
const ORANJE = (v) => /Galavoorstelling Oranje/.test(v.titel) && /Veerman/.test(v.kop)
const lijst = (r) => r.rows.koppelingen.map((k) => `${k.kop} | ${k.show}: ${k.aflevering}`).sort()

test('het model: claude-sonnet-5-5, met dezelfde client als de rest van De Redacteur (herstel keuring 3)', () => {
  assert.equal(OORDEEL_MODEL, 'claude-sonnet-5-5')
  const src = readFileSync(new URL('../netlify/lib/build.mjs', import.meta.url), 'utf8')
  assert.match(src, /luisterRonde\(\{[^\n]*client: anthropic[^\n]*\}\)/, 'dezelfde client als de rest van de Redacteur')
})

test('alleen een duidelijk ja koppelt: zelfde of verdieping, één onderwerp ja; zeker hoeft niet meer (breder, 18 november)', async () => {
  const geval = async (o) => {
    const { get, update } = memKv()
    const client = nepClient((v) => (ORANJE(v) ? o : NEE))
    const r = await koppelMetOordeel({ ...OPTS, client, get, update })
    return r.rows.koppelingen.filter((k) => /Galavoorstelling/.test(k.aflevering))
  }
  const zelfde = await geval(JA)
  assert.equal(zelfde.length, 1)
  assert.equal(zelfde[0].soort, 'hetzelfde')
  assert.deepEqual(zelfde[0].oordeel, JA)
  assert.equal(zelfde[0].reden, 'nep')
  const verdieping = await geval(VERDIEPING)
  assert.equal(verdieping.length, 1)
  assert.equal(verdieping[0].soort, 'verdiepend')
  // Breder (besluit Alex, 18 november): zeker nee koppelt ook, bij een show met een Hoot-bron (deze show: de NOS).
  for (const o of [{ ...JA, zeker: 'nee' }, { ...VERDIEPING, zeker: 'nee' }]) assert.equal((await geval(o)).length, 1, JSON.stringify(o))
  // Een vooruitblik op iets voorbijs, een aflevering die zegt dat ze vóór dit nieuws is opgenomen, of een oordeel zonder
  // die velden koppelt niet (herstel keuring 3 van branch shows).
  for (const o of [{ ...JA, eenOnderwerp: 'nee' }, NEE, { ...JA, vooruitblikOpVoorbij: 'ja' }, { ...VERDIEPING, opgenomenVoorDitNieuws: 'ja' }, { soort: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }, { voorHetNieuws: 'nee', zaak: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }, null]) {
    assert.equal((await geval(o)).length, 0, JSON.stringify(o))
  }
  // Nee overal: geen enkele koppeling, ook geen artikellink van de eigen uitgever (het model heeft het laatste woord).
  const { get, update } = memKv()
  const r = await koppelMetOordeel({ ...OPTS, client: nepClient(() => NEE), get, update })
  assert.equal(r.byStory.size, 0)
  assert.ok(r.rows.afgevallen.some((a) => a.oordeel && /^oordeel: soort anders/.test(a.reden)), 'de afgevallen kandidaten met de reden van het oordeel')
})

test('een oordeel dat niet op tijd is: geen koppeling voor dat paar, nooit terugvallen op losser; de volgende ronde opnieuw', async () => {
  const { kv, get, update } = memKv()
  const hangt = nepClient(() => JA, { hangt: true })
  // De woordregels zelf kosten rekentijd (op een drukke machine meer dan een seconde): die tellen niet mee.
  const t1 = Date.now()
  paren(OPTS)
  const rekenen = Date.now() - t1
  const t0 = Date.now()
  const r = await koppelMetOordeel({ ...OPTS, client: hangt, get, update, timeoutMs: 60 })
  assert.ok(Date.now() - t0 < 2 * rekenen + 1000, 'de eigen tijdgrens houdt de ronde niet op')
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
  const fout = await koppelMetOordeel({ ...OPTS, ...ALLES, client: nepClient(() => JA, { fout: new Error('overbelast') }), get, update })
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
  const r1 = await koppelMetOordeel({ ...OPTS, ...ALLES, client, get, update })
  const n1 = client.calls.length
  assert.ok(n1 >= 1)
  assert.equal(r1.ai.gevraagd, r1.ai.kandidaten)
  const doc = kv.get(OORDEEL_KEY)
  assert.equal(Object.keys(doc.o).length, r1.ai.kandidaten)
  for (const [k, v] of Object.entries(doc.o)) assert.ok(k.split('|').length === 3 && v.length === 7 && typeof v[4] === 'number' && ['ja', 'nee'].includes(v[5]) && ['ja', 'nee'].includes(v[6]))
  const r2 = await koppelMetOordeel({ ...OPTS, ...ALLES, client, get, update })
  assert.equal(client.calls.length, n1, 'de tweede ronde vraagt niets')
  assert.equal(r2.ai.uitOpslag, r1.ai.kandidaten)
  assert.deepEqual(lijst(r2), lijst(r1))
  // Een paar zonder geldig oordeel (het model slaat het over): hooguit MAX_POGINGEN keer gevraagd.
  const leeg = memKv()
  const zwijgt = nepClient(() => null)
  for (let k = 0; k < MAX_POGINGEN + 2; k++) await koppelMetOordeel({ ...OPTS, ...ALLES, client: zwijgt, get: leeg.get, update: leeg.update })
  const perPaar = new Map()
  for (const c of zwijgt.calls) for (const v of leesVraag(c.messages[0].content)) perPaar.set(`${v.kop}|${v.titel}`, (perPaar.get(`${v.kop}|${v.titel}`) || 0) + 1)
  assert.ok(perPaar.size > 0 && [...perPaar.values()].every((n) => n === MAX_POGINGEN * STEMMEN), 'elke poging is één vraag van STEMMEN aanroepen')
  // Oude oordelen (ouder dan vier dagen) gaan bij het schrijven weg.
  const oud = memKv()
  oud.kv.set(OORDEEL_KEY, { v: 1, o: { 'x|y': ['zelfde', 'ja', 'ja', 'oud', NOW - 5 * 864e5] } })
  await koppelMetOordeel({ ...OPTS, client: nepClient(() => NEE), get: oud.get, update: oud.update })
  assert.ok(!('x|y' in oud.kv.get(OORDEEL_KEY).o))
})

test('één paar per vraag, elke vraag één keer, zonder denkstap en zonder temperatuur, het hele verhaal in de vraag', async () => {
  const { get, update } = memKv()
  const client = nepClient(() => NEE)
  const r = await koppelMetOordeel({ ...OPTS, client, get, update })
  assert.equal(STEMMEN, 1)
  assert.equal(PER_VRAAG, 1)
  assert.equal(r.ai.aanroepen, r.ai.vragen * STEMMEN)
  assert.equal(client.calls.length, r.ai.aanroepen)
  const perVerhaal = new Map()
  const inhoud = new Map()
  for (const c of client.calls) {
    const vragen = leesVraag(c.messages[0].content)
    assert.ok(vragen.length >= 1 && vragen.length <= PER_VRAAG)
    // Herstel keuring 14 november: nooit twee verhalen in één vraag.
    assert.equal(new Set(vragen.map((v) => v.kop)).size, 1, 'één verhaal per vraag')
    assert.equal((c.messages[0].content.match(/^Verhaal [A-Z]:/gm) || []).length, 1)
    for (const v of vragen) perVerhaal.set(v.kop, (perVerhaal.get(v.kop) || 0) + 1)
    inhoud.set(c.messages[0].content, (inhoud.get(c.messages[0].content) || 0) + 1)
    assert.equal(c.model, OORDEEL_MODEL)
    // Dit model geeft een fout op "disabled" en op een andere temperatuur dan de standaard.
    assert.deepEqual(c.thinking, { type: 'between_tools' })
    assert.ok(!('temperature' in c) && !('top_p' in c) && !('top_k' in c))
    assert.equal(c.output_config.effort, 'low')
    assert.equal(c.output_config.format.type, 'json_schema')
  }
  assert.ok([...inhoud.values()].every((n) => n === STEMMEN), 'elke vraag precies STEMMEN keer')
  assert.ok(perVerhaal.size >= 2, 'de fixture heeft kandidaten bij meer verhalen')
  assert.ok(r.ai.kostenUsd > 0 && Number.isFinite(r.ai.ms), 'kosten en duur per ronde')
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
  assert.equal(client.calls.length, STEMMEN)
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
  // Een aflevering die zegt dat het nieuws pas na de opname kwam: hard. Een vooruitblik van vóór de kop is sinds 18 november
  // (breder) niet meer hard: De Redacteur beslist of de vraag van de vooruitblik inmiddels beantwoord is.
  const lead = byId.get(FIX.stories.find((st) => byId.get(st.leadId)?.title?.includes('Veerman')).leadId)
  const basis = FIX.episodes.find((e) => /Galavoorstelling/.test(e.titel))
  const na = { ...basis, id: 'e-na', titel: 'Oranje na de 7-0 tegen Griekenland', samenvatting: 'Net na het opnemen van deze aflevering kwam het bericht dat Veerman en De Jong op het middenveld Oranje dreigender maakten.', tekst: '' }
  const voor = { ...basis, id: 'e-voor', titel: 'Vooruitblik: Oranje tegen Griekenland', samenvatting: 'We blikken vooruit op Oranje tegen Griekenland, met Veerman en De Jong op het middenveld.', tekst: '', t: Date.parse(lead.publishedAt) - 6 * 36e5 }
  const eps = [...FIX.episodes, na, voor]
  const client2 = nepClient((v) => (v.titel === voor.titel ? { ...JA, vooruitblikOpVoorbij: 'ja' } : JA))
  const r2 = await koppelMetOordeel({ ...OPTS, episodes: eps, client: client2, get: memKv().get, update: memKv().update, maxAanroepen: Infinity, maxVragen: Infinity })
  for (const id of ['e-na', 'e-voor']) assert.ok(!r2.rows.koppelingen.some((k) => k.aflevering === eps.find((e) => e.id === id).titel), id)
  assert.ok(r2.rows.afgevallen.some((a) => a.aflevering === na.titel && /na de opname/.test(a.reden)))
  const gevraagd2 = client2.calls.flatMap((c) => leesVraag(c.messages[0].content).map((v) => v.titel))
  assert.ok(!gevraagd2.includes(na.titel), 'na de opname: niet gevraagd')
  assert.ok(gevraagd2.includes(voor.titel), 'de vooruitblik gaat naar De Redacteur')
  assert.ok(r2.rows.afgevallen.some((a) => a.aflevering === voor.titel && /vooruitblik op voorbij ja/.test(a.reden)))
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
  assert.equal(leesOordelen(JSON.stringify({ oordelen: [{ nr: 1, code: codes[0], soort: 'misschien', vooruitblikOpVoorbij: 'nee', opgenomenVoorDitNieuws: 'nee', eenOnderwerp: 'ja', zeker: 'ja', reden: 'x' }] }), 2, codes).size, 0)
  const lead = twee[0].x.items.find((i) => i.id === twee[0].x.st.leadId) || twee[0].x.items[0]
  assert.equal(paarKey(twee[0]), `${twee[0].x.st.id}|${twee[0].e.id}|${lead.id}`)
})

test('in de ronde: de proef toont per koppeling het oordeel en de reden, de afgevallen kandidaten met de reden van het oordeel, en de tellingen', async () => {
  const { kv, get, update } = memKv()
  const stories = FIX.stories.map((st) => ({ ...st }))
  const client = nepClient((v) => (ORANJE(v) ? JA : NEE))
  const n = await luisterRonde({ stories, byId, now: NOW, episodesP: Promise.resolve({ episodes: FIX.episodes, status: {} }), slot: '2026-11-14-middag', mainIds: MAIN_IDS, update, get, client, editie: { algemeen: new Set(), pool: new Set() } })
  assert.equal(n, 1)
  const d = kv.get(PROEF_KEY).dagdelen[0]
  assert.equal(d.koppelingen[0].oordeel.soort, 'zelfde')
  assert.equal(d.koppelingen[0].reden, 'nep')
  assert.ok(d.afgevallen.some((a) => a.oordeel?.soort === 'anders' && /^oordeel: /.test(a.reden)))
  assert.equal(d.oordeel.model, OORDEEL_MODEL)
  assert.ok(d.oordeel.gevraagd >= 1 && d.oordeel.invoerTokens > 0)
  assert.equal(stories.filter((st) => st.luister).length, 1)
})

test('met stemmen: 2 (niet meer de standaard): alleen twee keer een duidelijk ja koppelt; één nee is genoeg; één ja en geen tweede oordeel is nog niets', async () => {
  // Een nep-client die per aanroep wisselt: de eerste aanroep van elke vraag ja, de tweede `tweede`.
  const wissel = (tweede) => {
    let n = 0
    let worp = 0
    const c = nepClient((v) => (!ORANJE(v) ? NEE : worp % 2 === 1 ? tweede : JA))
    const create = c.messages.create
    c.messages.create = (req) => {
      worp = n++
      return create(req)
    }
    return c
  }
  const draai = async (client) => {
    const { kv, get, update } = memKv()
    const r = await koppelMetOordeel({ ...OPTS, client, get, update, stemmen: 2 })
    return { r, kv, aan: r.rows.koppelingen.filter((k) => /Galavoorstelling/.test(k.aflevering)).length }
  }
  assert.equal((await draai(wissel(JA))).aan, 1, 'twee keer ja')
  const oneens = await draai(wissel(NEE))
  assert.equal(oneens.aan, 0, 'één ja en één nee: niets')
  assert.ok(oneens.r.ai.oneens >= 1)
  assert.ok(Object.values(oneens.kv.get(OORDEEL_KEY).o).some((v) => v[0] === 'anders'), 'het nee wordt bewaard')
  const half = await draai(wissel(null))
  assert.equal(half.aan, 0, 'één ja en geen tweede oordeel: niets')
  assert.ok(Object.keys(half.kv.get(OORDEEL_KEY).p || {}).length >= 1, 'het paar komt de volgende ronde terug')
})

test('herstel keuring: The Daily "recorded before the news of Mr. Huang\'s resignation" koppelt niet aan het Nvidia-nieuws, ook niet bij een ja', async () => {
  const daily = FIX.episodes.find((e) => /Huang’s Resignation Will Mean/.test(e.titel))
  assert.ok(daily && /Mr\. Huang/.test(daily.tekst || daily.samenvatting))
  const p = paren(OPTS)
  const cs = p.paren.filter((c) => c.e.id === daily.id)
  assert.ok(cs.length >= 1, 'The Daily is een kandidaat bij een Nvidia-verhaal')
  for (const c of cs) assert.match(vangnet(c, NOW), /na de opname/)
  const { get, update } = memKv()
  const r = await koppelMetOordeel({ ...OPTS, client: nepClient(() => JA), get, update })
  assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === daily.titel))
  assert.ok(!koppel(OPTS).rows.koppelingen.some((k) => k.aflevering === daily.titel), 'ook de woordregels niet meer')
})

test('herstel keuring: een kop over een andere kant van het verhaal gaat naar het oordeel, en een nee van het model houdt hem tegen (herstel keuring 5)', async () => {
  // Live 14 november: "Schrijnend contrast: Frenkie de Jong gaat van 6 procent Oranje-absentie naar 58" en de nabespreking
  // van de 7-0, "Galavoorstelling Oranje". Hier: hetzelfde Oranje-verhaal met die kop. Tot keuring 5 hield het vangnet dit
  // hard tegen (de eerste naam van de kop). Sinds herstel keuring 5 noemt de kop een centrale naam van het verhaal (Oranje),
  // dus beslist De Redacteur, die de kop ziet ("de kop gaat over een andere kant": soort anders; zo ook P5 in keuring 5).
  const oranje = FIX.stories.find((st) => byId.get(st.leadId)?.title?.includes('Veerman'))
  const lead = byId.get(oranje.leadId)
  const meng = { ...lead, id: 'meng-kop', title: 'Schrijnend contrast: Frenkie de Jong gaat van 6 procent Oranje-absentie naar 58', summary: 'Frenkie de Jong miste de afgelopen jaren steeds vaker interlands van Oranje door blessures.' }
  const byId2 = new Map(byId).set(meng.id, meng)
  const stories = FIX.stories.map((st) => (st.id === oranje.id ? { ...st, leadId: meng.id, itemIds: [meng.id, ...st.itemIds] } : st))
  const opts = { ...OPTS, stories, byId: byId2 }
  const c = paren(opts).paren.find((c) => c.x.st.id === oranje.id && /Galavoorstelling/.test(c.e.titel))
  assert.ok(c, 'nog steeds een kandidaat')
  assert.equal(c.kop, true)
  assert.equal(vangnet(c, NOW), null)
  const { get, update } = memKv()
  const client = nepClient((v) => (/Schrijnend/.test(v.kop) && /Galavoorstelling/.test(v.titel) ? NEE : null))
  const r = await koppelMetOordeel({ ...opts, client, get, update, ...ALLES })
  assert.ok(client.calls.some((q) => leesVraag(q.messages[0].content).some((v) => /Schrijnend/.test(v.kop) && /Galavoorstelling/.test(v.titel))), 'gevraagd, met de kop erbij')
  assert.ok(!r.rows.koppelingen.some((k) => k.verhaal === oranje.id && /Galavoorstelling/.test(k.aflevering)))
  // De gewone kop van dat verhaal ("Met Veerman én De Jong op het middenveld …") deelt de gebeurtenis.
  const goed = paren(OPTS).paren.find((c) => c.x.st.id === oranje.id && /Galavoorstelling/.test(c.e.titel))
  assert.equal(goed.kop, true)
})

test('herstel keuring 3: een bewaard oordeel geldt alleen voor de kop waarop het gegeven is (Lukaku-geval)', async () => {
  // Live 14 november: hetzelfde verhaal kreeg 's ochtends de kop over de 7-0 (ja) en 's middags een kop over Lukaku en
  // Mbappé; het bewaarde ja koppelde toen de nabespreking van de 7-0. Nu wordt het paar met de nieuwe kop opnieuw gevraagd.
  const oranje = FIX.stories.find((st) => byId.get(st.leadId)?.title?.includes('Veerman'))
  const { get, update } = memKv()
  const r1 = await koppelMetOordeel({ ...OPTS, client: nepClient((v) => (ORANJE(v) ? JA : NEE)), get, update })
  assert.ok(r1.rows.koppelingen.some((k) => k.verhaal === oranje.id && /Galavoorstelling/.test(k.aflevering)))
  // Dezelfde verhaal-id, een ander stuk als kop (dat de gebeurtenis nog deelt, zodat het vangnet het niet al tegenhoudt).
  const andere = oranje.itemIds.find((id) => id !== oranje.leadId && paren({ ...OPTS, stories: FIX.stories.map((st) => (st.id === oranje.id ? { ...st, leadId: id } : st)) }).paren.some((c) => c.x.st.id === oranje.id && /Galavoorstelling/.test(c.e.titel) && !vangnet(c, NOW)))
  assert.ok(andere, 'een ander stuk van het verhaal waarbij de aflevering nog kandidaat is')
  const stories = FIX.stories.map((st) => (st.id === oranje.id ? { ...st, leadId: andere } : st))
  const client = nepClient(() => NEE)
  const r2 = await koppelMetOordeel({ ...OPTS, stories, client, get, update })
  assert.ok(client.calls.some((q) => leesVraag(q.messages[0].content).some((v) => /Galavoorstelling/.test(v.titel))), 'opnieuw gevraagd met de nieuwe kop')
  assert.ok(!r2.rows.koppelingen.some((k) => k.verhaal === oranje.id && /Galavoorstelling/.test(k.aflevering)), 'het oude ja telt niet voor de nieuwe kop')
})

// Onderzoek live proef 2026-11-15-ochtend ("11 gevraagd in 11 aanroepen ... 8 niet op tijd", 8001 ms): de aanroepen werden
// afgekapt door hun eigen grens van 8 s (OORDEEL_MS), niet door de planner; elf vragen tegelijk aan Sonnet duren rond die
// 8 s. Een grens tot 12,5 s na de start van de ronde gaf alleen minder tijd (derde keuring van branch weekshow): het
// koppelen begint live pas rond 9,5 tot 11 s na de start. Nu, zoals verschillen-refresh: de ronde vraagt niets en zet de
// open vragen in de wachtrij; een eigen geplande functie (oordeelRonde) stelt ze met meer tijd per aanroep, en de volgende
// ronde koppelt. Met een realistische begintijd van de ronde.
test('de tijd van het oordeel: de ronde vraagt niets en zet de vragen in de wachtrij, ook als ze laat begint', async () => {
  const { WACHTRIJ_KEY, KOPPEL_MS } = await import('../netlify/lib/luister.mjs')
  const { kv, get, update } = memKv()
  const client = nepClient(() => JA)
  // Het koppelen begint zoals live: ruim na de start van de ronde (na FETCH_MS en de Editie), en zelfs over KOPPEL_MS.
  const start = Date.now() - (KOPPEL_MS + 500)
  const n = await luisterRonde({ ...OPTS, episodesP: Promise.resolve({ episodes: FIX.episodes, status: {} }), slot: '2026-11-14-middag', client, get, update, start, wachtrij: true })
  assert.equal(client.calls.length, 0, 'de ronde vraagt het model niets')
  assert.equal(n, 0, 'nog geen oordeel: deze ronde geen koppeling')
  const rij = kv.get(WACHTRIJ_KEY)
  assert.ok(rij?.vragen?.length >= 1, 'de open vragen staan in de wachtrij')
  assert.equal(rij.at, NOW)
  for (const v of rij.vragen) {
    assert.ok(typeof v.prompt === 'string' && v.prompt.length > 100)
    assert.equal(v.keys.length, v.codes.length)
  }
  const proef = kv.get(PROEF_KEY).dagdelen[0]
  assert.equal(proef.oordeel.wachtrij, rij.vragen.length)
  assert.ok(proef.oordeel.koppelNaMs >= KOPPEL_MS + 500, 'de werkelijke begintijd van het koppelen staat in de proef')
  assert.ok(proef.afgevallen.some((a) => /^nog geen oordeel: De Redacteur beoordeelt het paar in zijn eigen ronde/.test(a.reden)))
  assert.equal(kv.get(OORDEEL_KEY), undefined, 'geen poging en geen kosten bewaard')
  // De ronde in build.mjs zet de wachtrij aan en geeft de start mee.
  const build = readFileSync(new URL('../netlify/lib/build.mjs', import.meta.url), 'utf8')
  assert.match(build, /luisterRonde\(\{[^\n]*start: roundStart, wachtrij: true(, ids: zoekIds)? \}\)/)
})

test('de tijd van het oordeel: de eigen functie stelt de vragen met ruim meer tijd dan 8 s per aanroep, en de volgende ronde koppelt', async () => {
  const { oordeelRonde, WACHTRIJ_KEY, OORDEEL_MS, OORDEEL_VRAAG_MS, OORDEEL_BUDGET_MS } = await import('../netlify/lib/luister.mjs')
  assert.ok(OORDEEL_VRAAG_MS > OORDEEL_MS * 1.5, 'meer dan de 8 s waarop de aanroepen live afgekapt werden')
  assert.ok(OORDEEL_BUDGET_MS > OORDEEL_VRAAG_MS && OORDEEL_BUDGET_MS <= 25000, 'binnen de ± 30 s van een geplande functie')
  const fn = readFileSync(new URL('../netlify/functions/luister-oordeel.mjs', import.meta.url), 'utf8')
  assert.match(fn, /schedule: '5,15,25,35,45,55 \* \* \* \*'/, 'een paar minuten na elke ronde')
  assert.match(fn, /oordeelRonde\(/)
  const { kv, get, update } = memKv()
  const ronde = () => koppelMetOordeel({ ...OPTS, client: nepClient(() => NEE), get, update, wachtrij: true, ...ALLES })
  const r1 = await ronde()
  const open = kv.get(WACHTRIJ_KEY).vragen.length
  assert.ok(open >= 1)
  assert.equal(r1.byStory.size, 0)
  // De functie: start nu (zoals een geplande functie), de vragen meteen; elke aanroep krijgt OORDEEL_VRAAG_MS.
  const client = nepClient((v) => (ORANJE(v) ? JA : NEE), { wacht: 20 })
  const start = Date.now()
  const { stats } = await oordeelRonde({ client, get, update, now: NOW, start, maxAanroepen: Infinity })
  assert.equal(client.calls.length, open, 'elke vraag uit de wachtrij één keer')
  assert.equal(stats.inWachtrij, open)
  assert.equal(stats.timeoutMs, OORDEEL_VRAAG_MS)
  assert.ok(stats.begonNaMs < 2000, `${stats.begonNaMs} ms na de start begonnen`)
  assert.equal(stats.timeouts, 0)
  assert.equal(stats.beoordeeld, stats.gevraagd)
  assert.equal(kv.get(WACHTRIJ_KEY).laatste.gevraagd, stats.gevraagd, 'de tellingen staan bij de wachtrij, voor de proef')
  // Nog eens: alles heeft al een oordeel, dus niets gevraagd.
  const nog = nepClient(() => JA)
  await oordeelRonde({ client: nog, get, update, now: NOW, maxAanroepen: Infinity })
  assert.equal(nog.calls.length, 0)
  // De volgende ronde koppelt uit de opslag, zonder het model te vragen, en meldt de laatste ronde van De Redacteur.
  const r2 = await ronde()
  assert.ok(r2.rows.koppelingen.some((k) => /Galavoorstelling/.test(k.aflevering)), 'de volgende ronde koppelt')
  assert.equal(r2.ai.uitOpslag, r2.ai.kandidaten)
  assert.equal(r2.ai.redacteur.gevraagd, 0)
})

test('de tijd van het oordeel: de eigen functie blijft binnen haar budget, telt een time-out als poging, en laat een oude wachtrij liggen', async () => {
  const { oordeelRonde, WACHTRIJ_KEY, WACHTRIJ_KEEP } = await import('../netlify/lib/luister.mjs')
  const { kv, get, update } = memKv()
  await koppelMetOordeel({ ...OPTS, client: nepClient(() => NEE), get, update, wachtrij: true, ...ALLES })
  // Een hangend model: elke aanroep hooguit wat er van het budget over is.
  const hangt = nepClient(() => JA, { hangt: true })
  const t0 = Date.now()
  const { stats } = await oordeelRonde({ client: hangt, get, update, now: NOW, start: t0, budget: 3500, kvMs: 500, minMs: 200 })
  assert.ok(stats.timeoutMs <= 2500, `${stats.timeoutMs} ms per aanroep`)
  assert.ok(Date.now() - t0 < 3500, 'binnen het budget')
  assert.equal(stats.timeouts, stats.aanroepen)
  const doc = kv.get(OORDEEL_KEY)
  assert.ok(Object.keys(doc.p || {}).length >= 1, 'een time-out telt als poging')
  assert.ok(doc.k[1] > 0, 'en als kosten voor het dagplafond')
  // Te weinig tijd over: niets gevraagd, en geenTijd in de tellingen.
  const kort = nepClient(() => JA)
  const g = await oordeelRonde({ client: kort, get, update, now: NOW, start: Date.now() - 20000 })
  assert.equal(kort.calls.length, 0)
  assert.equal(g.stats.geenTijd, true)
  // Een wachtrij van een oude ronde telt niet.
  const oud = nepClient(() => JA)
  const o = await oordeelRonde({ client: oud, get, update, now: NOW + WACHTRIJ_KEEP + 60000 })
  assert.equal(oud.calls.length, 0)
  assert.equal(o.stats.inWachtrij, 0)
  // Zonder sleutel: niets.
  assert.equal((await oordeelRonde({ client: null, get, update })).stats.uit, 'geen sleutel')
  assert.ok(kv.get(WACHTRIJ_KEY))
})
