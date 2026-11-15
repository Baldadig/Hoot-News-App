// Luister verder: een weekshow met één onderwerp ook langs De Redacteur (besluit Alex, 15 november). Een aflevering van een
// weekshow (NRC Haagse Zaken, NRC Wereldzaken, Trouw Haags Halfuurtje) zonder artikellink naar het verhaal volgt hetzelfde
// strenge pad als `verdieping`, met harde eisen erbij: geen weekoverzicht en geen opsomming, het eerste onderwerp is het
// verhaal, geen andere onderwerpen. Daarna beslist het oordeel. Een show met meer onderwerpen (`meer`) blijft alleen via een
// artikellink. Een verkeerde koppeling is erger dan geen; bij twijfel niets.
// Echte afleveringen van 14 november (tests/fixtures/luister-2026-11-14.json); geen echte AI, een nep-oordeel
// (tests/helpers/nep-oordeel.mjs). Het voorbeeld dat gemist werd: NRC Haagse Zaken "Een kabinetsval in slow-motion?" bij
// het verhaal over de kabinetscrisis. Het voorbeeld is een illustratie: de toetsen houden het algemene patroon vast.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { koppel, koppelMetOordeel, paren, vangnet, weekOverzicht, OORDEEL_SYSTEM } from '../netlify/lib/luister.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { nepClient, leesVraag, JA, NEE, VERDIEPING } from './helpers/nep-oordeel.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/luister-2026-11-14.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const NOW = Date.parse(FIX.now)
const OPTS = { stories: FIX.stories, byId, episodes: FIX.episodes, now: NOW, mainIds: MAIN_IDS }
const ALLES = { maxAanroepen: Infinity, maxVragen: Infinity }
const memKv = () => {
  const kv = new Map()
  return { kv, get: (k) => kv.get(k), update: (k, fn) => kv.set(k, fn(kv.get(k) ?? null)) }
}
const CRISIS = FIX.stories.find((st) => /Crisisoverleg op landgoed/.test(byId.get(st.leadId)?.title || ''))
const HZ = FIX.episodes.find((e) => e.show === 'nrc-haagse-zaken' && /kabinetsval in slow-motion/.test(e.titel))
const isHZ = (v) => /kabinetsval in slow-motion/i.test(v.titel || '')
const ronde = async (beslis, episodes = FIX.episodes) => {
  const { get, update } = memKv()
  const client = nepClient(beslis)
  const r = await koppelMetOordeel({ ...OPTS, episodes, client, get, update, ...ALLES })
  const gevraagd = client.calls.flatMap((c) => leesVraag(c.messages[0].content))
  return { r, gevraagd, client }
}
// Een weekoverzicht in de vorm van de echte aflevering (zelfde show, zelfde tijd, zelfde links): alleen de tekst verschilt.
const variant = (id, titel, samenvatting) => ({ ...HZ, id, titel, samenvatting, tekst: '' })
const OVERZICHTEN = [
  variant('w-deze-week', 'De kabinetscrisis en meer', 'Deze week in Den Haag: de VVD stemde tegen het Belastingplan van het kabinet-Jetten. En verder het asieldebat en de stikstofwet.'),
  variant('w-opsomming', 'Wat een week', 'Over het Belastingplan, de VVD in crisis, het asieldebat met Faber en de stikstofwet van Wiersma.'),
  variant('w-terugblik', 'De crisis van de VVD', 'We kijken terug op de politieke week: de VVD stemde tegen het Belastingplan en het kabinet-Jetten wankelt.'),
  variant('w-onderwerpen', 'Het kabinet-Jetten wankelt', 'De VVD stemde tegen het Belastingplan. We bespreken de onderwerpen van de week, maar ook wat D66 en CDA nu willen.'),
]

test('de echte aflevering: één onderwerp, geen weekoverzicht; de taal van een weekoverzicht wel', () => {
  assert.equal(weekOverzicht(HZ), false, '"deze knotsgekke week" is geen overzicht')
  for (const e of OVERZICHTEN) assert.equal(weekOverzicht(e), true, e.samenvatting)
  assert.equal(weekOverzicht({ titel: 'De week in Den Haag', samenvatting: 'De VVD stemde tegen het Belastingplan.' }), true)
  assert.equal(weekOverzicht({ titel: 'Weekoverzicht', samenvatting: 'De VVD stemde tegen het Belastingplan.' }), true)
})

