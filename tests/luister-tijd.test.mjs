// Luister verder: de tijd van een aflevering tegenover het nieuws van het verhaal.
// Herstel keuring 2 van branch shows (14 november, late avond): een aflevering van vóór het nieuws kwam bij een verhaal in de
// algemene Editie. Herstel keuring 3 (14 november, nacht): dat herstel was te streng. Besluit Alex: een aflevering tot drie
// dagen oud mag als verdieping bij een verhaal van vandaag (podcasts verschijnen niet dagelijks); niet een vooruitblik op iets
// dat inmiddels gebeurd is, en niet een aflevering die zelf zegt dat ze is opgenomen vóór precies het nieuws van de kop.
// Twee lagen: het vangnet (alleen de harde gevallen) en het oordeel van De Redacteur (soort zelfde/verdieping/anders,
// vooruitblikOpVoorbij, opgenomenVoorDitNieuws), met de tijdgrens per soort in de code (tijdGrens). Geen echte AI: de nep-client.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { paren, vangnet, koppelMetOordeel, describe, weekdagVooruit, oordeelPrompt, leesOordelen, codesVoor, leesOpslag, ja, tijdGrens, OORDEEL_SCHEMA, OORDEEL_SYSTEM, OORDEEL_KEY, DEEP_H, BEFORE_H, SHOW } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, JA, VERDIEPING } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const H = 36e5
// Het crisisverhaal van de fixture: kop "Crisisoverleg op landgoed begonnen: komen de partijen nader tot elkaar?" (1 uur oud),
// eerste stuk 19 uur oud, in de algemene Editie.
const CRISIS = 'sts2z5a'
const EDITIE = { algemeen: new Set(['s1s3jyv9', CRISIS, 'srfd4fh']), pool: new Set(['sq11b7y']) }
const LEAD_AT = Date.parse(byId.get(FIX.stories.find((s) => s.id === CRISIS).leadId).publishedAt)
let n = 0
const ep = (show, titel, tekst, uur) => ({ id: 'tijd' + ++n, show, titel, samenvatting: tekst, tekst, t: NOW - uur * H, links: [], pagina: 'https://example.org/' + n })
// De drie afleveringen uit keuring 2 (rand2.mjs), letterlijk: de harde gevallen.
const VOORUIT = ep('nrc-vandaag', 'Crisisoverleg op landgoed: komen de partijen nader tot elkaar?', 'Vrijdag begint het crisisoverleg van D66, VVD en CDA op een landgoed. Komen de partijen nader tot elkaar, of valt het kabinet-Jetten? We bespreken de scenario’s voor het overleg.', 40)
const SINDS = ep('nos-de-dag', 'Het crisisoverleg op het landgoed', 'Waarom zitten D66, VVD en CDA op een landgoed? Sinds de opname van deze aflevering is het crisisoverleg op het landgoed begonnen. We leggen uit waar de partijen ruzie over hebben.', 20)
const INMIDDELS = ep('nos-de-dag', 'Crisisoverleg op landgoed: de inzet', 'Let op: deze aflevering maakten we woensdagavond. Inmiddels is het crisisoverleg op het landgoed begonnen. Wat willen D66, VVD en CDA bereiken?', 30)
// De verdieping van gisteren over de lopende kabinetscrisis (zoals NRC Vandaag "Waar gaat deze politieke crisis nou echt
// over?" en De Dag "Hoe Jetten zijn crisis (mis)managet"), opgenomen vóór het overleg, met gewone tijdwoorden: die mag nu.
const CRISIS_GISTEREN = ep('nos-de-dag', 'Crisisoverleg op landgoed: waar gaat deze politieke crisis nou echt over?', 'Inmiddels zit het kabinet-Jetten al dagen in de crisis. Ondertussen zoeken D66, VVD en CDA een uitweg op het landgoed. We leggen uit waar de partijen echt ruzie over hebben en wat er op het spel staat.', 22)
// Zoals The Daily (12 november): opgenomen vóór precies het nieuws, in een zin die het vangnet niet kent. Dan beslist het
// model met opgenomenVoorDitNieuws.
const GESPREK_VOOR = ep('nos-de-dag', 'Crisisoverleg op landgoed: wat staat er op het spel?', 'Dit gesprek vond plaats voordat D66, VVD en CDA aan het crisisoverleg op het landgoed begonnen. We leggen uit wat er op het spel staat voor het kabinet-Jetten.', 21)
const opts = (episodes) => ({ stories: FIX.stories, byId, episodes, now: NOW, mainIds: MAIN_IDS, editie: EDITIE })
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const paar = (e) => paren(opts([e])).paren.find((c) => c.x.st.id === CRISIS && c.e.id === e.id)
const koppelingen = async (e, o) => {
  const { get, update } = memKv()
  return (await koppelMetOordeel({ ...opts([e]), client: nepClient(() => o), get, update })).rows.koppelingen.filter((k) => k.verhaal === CRISIS)
}

