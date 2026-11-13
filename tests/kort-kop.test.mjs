import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kortKop, metKorteKoppen, veilig, controle, herschrevenVan, KORT_MAX } from '../shared/kort-kop.mjs'

// tests/fixtures/kort-kop.json wordt ook door iOS gelezen (KortKopTests): dezelfde uitkomst op beide.
const fx = JSON.parse(readFileSync(new URL('./fixtures/kort-kop.json', import.meta.url), 'utf8'))
const MATEN = [60, 56, 52, 48, 45, 44, 40, 36, 32, 28, 24]
const schoonKop = (s) => s.replace(/[​-‍﻿]/gu, '').replace(/[\s\u0085]+/gu, ' ').trim()

test('korte kop: dezelfde uitkomst als de gedeelde gevallen', () => {
  assert.equal(fx.max, KORT_MAX)
  assert.ok(fx.gevallen.length >= 600)
  // `max` per geval: de kortere stappen van vroeger. `verwacht: null`: de kop past niet, hij staat heel.
  for (const c of fx.gevallen) assert.equal(kortKop(c.kop, c.max ?? KORT_MAX), c.verwacht, `${c.kop} (${c.max ?? KORT_MAX})`)
})

test('korte kop zonder taalmodel: nooit ingekort, op elke maat', () => {
  // Een eigen controle, los van de code: de uitkomst is de kop zelf (die past), of null. Nooit een beletselteken
  // dat de kop niet zelf had, nooit een woord minder.
  for (const c of fx.gevallen) {
    const t = schoonKop(c.kop)
    for (const max of MATEN) {
      const k = kortKop(c.kop, max)
      if (t.length <= max) assert.equal(k, t, `${c.kop} (${max})`)
      else assert.equal(k, null, `${c.kop} (${max}) → ${k}`)
      if (k !== null && max <= KORT_MAX) assert.ok(veilig(c.kop, k), `${c.kop} (${max})`)
    }
  }
})

test('korte kop: wat keuring 9 vond, wordt zonder taalmodel nooit ingekort', () => {
  const heel = [
    // 1. Een tweede bewering met en/and, ook een die de eerste tegenspreekt.
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag en premier noemt dat bericht nepnieuws',
    'Prime minister resigns after crisis talks in Downing Street and then withdraws his resignation',
    'Ajax wint in de slotfase van de topper tegen PSV desondanks verliest de club de titel',
    // 2. Scheidingstekens buiten elke lijst.
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag | De Speld',
    'Prime minister resigns after crisis talks in Downing Street | The Onion',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag：premier spreekt het tegen',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag， premier weerspreekt dat bericht',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag ‒ premier weerspreekt dat bericht',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag • premier weerspreekt dat bericht',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag--premier weerspreekt dat bericht',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag 【bericht ingetrokken door krant】',
    // 3. Voorwaarde of uitzondering zonder woord uit een lijst.
    'Gemeente Amsterdam verbiedt vuurwerk in de hele stad met uitzondering van het Museumplein',
    'Kabinet valt deze week over de asielwet van minister Faber mocht de PVV toch tegenstemmen',
    'Merger of KLM and Air France goes ahead next spring pending approval from the European Commission',
    'Fed cuts interest rates by half a point in December as long as inflation keeps falling',
    // 4. Bijna-ontkenningen.
    'Ajax haalt na een rampzalige seizoensstart de Europese plaatsen in de eredivisie ternauwernood',
    'Government meets its 2030 climate targets according to the watchdog report virtually',
    // 5. Een bron die de bewering ontkracht.
    'Prime minister resigns after crisis talks in Downing Street according to a fake BBC report',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag volgens satirische site De Speld',
    'Vaccines cause autism in young children according to a debunked study from 1998',
    // 6. Een combinerend teken na een spatie (web en iOS gelijk).
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag en premier treedt ́niet af vandaag',
    // 7. Het eind van één bewering draagt de betekenis (ook live).
    'Autistic teen missing in Australian bushland for 6 days rescued alive',
    'Rechter wijst de eis van Greenpeace tegen Shell over de uitstoot in hoger beroep af',
    'Kabinet stelt de verhoging van de AOW-leeftijd naar 68 jaar voor de tweede keer uit',
    // Ook een label vooraan maakt geen uitzondering meer.
    'Nepnieuws: kabinet is gevallen na urenlang crisisberaad in Den Haag over de asielwet',
  ]
  for (const kop of heel) for (const max of MATEN) assert.equal(kortKop(kop, max), null, `${kop} (${max})`)
  // Ook een ingekorte kop van een oudere server telt niet.
  assert.equal(veilig('Autistic teen missing in Australian bushland for 6 days rescued alive', 'Autistic teen missing in Australian bushland for 6 days…'), false)
  assert.equal(veilig('Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis', 'Iraanse dreiging is zó groot dat Amerikaanse minister…'), false)
})