test('(a) een weekshow-aflevering over één onderwerp die het verhaal deelt, komt bij het oordeel en koppelt bij een ja', async () => {
  const ja = await ronde((v) => (isHZ(v) ? VERDIEPING : NEE))
  const vraag = ja.gevraagd.find(isHZ)
  assert.ok(vraag, 'Haagse Zaken is gevraagd')
  assert.match(vraag.kop, /Crisisoverleg op landgoed/)
  assert.match(vraag.show, /NRC Haagse Zaken \(NRC\), weekshow/, 'de vraag zegt dat het een weekshow is')
  const k = ja.r.rows.koppelingen.find((k) => k.verhaal === CRISIS.id)
  assert.ok(k, 'het crisisverhaal krijgt een aflevering')
  assert.equal(k.show, 'NRC Haagse Zaken')
  assert.equal(k.aflevering, HZ.titel)
  assert.equal(k.soort, 'verdiepend')
  assert.equal(k.grond, 'tekst')
  assert.ok(ja.r.byStory.get(CRISIS.id), 'het verhaal krijgt het veld luister')
  // Bij een nee niets.
  const nee = await ronde(() => NEE)
  assert.ok(!nee.r.rows.koppelingen.some((k) => k.show === 'NRC Haagse Zaken'))
  assert.ok(nee.r.rows.afgevallen.some((a) => a.show === 'NRC Haagse Zaken' && /^oordeel: soort anders/.test(a.reden)))
  // En bij een ja met eenOnderwerp nee ook niets.
  const half = await ronde((v) => (isHZ(v) ? { ...VERDIEPING, eenOnderwerp: 'nee' } : NEE))
  assert.ok(!half.r.rows.koppelingen.some((k) => k.show === 'NRC Haagse Zaken'))
})

test('(a) de vraag aan De Redacteur kent de weekshow: alleen zelfde of verdieping als de hele aflevering over dit verhaal gaat', () => {
  assert.match(OORDEEL_SYSTEM, /weekshow/)
  assert.match(OORDEEL_SYSTEM, /Bespreekt ze de week, ook als dit verhaal daarin het grootste onderwerp is, dan soort "anders" en eenOnderwerp "nee"/)
})

test('(b) een weekshow-aflevering met een weekoverzicht van meer onderwerpen koppelt niet, ook niet bij een ja van het model', async () => {
  const { r, gevraagd } = await ronde(() => JA, [...FIX.episodes, ...OVERZICHTEN])
  for (const e of OVERZICHTEN) {
    assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === e.titel), `niet gekoppeld: ${e.titel}`)
    assert.ok(!r.rows.koppelingen.some((k) => (k.andere || []).some((a) => a.endsWith(e.titel))), `ook niet als andere: ${e.titel}`)
    assert.ok(!gevraagd.some((v) => v.titel === e.titel), `niet eens gevraagd: ${e.titel}`)
  }
  const af = r.rows.afgevallen.filter((a) => OVERZICHTEN.some((e) => e.titel === a.aflevering) && a.verhaal === CRISIS.id)
  assert.equal(new Set(af.map((a) => a.aflevering)).size, OVERZICHTEN.length, 'elk overzicht is een kandidaat bij het crisisverhaal en valt af')
  // Een terugblik op de week is al `meer` voor elke show (MEER); de rest valt af als weekoverzicht van een weekshow.
  for (const a of af) assert.match(a.reden, /^weekshow zonder artikellink: |^deze aflevering gaat over meer onderwerpen/)
})

test('(b) een weekshow over iets anders vooraan, of met een tweede onderwerp met een eigen naam, valt hard af', async () => {
  const anders = variant('w-anders', 'Het kabinet en Rotterdam', 'Burgemeester Schouten van Rotterdam stapt op. Daarna de VVD, die tegen het Belastingplan van het kabinet-Jetten stemde.')
  const naam = variant('w-naam', 'Een kabinetsval in slow-motion?', 'De VVD stemde tegen het Belastingplan van het kabinet-Jetten. Ook Mona Keijzer kwam aan het woord in Brussel.')
  const { r } = await ronde(() => JA, [...FIX.episodes, anders, naam])
  // (naam heeft dezelfde titel als de echte aflevering: daarom op de reden bij het crisisverhaal.)
  for (const e of [anders, naam]) assert.ok(r.rows.afgevallen.some((a) => a.verhaal === CRISIS.id && a.aflevering === e.titel && /^weekshow zonder artikellink: /.test(a.reden)), e.id)
  assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === anders.titel))
  const p = paren({ ...OPTS, episodes: [...FIX.episodes, anders, naam] })
  for (const e of [anders, naam]) {
    const c = p.paren.find((c) => c.e.id === e.id && c.x.st.id === CRISIS.id)
    assert.ok(c, `${e.id} is een kandidaat`)
    assert.match(vangnet(c, NOW), /^weekshow zonder artikellink: /, e.id)
  }
})

