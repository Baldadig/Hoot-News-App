import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kortKop, metKorteKoppen, veilig, ontkenning, KORT_MAX } from '../shared/kort-kop.mjs'

// tests/fixtures/kort-kop.json wordt ook door iOS gelezen (KortKopTests): dezelfde korte kop op beide.
const fx = JSON.parse(readFileSync(new URL('./fixtures/kort-kop.json', import.meta.url), 'utf8'))
const MATEN = [60, 56, 52, 48, 44, 40, 36, 32, 28, 24]
const schoonKop = (s) => s.replace(/[​-‍﻿]/gu, '').replace(/[\s\u0085]+/gu, ' ').trim()

// Een eigen controle van de dichte regel (keuring 8), los van de code: de korte kop is de kop zelf, of de eerste
// woorden ervan met "…". Dat laatste alleen als er (na een label van één woord) nergens een leesteken als grens,
// een voorwaarde of een tegenwoord staat, en als er in wat wegvalt geen ontkenning of bijna-ontkenning staat.
const L = (w) => w.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}]/gu, '')
const ZWAAR = new Set('tenzij behalve als mits indien zolang unless except if provided providing maar terwijl hoewel ofschoon doch echter but while whereas although though yet however'.split(' '))
const BIJNA = new Set('bijna vrijwel haast tevergeefs almost nearly onrechte onterecht wrongly falsely vals valse'.split(' '))
function dicht(kop, k) {
  const t = schoonKop(kop)
  if (k === t) return t.length <= 60 || 'kop zelf, maar te lang'
  if (!k.endsWith('…')) return 'geen beletselteken'
  const a = t.split(' ')
  const b = k.slice(0, -1).split(' ')
  if (b.some((w, i) => (i < b.length - 1 ? w !== a[i] : !a[i].startsWith(w)))) return 'niet het begin van de kop'
  const l = /^\p{L}[\p{L}\p{N}-]*:$/u.test(a[0]) ? 1 : /^[–—-]$/u.test(a[1] || '') && /^\p{L}+$/u.test(a[0]) ? 2 : 0
  const rest = a.slice(l).join(' ')
  if (/[…/[\]()–—]/u.test(rest) || /[.?!;:,](?=[^\p{L}\p{N}]*( |$))/u.test(rest) || / - /u.test(` ${rest} `)) return 'grens'
  if (a.slice(l).some((w) => ZWAAR.has(L(w)))) return 'voorwaarde of tegenwoord'
  if (a.slice(b.length).some((w) => ontkenning(w) || BIJNA.has(L(w)))) return 'ontkenning valt weg'
  if (a.slice(b.length - 1, -1).some((w) => /[’”»"'][^\p{L}\p{N}]*$/u.test(w))) return 'citaat met toeschrijving valt weg'
  if (b.length - l < 2) return 'te kort'
  return true
}

test('korte kop: dezelfde uitkomst als de gedeelde gevallen', () => {
  assert.equal(fx.max, KORT_MAX)
  assert.ok(fx.gevallen.length >= 400)
  // `max` per geval: de kortere stappen van de widget. `verwacht: null`: op die maat geen korte vorm.
  for (const c of fx.gevallen) assert.equal(kortKop(c.kop, c.max ?? KORT_MAX), c.verwacht, `${c.kop} (${c.max ?? KORT_MAX})`)
})

test('korte kop: alleen binnen één bewering, op elke maat (keuring 8)', () => {
  for (const c of fx.gevallen) {
    for (const max of MATEN) {
      const k = kortKop(c.kop, max)
      if (k === null) continue
      assert.ok(k.length <= max, k)
      assert.equal(dicht(c.kop, k), true, `${c.kop} (${max}) → ${k}`)
      assert.ok(veilig(c.kop, k), `${c.kop} (${max}) → ${k}`)
    }
  }
})

test('korte kop: wat keuring 8 vond, staat heel (tegenspraak, voorwaarde, bijna)', () => {
  const heel = [
    // 1. Een tegenspraak via een leesteken of tegenwoord.
    'Kabinet-Schoof gevallen na crisisberaad volgens RTL Nieuws: premier noemt het bericht onzin',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag: premier spreekt het tegen',
    'Ajax wint met 3-0 van PSV in Eindhoven volgens de KNVB: uitslag achteraf ongeldig verklaard',
    'Concert van Taylor Swift in Amsterdam gaat door: gemeente blaast het af vanwege veiligheidsrisico',
    'Tax cuts take effect next year, says Treasury in Washington: Senate votes them down hours later',
    'Kabinet is gevallen na urenlang crisisberaad, premier Schoof weerspreekt dat bericht',
    'Prime minister resigns after crisis talks, BBC reports, Downing Street disputes the report',
    'Kabinet is gevallen na urenlang crisisberaad, meldde De Telegraaf ten onrechte op zondagavond',
    'Prime minister resigns after crisis talks, reports wrongly claimed on Sunday evening in London',
    'Kabinet-Schoof valt na urenlang crisisberaad in Den Haag, aldus een vals bericht op X',
    'Kabinet is gevallen na urenlang crisisberaad maar premier Schoof weerspreekt dat bericht',
    'Prime minister resigns after crisis talks but Downing Street disputes the report entirely',
    'Ajax wint met 3-0 van PSV in Eindhoven terwijl de KNVB de uitslag ongeldig verklaart',
    'Kabinet is gevallen na urenlang crisisberaad… Premier Schoof weerspreekt dat bericht',
    'Prime minister resigns after crisis talks—Downing Street calls the report untrue and wrong',
    'Kabinet is gevallen na urenlang crisisberaad, meldt De Telegraaf. ’s Avonds spreekt de premier het tegen',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag [update: bericht ingetrokken door krant]',
    'Kabinet is gevallen na urenlang crisisberaad in Den Haag (premier: ‘nepnieuws’)',
    'Kabinet is gevallen na urenlang crisisberaad / premier Schoof weerspreekt het bericht',
    // 2. Een voorwaarde of uitzondering.
    'Kabinet valt deze week over de asielwet van minister Faber, tenzij de PVV alsnog instemt',
    'Government will collapse this week over the asylum bill unless the coalition partner backs down',
    'Gemeente Amsterdam verbiedt vuurwerk in de hele stad, behalve op het Museumplein en de Dam',
    'Ajax wordt kampioen van de eredivisie als PSV zondag verliest en Feyenoord gelijkspeelt',
    'Fed cuts interest rates by half a point in December if inflation keeps falling, says Powell',
    'Supermarkten verhogen prijzen voor zuivel en brood per 1 januari, mits de btw stijgt',
    // 3. Bijna-ontkenningen.
    'Ajax wint in de slotfase van de topper tegen PSV in het Philips Stadion bijna',
    'Government meets its 2030 climate targets according to the watchdog report, almost',
    'Kabinet haalt de klimaatdoelen voor 2030 volgens het PBL op een haar na',
  ]
  for (const kop of heel) for (const max of MATEN) assert.equal(kortKop(kop, max), null, `${kop} (${max})`)
  // Zonder komma telt een voorwaarde net zo goed ("Fed cuts … if inflation keeps falling").
  assert.equal(kortKop('Fed cuts interest rates by half a point in December if inflation keeps falling'), null)
  assert.equal(kortKop('Kabinet haalt de klimaatdoelen voor 2030 volgens het Planbureau bijna helemaal', 40), null)
  // Een citaat met een toeschrijving erna: de toeschrijving valt niet weg ("‘…’ zegt de oppositie").
  for (const max of MATEN) assert.equal(kortKop('‘Premier Schoof treedt deze week af na het crisisberaad’ zegt de oppositie in de Tweede Kamer', max), null, `${max}`)
})

test('korte kop: geen uitwijk naar een deel na de dubbele punt, en geen keuze tussen delen (keuring 8)', () => {
  // Wat vroeger B of A werd, staat nu heel.
  for (const kop of [
    'Meteen twee seizoenen tegelijk besteld: Netflix blaast vampierensaga ‘Twilight’ nieuw leven in',
    'Geen bezorgverbod voor Uber Eats in Amsterdam: onvoldoende nagedacht over gevolgen, oordeelt Raad van State',
    '“Ongekende heksenjacht”: advocaten van ‘Slimste Mens’-kandidaat Bruine Mehdi bestrijden zedenfeiten',
    'PSV aast op enorme transferstunt: landskampioen legt contact met Kevin De Bruyne, die in januari weg mag',
    'Wat wil jij weten van de klimaattop in Turkije? Stel je vragen aan onze verslaggever',
    'Kabinet valt over stikstof – oppositie wil nu snel verkiezingen in het voorjaar van volgend jaar',
    'Raad van State: minister van Asiel moet veiligheid Syrië opnieuw beoordelen na nieuwe berichten uit Damascus',
  ]) for (const max of MATEN) assert.equal(kortKop(kop, max), null, `${kop} (${max})`)
  // Een oude korte vorm van de server (deel na de dubbele punt, of het deel ervoor) telt niet meer.
  assert.equal(veilig('Meteen twee seizoenen tegelijk besteld: Netflix blaast vampierensaga ‘Twilight’ nieuw leven in', 'Netflix blaast vampierensaga ‘Twilight’ nieuw leven in'), false)
  assert.equal(veilig('Groot onderzoek naar werking antidepressiva: verrassende uitkomst voor miljoenen gebruikers', 'Groot onderzoek naar werking antidepressiva'), false)
  assert.equal(veilig('Kabinet is na een lange nacht gevallen en premier treedt af na beraad in Den Haag', 'Kabinet is gevallen en premier treedt af…'), false)
})

test('korte kop: een label van één woord vooraan blijft staan; een langer begin is geen label', () => {
  assert.equal(kortKop('Nepnieuws: kabinet is gevallen na urenlang crisisberaad in Den Haag over de asielwet'), 'Nepnieuws: kabinet is gevallen na urenlang crisisberaad…')
  assert.equal(kortKop('Nepnieuws: kabinet is gevallen na urenlang crisisberaad in Den Haag over de asielwet', 40), 'Nepnieuws: kabinet is gevallen…')
  assert.equal(kortKop('Gerucht: Ajax ontslaat trainer Francesco Farioli na de nederlaag tegen PSV in Eindhoven', 24), 'Gerucht: Ajax ontslaat…')
  assert.equal(kortKop('VIDEO – Kabinet is gevallen na urenlang crisisberaad in Den Haag over de asielwet'), 'VIDEO – Kabinet is gevallen na urenlang crisisberaad in Den…')
  // Na het label minstens twee woorden, anders geen korte vorm.
  assert.equal(kortKop('Nepnieuws: kabinet is gevallen na urenlang crisisberaad in Den Haag over de asielwet', 24), null)
  // Zonder ruimte voor het label en twee woorden, of met een langer begin: de hele kop.
  for (const kop of ['Fact check: prime minister resigned after crisis talks in Downing Street last night', 'Satire van De Speld: kabinet is gevallen na urenlang crisisberaad in Den Haag']) {
    for (const max of MATEN) assert.equal(kortKop(kop, max), null, `${kop} (${max})`)
  }
  for (const max of MATEN) {
    const k = kortKop('Hoax over het kabinet: premier Schoof treedt af na urenlang crisisberaad in Den Haag', max)
    assert.equal(k, null, `${max}`)
  }
})

test('korte kop: een ontkenning met accent, streepje of op n\'t wordt herkend, ook bijna', () => {
  for (const w of ['níét', 'géén', 'nóóit', 'mustn’t', "needn't", 'shan’t', "mightn't", 'oughtn’t', "won't", 'can＇t', 'won‘t']) assert.ok(ontkenning(w), w)
  for (const w of ['zelden', 'evenmin', 'noch', 'rarely', 'seldom', 'neither', 'nor', 'niet-ontvankelijk', 'non-profit', 'not-guilty', 'canʼt']) assert.ok(ontkenning(w), w)
  for (const w of ['bijna', 'almost', 'nearly', 'vrijwel', 'tevergeefs', 'wrongly', 'vals', 'allesbehalve', 'onrechte']) assert.ok(ontkenning(w), w)
  for (const w of ['nietig', 'nobel', 'notaris', 'canteen', 'Seldenrijk']) assert.ok(!ontkenning(w), w)
  // Een ontkenning in wat blijft staan, mag; in wat wegvalt nooit.
  assert.equal(kortKop('De Tweede Kamer steunt het belastingplan niet in de stemming van dinsdagavond laat'), 'De Tweede Kamer steunt het belastingplan niet…')
  assert.equal(kortKop('Tweede Kamer steunt het nieuwe belastingplan van minister Heinen niet in de stemming van dinsdag'), null)
  assert.equal(kortKop('De VVD steunt het nieuwe plan voor de verkoop van zorgverzekeraars écht níét'), null)
  assert.equal(veilig('Government says British schools mustn’t reopen on Monday after the storm damage', 'Government says British schools…'), false)
})

test('korte kop: hooguit de maat, en een kop die past blijft precies zo', () => {
  for (const c of fx.gevallen) assert.ok((kortKop(c.kop) ?? '').length <= KORT_MAX, c.kop)
  const past = 'Een kop van precies zestig tekens die nog net past, wel fijn'
  assert.equal(past.length, 60)
  assert.equal(kortKop(past), past)
  assert.equal(veilig(past, past), true)
  assert.equal(kortKop(''), '')
  assert.equal(kortKop(null), '')
})

test('korte kop: afkappen op een woordgrens, met een beletselteken en zonder los lidwoord of voorzetsel', () => {
  assert.equal(kortKop('Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis'), 'Iraanse dreiging is zó groot dat Amerikaanse minister…')
  assert.equal(kortKop('Sluiting dreigt voor verouderde laboratoria RIVM en verhuizen kan pas over een paar jaar'), 'Sluiting dreigt voor verouderde laboratoria RIVM…')
  assert.equal(kortKop('Topfavoriete Lucinda Brand stapt uit met blessure in Superprestige Niel'), 'Topfavoriete Lucinda Brand stapt uit met blessure…')
  for (const c of fx.gevallen) {
    const out = kortKop(c.kop, c.max ?? KORT_MAX)
    if (!out || !out.endsWith('…')) continue
    const delen = out.slice(0, -1).split(' ')
    // Elk woord staat zo in de kop: nooit een half woord.
    assert.ok(schoonKop(c.kop).startsWith(`${delen.join(' ')} `), out)
    const laatste = delen.pop().toLowerCase()
    assert.ok(!['de', 'het', 'een', 'van', 'met', 'in', 'op', 'naar', 'en', 'the', 'of', 'to', 'rond', 'langs', 'nadat'].includes(laatste), out)
  }
})

test('korte kop: onzichtbare tekens vallen weg, U+0085 (NEL) is witruimte, net als op iOS', () => {
  assert.equal(kortKop('Kop met​ onzichtbaar﻿ teken'), 'Kop met onzichtbaar teken')
  assert.equal(kortKop('Kop met\u0085teken'), 'Kop met teken')
  const kop = 'Kamer stemt in met nieuwe asielwet van minister Faber en de Eerste Kamer dat\u0085niet doet deze week'
  for (const max of [60, 52, 44, 28]) assert.equal(kortKop(kop, max), null, `${max}`)
  assert.equal(veilig(kop, 'Kamer stemt in met nieuwe asielwet van minister Faber…'), false)
})

test('metKorteKoppen: per plek de kop van het hoofdstuk ingekort, de rest ongemoeid', () => {
  const lang = 'Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis'
  const twee = 'Kabinet is gevallen na urenlang crisisberaad in Den Haag: premier spreekt het tegen'
  const ed = {
    id: '2026-11-11-middag',
    entries: [{ kind: 'story', id: 's1', leadId: 'a' }, { kind: 'item', id: 'b' }, { kind: 'item', id: 'zonder' }, { kind: 'story', id: 's2', leadId: 'x', title: 'Getoonde kop van De Redacteur' }, { kind: 'item', id: 'c' }],
    items: [{ id: 'a', title: lang }, { id: 'b', title: 'Korte kop' }, { id: 'c', title: twee }],
  }
  const uit = metKorteKoppen(ed)
  assert.equal(uit.entries[0].kortKop, 'Iraanse dreiging is zó groot dat Amerikaanse minister…')
  assert.equal(uit.entries[1].kortKop, 'Korte kop')
  assert.equal('kortKop' in uit.entries[2], false)
  assert.equal(uit.entries[3].kortKop, 'Getoonde kop van De Redacteur')
  // Meer dan één bewering: geen korte kop, de widget toont de hele kop.
  assert.equal('kortKop' in uit.entries[4], false)
  assert.equal(uit.items, ed.items)
  assert.equal(ed.entries[0].kortKop, undefined) // het origineel blijft zoals het was
  assert.equal(metKorteKoppen(null), null)
})