test('de harde gevallen blijven hard: een vooruitblik op een voorbije dag en "sinds de opname" / "maakten we … inmiddels", ook als het model ja zegt', async () => {
  assert.ok(VOORUIT.t < LEAD_AT && SINDS.t < LEAD_AT && INMIDDELS.t < LEAD_AT, 'alle drie ouder dan de kop')
  for (const [e, reden] of [[VOORUIT, /vooruitblik op vrijdag/], [SINDS, /na de opname/], [INMIDDELS, /na de opname/]]) {
    const c = paar(e)
    assert.ok(c, `${e.titel}: een kandidaat bij het crisisverhaal (de kop past)`)
    assert.match(vangnet(c, NOW) || '', reden, e.titel)
  }
  const { get, update } = memKv()
  const client = nepClient(() => VERDIEPING)
  const r = await koppelMetOordeel({ ...opts([VOORUIT, SINDS, INMIDDELS]), client, get, update })
  assert.equal(r.rows.koppelingen.length, 0, 'geen koppeling, ook niet als andere')
  assert.equal(client.calls.length, 0, 'niet eens gevraagd')
})

test('besluit Alex: de crisisverdieping van gisteren koppelt bij het crisisoverleg van vandaag, ook met "inmiddels" en "ondertussen"', async () => {
  const c = paar(CRISIS_GISTEREN)
  assert.ok(c && CRISIS_GISTEREN.t < LEAD_AT, 'ouder dan de kop (en dan het eerste stuk)')
  assert.ok(CRISIS_GISTEREN.t < c.firstAt)
  assert.equal(vangnet(c, NOW), null, 'een tijdwoord alleen sluit niet meer uit')
  const k = await koppelingen(CRISIS_GISTEREN, VERDIEPING)
  assert.equal(k.length, 1)
  assert.equal(k[0].soort, 'verdiepend')
  assert.equal(k[0].editie, 'de algemene Editie')
  // Maar niet als het model er een vooruitblik op iets voorbijs in leest, of een opname van vóór dit nieuws.
  assert.equal((await koppelingen(CRISIS_GISTEREN, { ...VERDIEPING, vooruitblikOpVoorbij: 'ja' })).length, 0)
  assert.equal((await koppelingen(CRISIS_GISTEREN, { ...VERDIEPING, opgenomenVoorDitNieuws: 'ja' })).length, 0)
})

test('opgenomen vóór precies dit nieuws, in een zin die het vangnet niet kent: het model beslist (opgenomenVoorDitNieuws)', async () => {
  const c = paar(GESPREK_VOOR)
  assert.ok(c)
  assert.equal(vangnet(c, NOW), null, 'het vangnet kent deze zin niet')
  assert.equal((await koppelingen(GESPREK_VOOR, { ...VERDIEPING, opgenomenVoorDitNieuws: 'ja' })).length, 0)
  assert.equal((await koppelingen(GESPREK_VOOR, { ...JA, opgenomenVoorDitNieuws: 'ja' })).length, 0)
})

test('de tijdgrens per soort (herstel keuring 4): zelfde en verdieping tot drie dagen ouder dan de kop', () => {
  const c = paar(CRISIS_GISTEREN)
  const op = (t) => ({ ...c, e: { ...c.e, t } })
  assert.equal(tijdGrens(op(c.firstAt + H), JA), null)
  assert.equal(tijdGrens(op(c.firstAt - (BEFORE_H - 1) * H), JA), null)
  // Keuring 4: een "zelfde" van meer dan BEFORE_H uur vóór het eerste stuk valt niet meer helemaal af; het wordt als
  // verdieping getoetst (kiesOordeel maakt er "verdiepend" van).
  assert.equal(tijdGrens(op(c.firstAt - (BEFORE_H + 1) * H), JA), null)
  assert.match(tijdGrens(op(LEAD_AT - (DEEP_H + 1) * H), JA), /precies dit nieuws, en als verdieping meer dan 3 dagen ouder dan de kop/)
  // Verdieping: tot DEEP_H uur ouder dan de kop.
  assert.equal(tijdGrens(op(LEAD_AT - (DEEP_H - 1) * H), VERDIEPING), null)
  assert.match(tijdGrens(op(LEAD_AT - (DEEP_H + 1) * H), VERDIEPING), /dagen ouder dan de kop/)
})