test('(c) een show met meer onderwerpen (`meer`) zonder artikellink koppelt nog steeds niet', async () => {
  const fd = { ...HZ, id: 'm-fd', show: 'fd-dagkoers', links: [] }
  const { r, gevraagd } = await ronde(() => JA, [...FIX.episodes, fd])
  assert.ok(!r.rows.koppelingen.some((k) => k.show === 'FD Dagkoers' && k.aflevering === fd.titel))
  assert.ok(!gevraagd.some((v) => /FD Dagkoers/.test(v.show) && v.titel === fd.titel))
  const p = paren({ ...OPTS, episodes: [fd] })
  for (const c of p.paren) assert.equal(vangnet(c, NOW), 'meer onderwerpen per aflevering, zonder artikellink')
  // Ook de woordregels alleen.
  const w = koppel({ ...OPTS, episodes: [...FIX.episodes, fd] })
  assert.ok(!w.rows.koppelingen.some((k) => k.show === 'FD Dagkoers'))
})

test('(d) een ja voor NRC Vandaag en voor Haagse Zaken bij hetzelfde verhaal: het verhaal krijgt er één (de bestaande voorrang)', async () => {
  const VANDAAG = /Waar gaat deze politieke crisis/
  const { r } = await ronde((v) => (isHZ(v) || VANDAAG.test(v.titel) ? VERDIEPING : NEE))
  const ks = r.rows.koppelingen.filter((k) => k.verhaal === CRISIS.id)
  assert.equal(ks.length, 1, 'één aflevering per verhaal')
  const [k] = ks
  assert.ok(['NRC Haagse Zaken', 'NRC Vandaag'].includes(k.show))
  // De andere staat hooguit bij `andere` (het toestel kiest wat bij de lezer past), nooit als tweede koppeling.
  const andere = k.show === 'NRC Haagse Zaken' ? 'NRC Vandaag: Waar gaat deze politieke crisis nou echt over?' : `NRC Haagse Zaken: ${HZ.titel}`
  assert.ok(k.andere.includes(andere))
  // Dezelfde uitgever, dezelfde soort, beide zonder link: de nieuwste eerst (perVerhaal).
  assert.equal(k.show, 'NRC Haagse Zaken')
  // En dezelfde aflevering hoort bij geen ander verhaal.
  assert.equal(r.rows.koppelingen.filter((k) => k.aflevering === HZ.titel).length, 1)
})

test('(e) het vangnet laat een weekshow met één onderwerp door en houdt een weekshow met meer onderwerpen tegen', () => {
  const p = paren({ ...OPTS, episodes: [...FIX.episodes, ...OVERZICHTEN] })
  const een = p.paren.find((c) => c.e.id === HZ.id && c.x.st.id === CRISIS.id)
  assert.ok(een, 'Haagse Zaken is een kandidaat bij het crisisverhaal (de namen in de artikellinks tellen mee)')
  assert.equal(een.linked, false)
  assert.equal(een.e.weekMeer, false)
  assert.equal(vangnet(een, NOW), null)
  for (const e of OVERZICHTEN) {
    const c = p.paren.find((c) => c.e.id === e.id && c.x.st.id === CRISIS.id)
    assert.ok(c, `${e.id} is een kandidaat`)
    assert.equal(c.e.weekMeer, true, e.id)
    assert.match(vangnet(c, NOW), /^weekshow zonder artikellink: |^deze aflevering gaat over meer onderwerpen/, e.id)
    // Ook zonder het harde woordoordeel (een paar uit een andere aanroep) houdt het vangnet hem tegen.
    if (!c.e.meer) assert.equal(vangnet({ ...c, o: { ...c.o, hard: false } }, NOW), 'weekshow zonder artikellink: de aflevering bespreekt de week of meer onderwerpen', e.id)
  }
})

test('via een artikellink koppelt een weekshow zoals voorheen, ook met de taal van een weekoverzicht', () => {
  const nrc = CRISIS.itemIds.map((id) => byId.get(id)).find((i) => /nrc\.nl/.test(i?.url || ''))
  assert.ok(nrc, 'het crisisverhaal heeft een stuk van NRC')
  const gelinkt = { ...variant('w-link', 'De VVD en een kabinetsval in slow-motion', 'Deze week in Den Haag: de VVD stemde tegen het Belastingplan van het kabinet-Jetten.'), links: [nrc.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')] }
  const p = paren({ ...OPTS, episodes: [gelinkt] })
  const c = p.paren.find((c) => c.x.st.id === CRISIS.id)
  assert.ok(c)
  assert.equal(c.linked, true)
  assert.equal(c.e.weekMeer, true)
  assert.equal(vangnet(c, NOW), null, 'het weekoverzicht geldt alleen zonder artikellink')
  assert.equal(c.o.grond, 'link')
  assert.ok(c.o.soort, c.o.af)
})