test('korte kop: een kop die past blijft precies zo', () => {
  assert.equal(KORT_MAX, 45)
  const past = 'Een kop van 45 tekens die nog net past, fijn!'
  assert.equal(past.length, 45)
  assert.equal(kortKop(past), past)
  assert.equal(veilig(past, past), true)
  assert.equal(kortKop(`${past}!`), null)
  assert.equal(kortKop('Kop die eindigt op een eigen beletselteken…'), 'Kop die eindigt op een eigen beletselteken…')
  assert.equal(veilig('Korte kop', null), false)
  assert.equal(kortKop(''), '')
  assert.equal(kortKop(null), '')
})

test('korte kop: onzichtbare tekens vallen weg, U+0085 (NEL) is witruimte, net als op iOS', () => {
  assert.equal(kortKop('Kop met​ onzichtbaar﻿ teken'), 'Kop met onzichtbaar teken')
  assert.equal(kortKop('Kop met\u0085teken'), 'Kop met teken')
  assert.equal(veilig('Kop met\u0085teken', 'Kop met teken'), true)
})

test('metKorteKoppen: per plek de kop als hij past, de rest ongemoeid', () => {
  const lang = 'Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis'
  const ed = {
    id: '2026-11-11-middag',
    entries: [{ kind: 'story', id: 's1', leadId: 'a' }, { kind: 'item', id: 'b' }, { kind: 'item', id: 'zonder' }, { kind: 'story', id: 's2', leadId: 'x', title: 'Getoonde kop van De Redacteur' }],
    items: [{ id: 'a', title: lang }, { id: 'b', title: 'Korte kop' }],
  }
  const uit = metKorteKoppen(ed)
  // Past niet: geen korte kop, de widget toont de hele kop.
  assert.equal('kortKop' in uit.entries[0], false)
  assert.equal(uit.entries[1].kortKop, 'Korte kop')
  assert.equal('kortKop' in uit.entries[2], false)
  assert.equal(uit.entries[3].kortKop, 'Getoonde kop van De Redacteur')
  assert.equal(uit.items, ed.items)
  assert.equal(ed.entries[1].kortKop, undefined) // het origineel blijft zoals het was
  assert.equal(metKorteKoppen(null), null)
  // Met herschreven koppen (kort-kop-ai.mjs): alleen een die door de controle komt.
  const met = metKorteKoppen(ed, { herschreven: { [lang]: 'Iraanse dreiging: minister moet naar basis' } })
  assert.equal(met.entries[0].kortKop, 'Iraanse dreiging: minister moet naar basis')
  const fout = metKorteKoppen(ed, { herschreven: { [lang]: 'Iraanse dreiging is zó groot dat Amerikaanse…' } })
  assert.equal('kortKop' in fout.entries[0], false)
  const nul = metKorteKoppen(ed, { herschreven: { [lang]: null } })
  assert.equal('kortKop' in nul.entries[0], false)
  // Een persoonlijke Editie neemt de herschreven korte kop over van de algemene.
  assert.deepEqual(herschrevenVan(met), { [lang]: 'Iraanse dreiging: minister moet naar basis' })
  assert.deepEqual(herschrevenVan(uit), {})
})

test('herschreven korte kop: dezelfde controle als iOS (gedeelde gevallen)', () => {
  assert.ok(fx.herschreven.length >= 20)
  for (const c of fx.herschreven) {
    assert.equal(veilig(c.kop, c.kort), c.veilig, `${c.kort} (${c.waarom})`)
    if (c.veilig) assert.ok(schoonKop(c.kort).length <= KORT_MAX)
  }
})

test('herschreven korte kop: de controle los nagelopen', () => {
  const kop = 'Kabinet stelt de verhoging van de AOW-leeftijd naar 68 jaar voor de tweede keer uit'
  assert.equal(controle(kop, 'Kabinet stelt AOW-leeftijd 68 opnieuw uit'), true)
  assert.equal(controle(kop, 'Kabinet stelt AOW-leeftijd 69 opnieuw uit'), false, 'nieuw getal')
  assert.equal(controle(kop, 'Kabinet stelt AOW-leeftijd 68 never uit'), false, 'ontkenning erbij')
  assert.equal(controle(kop, 'Kabinet stelt de verhoging van de AOW-leeftijd'), false, 'het begin van de kop')
  assert.equal(controle(kop, 'Kabinet stelt de verhoging van de AOW-leeftijd.'), false, 'het begin, met een punt')
  assert.equal(controle(kop, 'Schoof stelt AOW-leeftijd 68 opnieuw uit'), false, 'een nieuwe naam als eerste woord (keuring B2)')
  assert.equal(controle(kop, 'AOW: Schoof stelt 68 opnieuw uit'), false, 'ook na een dubbele punt')
  assert.equal(controle(kop, 'Kabinet stelt verhoging AOW-leeftijd 68 jaar'), false, 'alleen weglatingen: ingekort (keuring B1)')
  assert.equal(controle(kop, 'Kabinet en Schoof stellen AOW 68 uit'), false, 'een nieuwe naam midden in de kop')
  assert.equal(controle(kop, null), false)
  assert.equal(controle(kop, '   '), false)
  assert.equal(controle("Prime minister doesn't resign after crisis talks in Downing Street", 'PM stays after crisis talks'), false, "n't is een ontkenning")
  assert.equal(controle("Prime minister doesn't resign after crisis talks in Downing Street", "Minister doesn't quit after crisis talks"), true)
})
