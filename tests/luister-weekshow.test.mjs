// Luister verder: een weekshow met één onderwerp ook langs De Redacteur (besluit Alex, 15 november). Een aflevering van een
// weekshow (NRC Haagse Zaken, NRC Wereldzaken, Trouw Haags Halfuurtje) zonder artikellink naar het verhaal volgt hetzelfde
// strenge pad als `verdieping`. Het model is de poort voor één onderwerp (weekPoort: eenOnderwerp ja); hard tegengehouden
// wordt alleen een ondubbelzinnig weekoverzicht (derde keuring: vals tegenhouden van een aflevering over één onderwerp is
// erger dan een gat dat het model dichtzet). Een show met meer onderwerpen (`meer`) blijft alleen via een artikellink.
// Echte afleveringen van 14 november (tests/fixtures/luister-2026-11-14.json); geen echte AI, een nep-oordeel
// (tests/helpers/nep-oordeel.mjs). Het voorbeeld dat gemist werd: NRC Haagse Zaken "Een kabinetsval in slow-motion?" bij
// het verhaal over de kabinetscrisis. Het voorbeeld is een illustratie: de toetsen houden het algemene patroon vast.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { koppel, koppelMetOordeel, paren, vangnet, weekOverzicht, weekPoort, paarKey, OORDEEL_SYSTEM, OORDEEL_KEY } from '../netlify/lib/luister.mjs'
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
const ronde = async (beslis, episodes = FIX.episodes, opslag = null) => {
  const { kv, get, update } = memKv()
  if (opslag) kv.set(OORDEEL_KEY, opslag)
  const client = nepClient(beslis)
  const r = await koppelMetOordeel({ ...OPTS, episodes, client, get, update, ...ALLES })
  const gevraagd = client.calls.flatMap((c) => leesVraag(c.messages[0].content))
  return { r, gevraagd, client }
}
// Een weekoverzicht in de vorm van de echte aflevering (zelfde show, zelfde tijd, zelfde links): alleen de tekst verschilt.
const variant = (id, titel, samenvatting) => ({ ...HZ, id, titel, samenvatting, tekst: '' })
const OVERZICHTEN = [
  variant('w-week-in', 'De week in Den Haag', 'De VVD stemde tegen het Belastingplan van het kabinet-Jetten. En verder het asieldebat en de stikstofwet.'),
  variant('w-weekoverzicht', 'Weekoverzicht: het kabinet-Jetten wankelt', 'De VVD stemde tegen het Belastingplan, en verder asiel en stikstof.'),
  variant('w-terugblik', 'De crisis van de VVD', 'We kijken terug op de politieke week: de VVD stemde tegen het Belastingplan en het kabinet-Jetten wankelt.'),
  variant('w-onderwerpen', 'Het kabinet-Jetten wankelt', 'De VVD stemde tegen het Belastingplan. We bespreken de onderwerpen van de week, maar ook wat D66 en CDA nu willen.'),
]