test('in de ronde (herstel keuring 4): "zelfde" van ruim vóór het nieuws koppelt als verdieping, binnen drie dagen', async () => {
  const oud = { ...CRISIS_GISTEREN, id: 'tijd-oud', t: paar(CRISIS_GISTEREN).firstAt - (BEFORE_H + 2) * H }
  assert.ok(oud.t > LEAD_AT - DEEP_H * H, 'binnen drie dagen voor de kop')
  const k = await koppelingen(oud, JA)
  assert.equal(k.length, 1)
  assert.equal(k[0].soort, 'verdiepend', 'nooit hetzelfde: ze verscheen ruim voor het nieuws')
  assert.equal((await koppelingen(oud, VERDIEPING)).length, 1)
  // Ook als verdieping alleen met de tijdvelden op nee.
  assert.equal((await koppelingen(oud, { ...JA, vooruitblikOpVoorbij: 'ja' })).length, 0)
  assert.equal((await koppelingen(oud, { ...JA, opgenomenVoorDitNieuws: 'ja' })).length, 0)
})

test('ja vraagt alle velden: soort zelfde of verdieping, geen vooruitblik op voorbij, niet opgenomen vóór dit nieuws, één onderwerp, zeker', () => {
  assert.equal(ja(JA), true)
  assert.equal(ja(VERDIEPING), true)
  for (const v of [{ ...JA, soort: 'anders' }, { ...JA, vooruitblikOpVoorbij: 'ja' }, { ...JA, opgenomenVoorDitNieuws: 'ja' }, { ...JA, eenOnderwerp: 'nee' }, { ...JA, zeker: 'nee' }, { soort: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }, { voorHetNieuws: 'nee', zaak: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }, null]) assert.equal(ja(v), false, JSON.stringify(v))
})

test('het schema en de vraag: soort, vooruitblikOpVoorbij en opgenomenVoorDitNieuws verplicht, de reden eerst, de tijd van aflevering, kop en eerste stuk', () => {
  const p = OORDEEL_SCHEMA.properties.oordelen.items
  assert.deepEqual(p.properties.soort, { type: 'string', enum: ['zelfde', 'verdieping', 'anders'] })
  for (const k of ['vooruitblikOpVoorbij', 'opgenomenVoorDitNieuws', 'eenOnderwerp', 'zeker']) assert.deepEqual(p.properties[k], { type: 'string', enum: ['ja', 'nee'] })
  assert.ok(!('voorHetNieuws' in p.properties) && !('zaak' in p.properties))
  assert.deepEqual(p.required, ['nr', 'code', 'reden', 'soort', 'vooruitblikOpVoorbij', 'opgenomenVoorDitNieuws', 'eenOnderwerp', 'zeker'])
  for (const s of ['tot drie dagen ouder zijn dan de kop', 'Waar gaat deze politieke crisis nou echt over?', 'recorded before the news of Mr. Huang', 'Sinds de opname', 'Vrijdag begint het overleg', '"inmiddels" of "ondertussen" zegt dat niet']) assert.ok(OORDEEL_SYSTEM.includes(s), s)
  // Herstel keuring 4: vooruitblikOpVoorbij geldt voor elk moment dat bij de kop voorbij is, ook een ander moment van
  // dezelfde zaak; "vandaag" en een weekdag gelden vanaf de dag van verschijnen; een vooruitblik op wat nog komt is "nee".
  for (const s of ['reken vanaf de dag dat de aflevering verscheen', 'ook een ander moment van dezelfde zaak dat inmiddels geweest is', 'Vandaag het debat over het Belastingplan', 'alleen vooruitblikt op iets dat bij de kop nog moet komen', 'Komen de partijen er samen uit?']) assert.ok(OORDEEL_SYSTEM.includes(s), s)
  const c = paar(CRISIS_GISTEREN)
  const vraag = oordeelPrompt([c])
  // De dag in Nederland naast elke tijd (herstel keuring 4).
  assert.match(vraag, /^Kop verschenen: \d{4}-\d\d-\d\d \d\d:\d\d UTC \((maan|dins|woens|donder|vrij|zater|zon)dag \d{4}-\d\d-\d\d in Nederland\), \d+ uur na het eerste stuk$/m)
  assert.match(vraag, /verschenen: [^\n]* UTC \([a-z]+dag \d{4}-\d\d-\d\d in Nederland\), \d+ uur vóór het eerste stuk, \d+ uur vóór de kop$/m)
  const codes = codesVoor([c])
  const een = (o) => leesOordelen(JSON.stringify({ oordelen: [{ nr: 1, code: codes[0], reden: 'x', ...o }] }), 1, codes)
  assert.equal(een({ soort: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }).size, 0, 'zonder de tijdvelden telt het niet')
  assert.equal(een({ ...JA, opgenomenVoorDitNieuws: 'misschien' }).size, 0)
  assert.deepEqual({ ...een(VERDIEPING).get(1), reden: undefined }, { ...VERDIEPING, reden: undefined })
})

