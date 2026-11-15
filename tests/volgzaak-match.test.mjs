// Volgen 1.5, bouwplanstap 1.4: de matcher op verhaalniveau. Zeker bij de naam in de kop bij twee of meer uitgevers,
// anders twijfel. Aliassen, namen van meer woorden, samenstellingen, uitsluitingen, de NOS-familie als één uitgever,
// een algemeen woord alleen met een tweede naam, een los stuk hooguit twijfel, een aflevering geen uitgever, en een Haags
// dossier als één bundel.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchVerhalen, kopOordeel, bereidVoor, haagseBundels, ZEKER_UITGEVERS } from '../netlify/lib/volgzaak-match.mjs'

const T = Date.parse('2026-11-20T10:00:00Z')
let n = 0
const stuk = (bron, kop, storyId, extra = {}) => ({ id: `i${++n}`, t: T - n * 6e4, bron, kop, url: `https://x/${n}`, storyId, lang: 'nl', afl: false, haags: false, dag: '2026-11-20', ...extra })
const GTA = { slug: 'gta-6', label: 'GTA 6', namen: { nl: ['GTA 6'], en: ['Grand Theft Auto VI'] }, aliassen: ['GTA VI'], context: ['Rockstar'], uit: ['oudere GTA-delen'], algemeen: ['GTA'] }

test('zeker bij twee uitgevers met de naam in de kop; twijfel bij één', () => {
  assert.equal(ZEKER_UITGEVERS, 2)
  const m = matchVerhalen(GTA, [stuk('nos', 'Releasedatum GTA 6 bekend', 's1'), stuk('tweakers', 'Rockstar noemt datum voor Grand Theft Auto VI', 's1'), stuk('nu', 'GTA VI komt in mei', 's2'), stuk('nu', 'Weer een ander verhaal', 's2')])
  assert.equal(m.get('s1').oordeel, 'z')
  assert.equal(m.get('s1').pubs, 2)
  assert.equal(m.get('s2').oordeel, 't')
  assert.deepEqual(m.get('s2').stukken.length, 2, 'het hele verhaal, ook het stuk zonder naam')
})

test('tien stukken over één trailer zijn één treffer', () => {
  const bronnen = ['nos', 'nu', 'rtl', 'ad', 'telegraaf', 'volkskrant', 'nrc', 'tweakers', 'trouw', 'parool']
  const m = matchVerhalen(GTA, bronnen.map((b) => stuk(b, `Nieuwe trailer van GTA 6 (${b})`, 'trailer')))
  assert.equal(m.size, 1)
  assert.equal(m.get('trailer').pubs, 10)
})

test('de NOS-familie telt als één uitgever', () => {
  const m = matchVerhalen(GTA, [stuk('nos', 'GTA 6 uitgesteld', 's1'), stuk('nos-economie', 'Uitstel GTA 6 kost Take-Two miljarden', 's1')])
  assert.equal(m.get('s1').oordeel, 't')
  assert.equal(m.get('s1').pubs, 1)
})

test('een uitsluiting telt niet; een algemeen woord alleen met een tweede naam of een contextwoord', () => {
  const vb = bereidVoor(GTA)
  assert.equal(kopOordeel(vb, 'Oudere GTA-delen weer populair').oordeel, null)
  assert.equal(kopOordeel(vb, 'GTA trekt nog altijd spelers').oordeel, 'zwak')
  assert.equal(kopOordeel(vb, 'Rockstar werkt aan nieuwe GTA').oordeel, 'raak')
  assert.equal(kopOordeel(vb, 'GTA 6 krijgt releasedatum').oordeel, 'raak')
  // Alleen zwakke koppen, ook bij twee uitgevers: twijfel.
  const m = matchVerhalen(GTA, [stuk('nos', 'GTA trekt nog altijd spelers', 's1'), stuk('nu', 'Spelers blijven GTA trouw', 's1')])
  assert.equal(m.get('s1').oordeel, 't')
})

test('een samenstelling met een lange naam telt ("formatiegesprek")', () => {
  const formatie = { slug: 'kabinetsformatie', label: 'Kabinetsformatie', namen: { nl: ['formatie', 'kabinetsformatie', 'informateur'], en: [] }, aliassen: [], context: [], uit: [], algemeen: [] }
  const m = matchVerhalen(formatie, [stuk('nos', 'Formatiegesprekken gaan door', 's1'), stuk('nu', 'Informateur spreekt met fracties', 's1')])
  assert.equal(m.get('s1').oordeel, 'z')
})

test('een los stuk zonder verhaal is hooguit twijfel; een aflevering is geen uitgever', () => {
  const m = matchVerhalen(GTA, [stuk('nos', 'GTA 6 uitgesteld', null), stuk('nu', 'Podcast: wat betekent uitstel GTA 6?', 's3', { afl: true }), stuk('nos', 'Uitstel van GTA 6', 's3')])
  const los = [...m.keys()].find((k) => k.startsWith('los:'))
  assert.equal(m.get(los).oordeel, 't')
  assert.equal(m.get('s3').oordeel, 't')
  assert.equal(m.get('s3').pubs, 1)
})

test('een Haags dossier telt als één bundel: een verhaal met een Haags stuk uit het dossier is zeker', () => {
  const bronnen = ['nos', 'nu', 'rtl', 'telegraaf', 'volkskrant']
  const haags = bronnen.map((b, i) => stuk(b, `Kamer ruziet over Belastingplan (${i})`, `h${i}`, { haags: true }))
  const def = { slug: 'belastingplan', label: 'Belastingplan', namen: { nl: ['Belastingplan'], en: [] }, aliassen: [], context: [], uit: [], algemeen: [] }
  const bundels = haagseBundels(haags)
  assert.equal(bundels.get('belastingplan'), 5)
  const m = matchVerhalen(def, haags)
  for (let i = 0; i < 5; i++) assert.equal(m.get(`h${i}`).oordeel, 'z', `verhaal h${i}`)
  // Zonder dossier (drie uitgevers) blijft elk verhaal van één uitgever twijfel.
  const m2 = matchVerhalen(def, haags.slice(0, 3))
  assert.equal(m2.get('h0').oordeel, 't')
})

test('de weergave: de nieuwste kop met de naam, het verhaal en zijn oude ids', () => {
  const m = matchVerhalen(GTA, [stuk('nos', 'GTA 6 krijgt prijs', 's5'), stuk('nu', 'Prijs GTA 6 bekend', 's5')], { verhalen: { s5: { f: ['s4'], d: 'cultuur', n: 4 } } })
  const v = m.get('s5')
  assert.equal(v.desk, 'cultuur')
  assert.deepEqual(v.f, ['s4'])
  assert.equal(v.pubs, 4, 'bij zeker telt het aantal uitgevers van het verhaal')
  assert.match(v.kop, /GTA 6/)
})