test('de echte aflevering: één onderwerp, geen weekoverzicht; de taal van een weekoverzicht wel', () => {
  assert.equal(weekOverzicht(HZ), false, '"deze knotsgekke week" is geen overzicht')
  assert.equal(weekOverzicht({ ...HZ, samenvatting: HZ.samenvatting.replace('deze knotsgekke week', 'deze week') }), false, '"deze week" ook niet')
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

test('(b) een weekshow over iets anders vooraan, of met een tweede onderwerp met een eigen naam: het model beslist, niet het vangnet', async () => {
  const anders = variant('w-anders', 'Het kabinet en Rotterdam', 'Burgemeester Schouten van Rotterdam stapt op. Daarna de VVD, die tegen het Belastingplan van het kabinet-Jetten stemde.')
  const naam = variant('w-naam', 'Een kabinetsval in slow-motion?', 'De VVD stemde tegen het Belastingplan van het kabinet-Jetten. Ook Mona Keijzer kwam aan het woord in Brussel.')
  const p = paren({ ...OPTS, episodes: [...FIX.episodes, anders, naam] })
  for (const e of [anders, naam]) {
    const c = p.paren.find((c) => c.e.id === e.id && c.x.st.id === CRISIS.id)
    assert.ok(c, `${e.id} is een kandidaat`)
    assert.equal(c.o.hard, undefined, `${e.id}: geen harde uitsluiting`)
    assert.match(c.o.af, /^weekshow zonder artikellink: .*\(het model beslist\)$/, e.id)
    assert.equal(vangnet(c, NOW), null, e.id)
  }
  // Het model ziet het tweede onderwerp: eenOnderwerp nee, geen koppeling.
  const { r, gevraagd } = await ronde((v) => (v.titel === anders.titel || v.beschrijving === naam.samenvatting ? { ...VERDIEPING, eenOnderwerp: 'nee' } : NEE), [...FIX.episodes.filter((x) => x.id !== HZ.id), anders, naam])
  for (const e of [anders, naam]) {
    assert.ok(gevraagd.some((v) => v.beschrijving === e.samenvatting), `${e.id} is gevraagd`)
    assert.ok(r.rows.afgevallen.some((a) => a.verhaal === CRISIS.id && a.aflevering === e.titel && /één onderwerp nee/.test(a.reden)), e.id)
  }
  assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === anders.titel || k.aflevering === naam.titel))
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

test('(d) een ja voor NRC Vandaag en voor Haagse Zaken bij hetzelfde verhaal: de dagelijkse show gaat voor, de weekshow staat bij andere', async () => {
  const VANDAAG = /Waar gaat deze politieke crisis/
  const { r } = await ronde((v) => (isHZ(v) || VANDAAG.test(v.titel) ? VERDIEPING : NEE))
  const ks = r.rows.koppelingen.filter((k) => k.verhaal === CRISIS.id)
  assert.equal(ks.length, 1, 'één aflevering per verhaal')
  const [k] = ks
  // Koerswijziging 15 november: de dagelijkse show is verser en strakker, ook al is de weekshow nieuwer.
  assert.equal(k.show, 'NRC Vandaag')
  assert.match(k.aflevering, VANDAAG)
  assert.ok(k.andere.includes(`NRC Haagse Zaken: ${HZ.titel}`), 'de weekshow staat bij andere')
  assert.equal(r.byStory.get(CRISIS.id).showId, 'nrc-vandaag')
  assert.ok(r.byStory.get(CRISIS.id).andere.some((a) => a.showId === 'nrc-haagse-zaken'))
  // En dezelfde aflevering hoort bij geen ander verhaal.
  assert.equal(r.rows.koppelingen.filter((k) => k.aflevering === HZ.titel).length, 0)
  // Alleen de weekshow ja: dan krijgt het verhaal de weekshow.
  const alleen = await ronde((v) => (isHZ(v) ? VERDIEPING : NEE))
  assert.equal(alleen.r.rows.koppelingen.find((k) => k.verhaal === CRISIS.id)?.show, 'NRC Haagse Zaken')
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
  const gelinkt = { ...variant('w-link', 'De VVD en een kabinetsval in slow-motion', 'De week in Den Haag: de VVD stemde tegen het Belastingplan van het kabinet-Jetten.'), links: [nrc.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')] }
  const p = paren({ ...OPTS, episodes: [gelinkt] })
  const c = p.paren.find((c) => c.x.st.id === CRISIS.id)
  assert.ok(c)
  assert.equal(c.linked, true)
  assert.equal(c.e.weekMeer, true)
  assert.equal(vangnet(c, NOW), null, 'het weekoverzicht geldt alleen zonder artikellink')
  assert.equal(c.o.grond, 'link')
  assert.ok(c.o.soort, c.o.af)
})

// Koerswijziging 15 november: het oordeel komt van De Redacteur, de woordregels zijn alleen vangnet. Alleen een paar
// ondubbelzinnige vormen van een weekoverzicht houdt het vangnet hard tegen (HARD), ook bij een ja van het model. De rest
// (MODEL) ziet het vangnet bewust niet, want zulke woorden en tekens staan ook in een aflevering over één zaak; daar is het
// model de poort: eenOnderwerp "nee" houdt de aflevering tegen. Derde keuring: "deze week", "wat een week", "de week van",
// "en verder", "onderwerpen", "&", "/", "Dan:" en "En:" horen bij MODEL.
const ZIN = 'De VVD stemde tegen het Belastingplan van het kabinet-Jetten.'
const HARD = [
  ['titel-week-in', 'De week in Den Haag', ZIN],
  ['titel-weekoverzicht', 'Weekoverzicht', ZIN],
  ['weekjournaal', 'Kabinet-Jetten wankelt', `In het weekjournaal: ${ZIN}`],
  ['terugblik', 'Kabinet-Jetten wankelt', `Een terugblik op de week. ${ZIN}`],
  ['tweede-onderwerp', 'Een kabinetsval in slow-motion?', `${ZIN} Tweede onderwerp: de stikstofwet.`],
  ['nog-een-onderwerp', 'Een kabinetsval in slow-motion?', `${ZIN} Dan nog een onderwerp: de stikstofwet.`],
  ['lijst-bolletjes', 'Kabinet-Jetten wankelt', 'In deze aflevering: • de VVD stemt tegen het Belastingplan van het kabinet-Jetten • het asieldebat • de stikstofwet'],
  ['lijst-begin', 'Kabinet-Jetten wankelt', '• De VVD stemt tegen het Belastingplan van het kabinet-Jetten • Het asieldebat'],
].map(([id, titel, tekst]) => variant(`h-${id}`, titel, tekst))
const MODEL = [
  ['titel-komma', 'Kabinetscrisis, asiel', ZIN],
  ['titel-en', 'Het kabinet-Jetten en de stikstofwet', ZIN],
  ['titel-gedachtestreep', 'Kabinet-Jetten wankelt - en de stikstof', ZIN],
  ['titel-tweede-zin', 'Valt het kabinet? En wat met de stikstof?', ZIN],
  ['titel-strepen', 'Kabinetscrisis | stikstof | NAVO-top', ZIN],
  ['titel-puntkomma', 'Het Belastingplan; de stikstof', ZIN],
  ['titel-schuin', 'Kabinetscrisis / stikstof', ZIN],
  ['titel-ampersand', 'Kabinetscrisis & asiel', ZIN],
  ['titel-plus', 'Kabinet-Jetten wankelt + stikstof', ZIN],
  ['ook-over', 'Kabinet-Jetten wankelt', `${ZIN} Ook over het asieldebat.`],
  ['ook-dubbelepunt', 'Een kabinetsval in slow-motion?', `${ZIN} Ook: het asieldebat.`],
  ['plus', 'Een kabinetsval in slow-motion?', `${ZIN} Plus: de stikstofwet.`],
  ['en-dan-nog', 'Kabinet-Jetten wankelt', `${ZIN} En dan nog de stikstofwet.`],
  ['telling', 'Kabinet-Jetten wankelt', `${ZIN} Twee: het asieldebat. Drie: de stikstofwet.`],
  ['week-vol', 'Kabinet-Jetten wankelt', `Het was een week vol politiek nieuws. ${ZIN}`],
  ['en-natuurlijk', 'Kabinet-Jetten wankelt', `${ZIN} En natuurlijk het asieldebat.`],
  ['daarna', 'Kabinet-Jetten wankelt', `${ZIN} Daarna het asieldebat.`],
  ['ook-midden', 'Kabinet-Jetten wankelt', `${ZIN} Het gaat ook over het asieldebat.`],
  ['met-twee', 'Kabinet-Jetten wankelt', `${ZIN} Met: het asieldebat, de stikstofwet.`],
  ['puntkomma', 'Een kabinetsval in slow-motion?', 'In deze aflevering: de VVD tegen het Belastingplan van het kabinet-Jetten; de stikstofwet; het asieldebat.'],
  ['lijst-regels', 'Kabinet-Jetten wankelt', `In deze aflevering:\n${ZIN}\nHet asieldebat\nDe stikstofwet`],
].map(([id, titel, tekst]) => variant(`m-${id}`, titel, tekst))
// De gevallen van de derde keuring: een gewone zin of titel over één onderwerp die het vangnet hard tegenhield. Elk is een
// kleine wijziging van de echte Haagse Zaken van 14 november (zelfde show, tijd en links), of een eigen zin.
const ECHT = HZ.samenvatting
const VALS_TEKST = [
  ECHT.replace('deze knotsgekke week', 'deze week'),
  ECHT.replace('deze knotsgekke week', 'de afgelopen week'),
  `${ECHT} Lees al onze verhalen over de kabinetscrisis van deze week hier.`,
  ECHT.replace('Dit weekend praten ze verder.', 'De coalitiepartijen willen praten en verder onderhandelen.'),
  `${ECHT} Het wordt de week van de waarheid voor het kabinet-Jetten.`,
  `${ECHT} De week begon met een ultimatum van de VVD.`,
  `${ECHT} Het kabinet beleefde een week waarin alles misging.`,
  `${ECHT} Ten eerste wil de VVD opnieuw onderhandelen.`,
  `${ECHT} Dan: de vraag of het kabinet het weekend overleeft.`,
  `${ECHT} En: kan Jetten nog verder?`,
  `${ECHT} De VVD wil heronderhandelen over onderwerpen als asiel en wonen.`,
  `${ECHT} Met verslaggever Janne Chaudron (Trouw • politiek).`,
  'Deze week stemde de VVD tegen het Belastingplan van het kabinet-Jetten. Hoe nu verder?',
  'Afgelopen week stemde regeringspartij VVD tegen het belastingplan.',
  'In deze aflevering kijken we terug op hoe de VVD deze week tegen het belastingplan stemde.',
  'De onderwerpen waarover de coalitie ruziet: geld en asiel.',
  'Wat een week voor het kabinet-Jetten: de VVD stemde tegen het belastingplan.',
  'Een week waarin het kabinet-Jetten bijna viel.',
  'De VVD stemde tegen het belastingplan. Ook: wat betekent dit voor Jetten?',
  'Dan: de vraag of het kabinet kan doorgaan.',
]
const VALS_TITEL = ['Hoe de VVD het kabinet deze week op het spel zette', 'De VVD & het belastingplan', 'Rutte & Jetten', 'Jetten & Yeşilgöz', 'Kabinet-Jetten: val of doorstart? / NRC', 'De week van de waarheid voor Jetten', 'Wat een week voor Jetten']

test('het vangnet: alleen ondubbelzinnige vormen van een weekoverzicht; de echte afleveringen van 14 november blijven één onderwerp', () => {
  for (const e of HARD) assert.equal(weekOverzicht(e), true, `${e.id}: ${e.titel} / ${e.samenvatting}`)
  for (const e of MODEL) assert.equal(weekOverzicht(e), false, `${e.id}: ${e.titel} / ${e.samenvatting}`)
  // De echte afleveringen van 14 november (het Haags Halfuurtje: "Val in slowmotion of doorstart? Zo escaleerde de
  // kabinetscrisis" is geen opsomming).
  for (const e of FIX.episodes.filter((e) => e.show === 'nrc-haagse-zaken' || e.show === 'trouw-haags-halfuurtje')) assert.equal(weekOverzicht(e), false, e.titel)
  // Woorden die ook in een verhaal over één zaak staan, houdt het vangnet niet tegen (dat doet het model).
  for (const samenvatting of [
    ...VALS_TEKST,
    `${ZIN} De coalitie praat ook dit weekend verder.`,
    `${ZIN} Daarna stapte fractievoorzitter Yeşilgöz op de VVD-fractie af.`,
    `${ZIN} Ondertussen wankelt het kabinet, maar ook D66 twijfelt.`,
    `${ZIN} De VVD – de grootste partij – stemde tegen.`,
    `${ZIN} Ook de VVD zelf is verdeeld.`,
    'Jetten, Yeşilgöz en Bontenbal zitten in Hilversum om het kabinet te redden.',
  ]) assert.equal(weekOverzicht({ titel: 'Een kabinetsval in slow-motion?', samenvatting }), false, samenvatting)
  for (const titel of [...VALS_TITEL, 'Rob Jetten en de VVD', 'Kabinet-Jetten, wat nu?', 'Val in slowmotion of doorstart?']) assert.equal(weekOverzicht({ titel, samenvatting: ZIN }), false, titel)
  // NRC Wereldzaken: "Deze week in Kyiv" is een tijd, geen weekoverzicht.
  assert.equal(weekOverzicht({ titel: 'De oorlog in Oekraïne', samenvatting: 'Deze week in Kyiv: de stroom valt uit door Russische aanvallen.' }), false)
})

test('derde keuring: een kleine wijziging van de echte Haagse Zaken blijft kandidaat, gaat naar het model en koppelt bij een ja', async () => {
  // (De losse zinnen hierboven noemen het verhaal vaak niet genoeg om kandidaat te zijn; hier de wijzigingen van de echte tekst.)
  const echt = VALS_TEKST.filter((t) => t.includes('wervelstorm') || t.startsWith(ECHT.slice(0, 40)))
  const varianten = [...echt.map((t, k) => variant(`v-tekst-${k}`, HZ.titel, t)), ...VALS_TITEL.map((t, k) => variant(`v-titel-${k}`, t, ECHT))]
  const p = paren({ ...OPTS, episodes: [...FIX.episodes.filter((x) => x.id !== HZ.id), ...varianten] })
  for (const e of varianten) {
    const c = p.paren.find((c) => c.e.id === e.id && c.x.st.id === CRISIS.id)
    assert.ok(c, `${e.id} is een kandidaat: ${e.titel} / ${e.samenvatting}`)
    assert.equal(c.e.weekMeer, false, e.id)
    assert.equal(c.o.hard, undefined, `${e.id}: geen harde uitsluiting (${c.o.af})`)
    assert.equal(vangnet(c, NOW), null, e.id)
  }
  // Eén voor één (één aflevering per verhaal): het model zegt ja, dan koppelt de variant.
  for (const e of [varianten[0], varianten[1], varianten[echt.length + 1]]) {
    const { r, gevraagd } = await ronde((v) => (v.show.endsWith('weekshow') && v.titel === e.titel && v.beschrijving === e.samenvatting ? VERDIEPING : NEE), [...FIX.episodes.filter((x) => x.id !== HZ.id && x.show !== 'trouw-haags-halfuurtje'), e])
    assert.ok(gevraagd.some((v) => v.beschrijving === e.samenvatting), `${e.id} is gevraagd`)
    assert.equal(r.rows.koppelingen.find((k) => k.verhaal === CRISIS.id)?.aflevering, e.titel, e.id)
  }
})

test('derde keuring: de naam van een gast of maker in één aflevering houdt een weekshow niet hard tegen (het model beslist)', async () => {
  const HH = FIX.episodes.find((e) => e.show === 'trouw-haags-halfuurtje' && /Val in slowmotion/.test(e.titel))
  const gasten = [
    { ...HZ, id: 'g-met', samenvatting: `${HZ.samenvatting} Met Floor Rusman en Guus Valk.` },
    { ...HZ, id: 'g-presentatie', samenvatting: `${HZ.samenvatting} Presentatie: Floor Rusman.` },
    { ...HH, id: 'g-verslaggever', samenvatting: `${HH.samenvatting} Met verslaggever Janne Chaudron.` },
  ]
  for (const e of gasten) {
    const c = paren({ ...OPTS, episodes: [e] }).paren.find((c) => c.x.st.id === CRISIS.id)
    assert.ok(c, `${e.id} is een kandidaat`)
    assert.equal(c.o.hard, undefined, `${e.id}: ${c.o.af}`)
    assert.equal(vangnet(c, NOW), null, e.id)
    const { r, gevraagd } = await ronde((v) => (v.beschrijving === e.samenvatting ? VERDIEPING : NEE), [...FIX.episodes.filter((x) => x.id !== HZ.id && x.id !== HH.id), e])
    assert.ok(gevraagd.some((v) => v.beschrijving === e.samenvatting), `${e.id} is gevraagd`)
    assert.equal(r.rows.koppelingen.find((k) => k.verhaal === CRISIS.id)?.aflevering, e.titel, e.id)
  }
})

for (const e of HARD) {
  test(`het vangnet: ${e.id} valt hard af, ook bij een ja en een verdieping van het model`, async () => {
    for (const oordeel of [JA, VERDIEPING]) {
      const { r, gevraagd } = await ronde(() => oordeel, [...FIX.episodes.filter((x) => x.id !== HZ.id), e])
      assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === e.titel || (k.andere || []).some((a) => a.endsWith(e.titel))), `${e.id}: niet gekoppeld`)
      assert.ok(r.rows.afgevallen.some((a) => a.verhaal === CRISIS.id && a.aflevering === e.titel && /^weekshow zonder artikellink: |^deze aflevering gaat over meer onderwerpen/.test(a.reden)), `${e.id}: hard af bij het crisisverhaal`)
      assert.ok(!gevraagd.some((v) => v.titel === e.titel), `${e.id}: niet eens gevraagd`)
    }
    const c = paren({ ...OPTS, episodes: [e] }).paren.find((c) => c.x.st.id === CRISIS.id)
    assert.ok(c, `${e.id} is een kandidaat`)
    assert.equal(c.e.weekMeer, true)
    if (!c.e.meer) assert.equal(vangnet({ ...c, o: { ...c.o, hard: false } }, NOW), 'weekshow zonder artikellink: de aflevering bespreekt de week of meer onderwerpen')
  })
}

test('het model is de poort: eenOnderwerp nee houdt een weekshow tegen, ook als het vangnet niets ziet', async () => {
  const nee = { ...VERDIEPING, eenOnderwerp: 'nee' }
  // De echte aflevering: het vangnet ziet niets, het model zegt dat er een tweede onderwerp is.
  const echt = await ronde((v) => (isHZ(v) ? nee : NEE))
  assert.ok(echt.gevraagd.some(isHZ), 'Haagse Zaken is gevraagd')
  assert.ok(!echt.r.rows.koppelingen.some((k) => k.show === 'NRC Haagse Zaken' || (k.andere || []).some((a) => a.startsWith('NRC Haagse Zaken'))))
  assert.ok(echt.r.rows.afgevallen.some((a) => a.verhaal === CRISIS.id && a.show === 'NRC Haagse Zaken' && /één onderwerp nee/.test(a.reden)))
  // En de varianten met een tweede onderwerp die het vangnet bewust niet ziet.
  for (const e of MODEL) {
    const { r } = await ronde((v) => (v.titel === e.titel ? nee : NEE), [...FIX.episodes.filter((x) => x.id !== HZ.id), e])
    assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === e.titel || (k.andere || []).some((a) => a.endsWith(e.titel))), `${e.id}: niet gekoppeld`)
    assert.ok(r.rows.afgevallen.some((a) => a.verhaal === CRISIS.id && a.aflevering === e.titel), `${e.id}: afgevallen bij het crisisverhaal`)
  }
})