test('de opslag: v5 bewaart soort en de twee tijdvelden; een oordeel uit een oudere vorm is nooit een ja', async () => {
  assert.equal(OORDEEL_KEY, 'luister-oordeel-v5', 'herstel keuring 4: de vraag over vooruitblikOpVoorbij is anders')
  const { kv, get, update } = memKv()
  await koppelMetOordeel({ ...opts([CRISIS_GISTEREN]), client: nepClient(() => VERDIEPING), get, update })
  const rij = Object.values(kv.get(OORDEEL_KEY).o)[0]
  assert.deepEqual([rij[0], rij[5], rij[6]], ['verdieping', 'nee', 'nee'])
  const { oordelen } = leesOpslag({ v: 1, o: { 'a|b|c': ['zelfde', 'ja', 'ja', 'oud', NOW, 'nee'] } }, NOW)
  assert.equal(ja(oordelen.get('a|b|c')), false, 'zonder opgenomenVoorDitNieuws geen ja')
})

test('het vangnet: na de opname, ook in twee zinnen; een tijdwoord alleen niet', () => {
  const show = SHOW.get('nos-de-dag')
  const na = (tekst) => describe({ titel: 'Crisisoverleg', samenvatting: tekst, tekst }, show).naOpname
  for (const z of [
    'Sinds de opname van deze aflevering is het overleg begonnen.',
    'Sinds we dit opnamen, is het overleg begonnen.',
    'Since we recorded this episode, Huang has resigned.',
    'This episode was recorded before the news of Mr. Huang’s resignation was made public.',
    'Deze aflevering maakten we dinsdagmiddag. Inmiddels is het crisisoverleg begonnen.',
    'Deze aflevering is opgenomen op woensdag. Intussen is bekend dat het overleg begonnen is.',
    'Note: this episode was recorded on Wednesday. Huang has since resigned.',
  ]) assert.ok(na(z), z)
  for (const z of [
    'Inmiddels is het crisisoverleg begonnen.',
    'Ondertussen zoeken D66, VVD en CDA een uitweg.',
    'Huang has since become the face of the scandal.',
    'De minister werd opgenomen in het ziekenhuis. Inmiddels is hij weer thuis.',
    'We leggen uit waar de partijen ruzie over hebben.',
  ]) assert.equal(na(z), null, z)
  assert.ok(!('tijd' in describe({ titel: 'x', samenvatting: 'Inmiddels.' }, show)), 'het oude tijdteken is weg')
})

test('een vooruitblik met een weekdag: alleen als die dag bij de kop al geweest is', () => {
  // De dag van de aflevering in Nederland en de dag van de kop (zaterdag 14 november).
  const op = (t, tekst) => weekdagVooruit({ t, titel: '', tekst }, LEAD_AT)
  const donderdag = Date.parse('2026-11-12T19:00:00Z')
  assert.match(op(donderdag, 'Vrijdag begint het crisisoverleg.'), /vrijdag/i)
  assert.match(op(donderdag, 'Zaterdag stemt de partijraad.'), /zaterdag/i)
  assert.match(op(donderdag, 'On Friday the board decides.'), /friday/i)
  assert.equal(op(donderdag, 'Maandag stemt de Kamer.'), null, 'maandag komt pas na de kop')
  assert.equal(op(donderdag, 'Vorige vrijdag zei Jetten nog van niet.'), null, 'kijkt terug')
  assert.equal(op(donderdag, 'Woensdagavond liep het overleg vast.'), null, 'woensdag was vóór de aflevering')
  assert.equal(op(donderdag, 'Donderdag werd bekend dat er overleg komt.'), null, 'de dag van de aflevering zelf')
  assert.equal(op(LEAD_AT + H, 'Vrijdag begint het crisisoverleg.'), null, 'een aflevering van na de kop')
})