test('het model is de poort: zonder eenOnderwerp ja (ontbreekt, of iets anders) geen koppeling, ook uit de opslag', async () => {
  assert.equal(weekPoort(VERDIEPING), true)
  assert.equal(weekPoort(JA), true)
  for (const v of [{ ...VERDIEPING, eenOnderwerp: undefined }, { ...VERDIEPING, eenOnderwerp: null }, { ...VERDIEPING, eenOnderwerp: 'nee' }, { ...VERDIEPING, eenOnderwerp: 'misschien' }, { ...VERDIEPING, zeker: undefined }, { ...VERDIEPING, zeker: 'nee' }, NEE, null]) assert.equal(weekPoort(v), false, JSON.stringify(v))
  // Een bewaard oordeel zonder eenOnderwerp (een oudere opslag): het paar wordt niet opnieuw gevraagd en koppelt niet.
  const c = paren(OPTS).paren.find((c) => c.e.id === HZ.id && c.x.st.id === CRISIS.id)
  assert.ok(c)
  for (const een of [null, 'misschien']) {
    const opslag = { v: 1, o: { [paarKey(c)]: ['verdieping', een, 'ja', 'oud oordeel', NOW, 'nee', 'nee'] } }
    const { r, gevraagd } = await ronde(() => NEE, FIX.episodes, opslag)
    assert.ok(!gevraagd.some(isHZ), 'uit de opslag, niet opnieuw gevraagd')
    assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === HZ.titel || (k.andere || []).some((a) => a.endsWith(HZ.titel))), String(een))
    assert.ok(r.rows.afgevallen.some((a) => a.verhaal === CRISIS.id && a.aflevering === HZ.titel && /^oordeel: /.test(a.reden)), String(een))
  }
  // Een antwoord van het model zonder eenOnderwerp telt niet als oordeel: geen koppeling.
  const { eenOnderwerp, ...zonder } = VERDIEPING
  const los = await ronde((v) => (isHZ(v) ? zonder : NEE))
  assert.ok(!los.r.rows.koppelingen.some((k) => k.aflevering === HZ.titel))
})

test('de vraag: bij een weekshow is één tweede onderwerp, ook een korte vermelding, eenOnderwerp nee', () => {
  assert.match(OORDEEL_SYSTEM, /Bij een weekshow is één tweede onderwerp al genoeg voor eenOnderwerp "nee": ook een korte vermelding, een opsomming, een lijstje of een "ook nog"/)
  assert.equal(OORDEEL_KEY, 'luister-oordeel-v8', 'v8: breder (18 november); de regel voor de weekshow blijft')
})

test('een andere naam in de titel of de beschrijving (Trump): het model is de poort, eenOnderwerp nee houdt tegen', async () => {
  const tekst = `${ZIN} Trump kondigt nieuwe tarieven aan.`
  const metTitel = variant('p-titel-trump', 'Kabinet-Jetten wankelt, en Trump', tekst)
  const zonder = variant('p-trump', 'Kabinet-Jetten wankelt', tekst)
  // Alleen in de titel: de titel wordt zelf ook gelezen (andereNaam), maar als aanwijzing, niet als harde eis.
  const alleenTitel = variant('p-alleen-titel', 'Kabinet-Jetten wankelt onder druk van Trump', ZIN)
  for (const e of [metTitel, zonder, alleenTitel]) {
    const c = paren({ ...OPTS, episodes: [e] }).paren.find((c) => c.x.st.id === CRISIS.id)
    assert.ok(c, `${e.id} is een kandidaat`)
    assert.equal(vangnet(c, NOW), null, e.id)
    const { r, gevraagd } = await ronde((v) => (v.titel === e.titel ? { ...VERDIEPING, eenOnderwerp: 'nee' } : NEE), [...FIX.episodes.filter((x) => x.id !== HZ.id), e])
    assert.ok(gevraagd.some((v) => v.titel === e.titel), `${e.id} is gevraagd`)
    assert.ok(!r.rows.koppelingen.some((k) => k.aflevering === e.titel), `${e.id}: niet gekoppeld`)
  }
  assert.match(paren({ ...OPTS, episodes: [zonder] }).paren.find((c) => c.x.st.id === CRISIS.id).o.af, /naam buiten het verhaal \(Trump\)/)
  assert.match(paren({ ...OPTS, episodes: [alleenTitel] }).paren.find((c) => c.x.st.id === CRISIS.id).o.af, /naam buiten het verhaal \(Trump\)/)
})

test('de echte weekshows van 14 november (Haagse Zaken, Haags Halfuurtje) worden nog kandidaat bij het crisisverhaal', async () => {
  const HH = FIX.episodes.find((e) => e.show === 'trouw-haags-halfuurtje' && /Val in slowmotion/.test(e.titel))
  assert.ok(HH)
  const p = paren(OPTS)
  for (const e of [HZ, HH]) {
    const c = p.paren.find((c) => c.e.id === e.id && c.x.st.id === CRISIS.id)
    assert.ok(c, `${e.titel} is een kandidaat`)
    assert.equal(c.e.weekMeer, false, e.titel)
    assert.equal(vangnet(c, NOW), null, e.titel)
  }
  // Alleen de weekshows ja: Haagse Zaken (de nieuwste) krijgt het verhaal, het Haags Halfuurtje staat bij andere.
  const { r, gevraagd } = await ronde((v) => (v.show.endsWith('weekshow') ? VERDIEPING : NEE))
  for (const e of [HZ, HH]) assert.ok(gevraagd.some((v) => v.titel === e.titel), `${e.titel} is gevraagd`)
  const k = r.rows.koppelingen.find((k) => k.verhaal === CRISIS.id)
  assert.equal(k.show, 'NRC Haagse Zaken')
  assert.ok(k.andere.some((a) => /^Haags Halfuurtje: Val in slowmotion/.test(a)), 'het Haags Halfuurtje staat bij de andere')
})
