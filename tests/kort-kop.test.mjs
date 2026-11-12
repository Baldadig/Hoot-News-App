import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kortKop, metKorteKoppen, veilig, ontkenning, KORT_MAX } from '../shared/kort-kop.mjs'

// tests/fixtures/kort-kop.json wordt ook door iOS gelezen (KortKopTests): dezelfde korte kop op beide.
const fx = JSON.parse(readFileSync(new URL('./fixtures/kort-kop.json', import.meta.url), 'utf8'))

test('korte kop: dezelfde uitkomst als de gedeelde gevallen', () => {
  assert.equal(fx.max, KORT_MAX)
  assert.ok(fx.gevallen.length >= 20)
  // `max` per geval: de kortere stappen van de widget (vergrendelscherm 36 en 40). `verwacht: null`: op die maat
  // is er geen veilige korte kop, want er zou een ontkenning wegvallen.
  for (const c of fx.gevallen) assert.equal(kortKop(c.kop, c.max ?? KORT_MAX), c.verwacht, `${c.kop} (${c.max ?? KORT_MAX})`)
})

test('korte kop: een ontkenning valt nooit weg, via welke stap ook (keuring 4)', () => {
  // Over de hele weggevallen rest, niet tot het eerste leesteken. Elke uitkomst gaat langs `veilig`; en los
  // daarvan: valt er een ontkenning weg, dan staat ze in een eigen (bij)zin of citaat die helemaal wegvalt, met
  // minstens drie woorden ervoor die ook wegvallen, en nooit direct na een komma, dubbele punt of gedachtestreep.
  const sl = (w) => w.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '')
  for (const c of fx.gevallen) {
    const alle = schoonKop(c.kop).split(' ')
    for (const max of [60, 56, 52, 48, 44, 40, 36, 32, 28, 24]) {
      const k = kortKop(c.kop, max)
      if (k === null) continue
      assert.ok(k.length <= max, k)
      assert.ok(veilig(c.kop, k), `${c.kop} (${max}) → ${k}`)
      const tel = (ws) => ws.filter(ontkenning).length
      if (tel(k.split(' ')) >= tel(alle)) continue
      const rest = new Map()
      for (const w of k.replace(/…$/u, '').split(' ').map(sl)) rest.set(w, (rest.get(w) || 0) + 1)
      for (let p = 0; p < alle.length; p++) {
        if (!ontkenning(alle[p])) continue
        if (rest.get(sl(alle[p]))) { rest.set(sl(alle[p]), rest.get(sl(alle[p])) - 1); continue }
        assert.ok(p >= 3 && !/[,:;]$/u.test(alle[p - 1]) && !/^[–—-]$/u.test(alle[p - 1]), `${c.kop} (${max}) → ${k}`)
        const kaal = k.replace(/…$/u, '')
        for (const w of alle.slice(p - 2, p)) assert.ok(!kaal.endsWith(w), `${c.kop} (${max}) → ${k}`)
      }
    }
  }
  // De gevallen uit keuring 4: de ontkenning staat er nog, of er is op die maat geen korte kop.
  const moet = [
    ['Eén miljoen Fransen krijgen zender CNews, de “propagandamachine van extreemrechts”, niet uit de ether', 60],
    ['Nieuwe asielwet aangenomen door de Tweede Kamer: of toch niet?', 60],
    ['Rutte wordt de nieuwe secretaris-generaal van de NAVO: niet waar', 60],
    ['Kabinet valt over stikstof: nee, zegt premier', 40],
    ['Ajax neemt afscheid van trainer Farioli na nederlaag – nog niet officieel', 60],
    ['Nieuwe kerncentrale in Borssele komt er – maar niet voor 2040', 60],
    ['Acht maanden durfden D66 en CDA amper over de grenzen van hun eigen coalitie heen te kijken', 36],
    ['Nvidia Tumbles as Investors Consider Future Without CEO Huang', 48],
    ['Russia-Ukraine talks turn to post-war security but end without breakthrough', 60],
    ['Een vaste basisplaats bij Marokko zit er voor Ayoub Oufkir niet in; bij Oranje ook niet', 60],
  ]
  for (const [kop, max] of moet) {
    const k = kortKop(kop, max)
    assert.ok(k === null || /(^|[\s‘“(])(niet|nee|amper|without)(\s|…|$)/iu.test(k), `${kop} (${max}) → ${k}`)
  }
  // Ook bij een komma (stap 5) en tussen haakjes.
  assert.equal(kortKop('Tweede Kamer steunt het nieuwe belastingplan niet, coalitie in zwaar weer na lange nacht van onderhandelen'), 'Tweede Kamer steunt het nieuwe belastingplan niet…')
  assert.match(kortKop('Kabinet stemt (niet) in met plan voor nieuwe kerncentrales in Borssele en op de Maasvlakte'), /\(niet\)/u)
  // Een weggevallen ontkenning is altijd onveilig, ook in een eigen zin of bijzin (keuring 6): de kop blijft heel.
  assert.equal(kortKop('Russia, Ukraine agree on prisoner exchange as talks end without major breakthrough'), null)
  assert.equal(kortKop('Kruis over de knock-outfase? Vrouwen kunnen ook tegen Køge niet winnen en lijken uitgeteld in de Champions League'), null)
})

test('korte kop: een verwijzende zin of voorwaarde valt nooit weg met haar ontkenning (keuring 5)', () => {
  const nooit = [
    ['Het kabinet is gevallen. Dat klopt helemaal niet, zegt premier Schoof', 'Het kabinet is gevallen.'],
    ['The cabinet has collapsed. That is simply not true, says the prime minister', 'The cabinet has collapsed.'],
    ['Biden will run again in 2028: that is simply not true, says his campaign', 'Biden will run again in 2028'],
    ['Asielwet gaat per 1 januari in, maar dat gebeurt nu toch niet', 'Asielwet gaat per 1 januari in…'],
    ['Kabinet valt deze week, als het aan premier Schoof ligt in elk geval niet', 'Kabinet valt deze week…'],
    ['Kabinet gevallen na urenlang crisisberaad: ‘Dat is absoluut niet waar’', 'Kabinet gevallen na urenlang crisisberaad'],
  ]
  for (const [kop, fout] of nooit) {
    assert.equal(veilig(kop, fout), false, `${kop} → ${fout}`)
    for (const max of [60, 56, 52, 48, 44, 40, 36, 32, 28, 24]) assert.notEqual(kortKop(kop, max), fout, `${kop} (${max})`)
  }
  // Een B die met een voornaamwoord of verwijswoord begint, is geen kop op zichzelf.
  assert.ok(!/^It /u.test(kortKop('Netflix renews ‘Wednesday’ for a third season: it will not be the last, says star') ?? ''))
  // Ontkennen zonder ontkenningswoord.
  assert.equal(kortKop('Kabinet is gevallen na ruzie over asielwet, zegt oppositie; premier Schoof ontkent dat'), null)
})

test('korte kop: een ontkenning met accent of op n\'t wordt herkend (keuring 5)', () => {
  for (const w of ['níét', 'géén', 'nóóit', 'mustn’t', "needn't", 'shan’t', "mightn't", 'oughtn’t', "won't"]) assert.ok(ontkenning(w), w)
  // Keuring 6: bijna-ontkenningen, samenstellingen met een streepje en U+02BC.
  for (const w of ['zelden', 'evenmin', 'noch', 'rarely', 'seldom', 'neither', 'nor', 'niet-ontvankelijk', 'non-profit', 'not-guilty', 'canʼt', 'won’t']) assert.ok(ontkenning(w), w)
  for (const w of ['nietig', 'nobel', 'notaris', 'canteen', 'Seldenrijk']) assert.ok(!ontkenning(w), w)
  assert.equal(veilig('Kabinet stemt (níét) in met nieuwe asielwet van minister Faber na lang debat', 'Kabinet stemt in met nieuwe asielwet van minister Faber…'), false)
  assert.match(kortKop('Kabinet stemt (níét) in met nieuwe asielwet van minister Faber na lang debat'), /\(níét\)/u)
  assert.equal(kortKop('De VVD steunt het nieuwe plan voor de verkoop van zorgverzekeraars écht níét'), null)
  assert.equal(veilig('Government says British schools mustn’t reopen on Monday after the storm damage', 'Government says British schools…'), false)
})

test('korte kop: bij een dubbele punt blijft de naam vooraan (PSV)', () => {
  assert.equal(kortKop('PSV aast op enorme transferstunt: landskampioen legt contact met Kevin De Bruyne, die in januari weg mag'), 'PSV aast op enorme transferstunt')
})

test('korte kop: na een dubbele punt nooit een deel zonder onderwerp, en geen onzichtbare tekens', () => {
  assert.equal(kortKop('Jongeren nemen heft in eigen handen: met eigen trekkers werken aan toekomstig huis'), 'Jongeren nemen heft in eigen handen')
  assert.equal(kortKop('Amsterdam begint ‘offensief tegen drugsoverlast’: miljoenen voor opvang en zorg'), 'Amsterdam begint ‘offensief tegen drugsoverlast’')
  const k = kortKop('‘Young, Black and female in Brixton is hard’: \u200Bfrom football to Top Boy and wordplay, the inspiring journey of UK rapper Cristale')
  assert.ok(!/[\u200B-\u200D\uFEFF]/u.test(k), 'onzichtbaar teken')
  assert.match(k, /^‘Young/u)
  assert.equal(kortKop('Kop met\u200B onzichtbaar\uFEFF teken'), 'Kop met onzichtbaar teken')
})
const schoonKop = (s) => s.replace(/[\u200B-\u200D\uFEFF]/gu, '').replace(/\s+/g, ' ').trim()

test('korte kop: hooguit 60 tekens, en een kop die past blijft precies zo', () => {
  for (const c of fx.gevallen) assert.ok((kortKop(c.kop) ?? '').length <= KORT_MAX, c.kop)
  const past = 'Een kop van precies zestig tekens die nog net past, wel fijn'
  assert.equal(past.length, 60)
  assert.equal(kortKop(past), past)
  assert.equal(kortKop(''), '')
  assert.equal(kortKop(null), '')
})

test('korte kop: afkappen op een woordgrens, met een beletselteken en zonder los lidwoord of voorzetsel', () => {
  const k = kortKop('Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis')
  assert.equal(k, 'Iraanse dreiging is zó groot dat Amerikaanse minister…')
  for (const c of fx.gevallen) {
    const out = kortKop(c.kop)
    if (!out || !out.endsWith('…')) continue
    const laatste = out.slice(0, -1).split(' ').pop()
    // Elk woord voor het beletselteken staat zo in de kop: nooit een half woord (behalve één woord dat alles vult).
    if (out.slice(0, -1).includes(' ')) assert.ok([' ', ',', ':', ';'].some((n) => c.kop.replace(/\s+/g, ' ').includes(`${laatste}${n}`)), out)
    assert.ok(!['de', 'het', 'een', 'van', 'met', 'in', 'op', 'naar', 'en', 'the', 'of', 'to'].includes(laatste.toLowerCase()), out)
  }
})

test('korte kop: een spreker voor de dubbele punt blijft, een uitwerking erna valt weg', () => {
  assert.match(kortKop('Raad van State: minister van Asiel moet veiligheid Syrië opnieuw beoordelen na nieuwe berichten uit Damascus'), /^Raad van State: /)
  assert.equal(kortKop('Emma Heesters is de nieuwe Bachelorette: ‘Geloof nog steeds in de liefde’ en meer woorden'), 'Emma Heesters is de nieuwe Bachelorette')
  assert.equal(kortKop('Kabinet valt over stikstof – oppositie wil nu snel verkiezingen in het voorjaar van volgend jaar'), 'Kabinet valt over stikstof')
  // Te korte kern voor de streep: dan niet weglaten maar afkappen.
  assert.match(kortKop('Kabinet valt – oppositie wil nu snel verkiezingen in het voorjaar van volgend jaar en daarna'), /^Kabinet valt – .+…$/)
})

test('metKorteKoppen: per plek de kop van het hoofdstuk ingekort, de rest ongemoeid', () => {
  const lang = 'Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis'
  const ed = {
    id: '2026-11-11-middag',
    entries: [{ kind: 'story', id: 's1', leadId: 'a' }, { kind: 'item', id: 'b' }, { kind: 'item', id: 'zonder' }, { kind: 'story', id: 's2', leadId: 'x', title: 'Getoonde kop van De Redacteur' }],
    items: [{ id: 'a', title: lang }, { id: 'b', title: 'Korte kop' }],
  }
  const uit = metKorteKoppen(ed)
  assert.equal(uit.entries[0].kortKop, 'Iraanse dreiging is zó groot dat Amerikaanse minister…')
  assert.equal(uit.entries[1].kortKop, 'Korte kop')
  assert.equal('kortKop' in uit.entries[2], false)
  assert.equal(uit.entries[3].kortKop, 'Getoonde kop van De Redacteur')
  assert.equal(uit.items, ed.items)
  assert.equal(ed.entries[0].kortKop, undefined) // het origineel blijft zoals het was
  assert.equal(metKorteKoppen(null), null)
})

// Keuring 1: echte koppen uit de feed waar de korte kop het nieuws kwijtraakte.
test('korte kop: het nieuws blijft staan (citaat, uitwerking na de dubbele punt, vraag, bijvoeglijk naamwoord)', () => {
  // a. Citaat vooraan: wat erna komt heeft spreker en onderwerp.
  assert.equal(kortKop('“Ongekende heksenjacht”: advocaten van ‘Slimste Mens’-kandidaat Bruine Mehdi bestrijden zedenfeiten', 80), 'Advocaten van ‘Slimste Mens’-kandidaat Bruine Mehdi bestrijden zedenfeiten')
  // Met "zelden" in het citaat (keuring 6) valt het citaat niet meer weg: de hele kop.
  assert.equal(kortKop('“Zelden geziene heksenjacht”: advocaten van ‘Slimste Mens’-kandidaat Bruine Mehdi ontkennen zedenfeiten', 80), null)
  assert.equal(kortKop('‘Nog 1 hotelkamer beschikbaar!’ Brussel presenteert nieuwe techwet tegen manipulatieve trucs van big tech').startsWith('Brussel presenteert'), true)
  // Een bijnaam is geen citaat.
  assert.ok(kortKop('‘Romanticus’ Emma Heesters gaat op zoek naar de liefde in nieuw seizoen De Bachelorette').startsWith('‘Romanticus’ Emma Heesters'))
  // d. Een uitwerking met een eigen, benoemd onderwerp valt niet weg.
  assert.equal(kortKop('Meteen twee seizoenen tegelijk besteld: Netflix blaast vampierensaga ‘Twilight’ nieuw leven in'), 'Netflix blaast vampierensaga ‘Twilight’ nieuw leven in')
  // Noemt het deel erna niets (geen naam of getal), dan blijft het deel ervoor (keuring 3: anders valt het
  // onderwerp weg, "Amsterdam begint …: miljoenen voor opvang en zorg" → "Miljoenen voor opvang en zorg").
  assert.equal(kortKop('Winterjas aan en paraplu blijft thuis: zo wordt het weer tijdens de intocht'), 'Winterjas aan en paraplu blijft thuis')
  // Maar is het deel ervoor het nieuws (met een naam of getal), dan blijft dat.
  assert.equal(kortKop('Geen bezorgverbod voor Uber Eats in Amsterdam: onvoldoende nagedacht over gevolgen, oordeelt Raad van State'), 'Geen bezorgverbod voor Uber Eats in Amsterdam')
  assert.equal(kortKop('Amsterdamse ict-blunder kost zeker 30 miljoen euro: ambtenaren komen weg met ’stevig gesprek’'), 'Amsterdamse ict-blunder kost zeker 30 miljoen euro')
  // c. Afkappen op een zinsgrens.
  assert.equal(kortKop('Wat wil jij weten van de klimaattop in Turkije? Stel je vragen aan onze verslaggever'), 'Wat wil jij weten van de klimaattop in Turkije?')
  // d. Geen los voorzetsel of bijvoeglijk naamwoord aan het eind; een zelfstandig naamwoord op -e blijft.
  assert.equal(kortKop('Sluiting dreigt voor verouderde laboratoria RIVM, maar verhuizen kan pas over een paar jaar'), 'Sluiting dreigt voor verouderde laboratoria RIVM…')
  // Met een ontkenning in de bijzin zonder eigen, benoemd onderwerp: geen korte kop (keuring 5).
  assert.equal(kortKop('Sluiting dreigt voor verouderde laboratoria RIVM, maar verhuizen kan nog niet'), null)
  assert.equal(kortKop('Manon Bakker ploetert in crossweer naar eerste grote zege in 3 jaar, Lucinda Brand misstapt zich en valt uit in Niel'), 'Manon Bakker ploetert in crossweer naar eerste grote zege…')
  assert.equal(kortKop('Topfavoriete Lucinda Brand stapt uit met blessure in Superprestige Niel'), 'Topfavoriete Lucinda Brand stapt uit met blessure…')
  for (const kop of fx.gevallen.map((c) => kortKop(c.kop, c.max ?? 60)).filter(Boolean)) {
    const laatste = kop.replace(/…$/, '').split(' ').pop().toLowerCase()
    assert.ok(!['rond', 'langs', 'binnen', 'rondom', 'nabij', 'jegens', 'wegens', 'nadat'].includes(laatste), kop)
  }
})

test('korte kop: een dubbele punt in een titel of naam geeft nooit alleen het deel erna (keuring 2)', () => {
  // A eindigt op een naam of getal en B begint met een naam: twijfel, dus de hele kop vanaf het begin.
  for (const kop of [
    'Blizzard Can’t Stop Tweaking WoW: Forever and It’s Only Been 6 Days',
    'Don’t expect more information on The Elder Scrolls 6: Sentinel ‘for some time,’ Bethesda says',
    'Domper voor Rode Duivels: Romelu Lukaku mist duel met Turkije door heupproblemen',
  ]) {
    const k = kortKop(kop)
    assert.ok(kop.startsWith(k.replace(/…$/u, '')), `${kop} → ${k}`)
  }
  // B in Title Case is geen eigen zin: ook dan de hele kop.
  assert.equal(kortKop('Everything about the long-awaited second season: What We Know So Far About It'), 'Everything about the long-awaited second season…')
  // Een zin in zinsopbouw na de dubbele punt blijft de korte kop, ook met namen erin.
  assert.equal(kortKop('Bone broth, sweets ban and acupuncture: Harry Kane’s road to record England cap'), 'Harry Kane’s road to record England cap')
  assert.equal(kortKop('Stuntfietser, veganist, actief vlogger en liefhebber van… kringloopwinkels: dit is ‘Snorremans’ Cameron Mason'), 'Dit is ‘Snorremans’ Cameron Mason')
  // Een beletselteken in de kop komt bij afkappen niet dubbel.
  assert.equal(kortKop('Stuntfietser, veganist, actief vlogger en liefhebber van… kringloopwinkels, tweedehands spullen en meer'), 'Stuntfietser, veganist, actief vlogger en liefhebber…')
})

test('korte kop: een weggevallen ontkenning is altijd onveilig, ook in een eigen zin, bijzin of citaat (keuring 6)', () => {
  // Elke kop in de fixtures, op elke maat: valt er een ontkenning weg, dan is er geen korte kop.
  for (const c of fx.gevallen) {
    const tel = (s) => s.split(' ').filter(ontkenning).length
    for (const max of [60, 56, 52, 48, 44, 40, 36, 32, 28, 24]) {
      const k = kortKop(c.kop, max)
      if (k !== null) assert.ok(tel(k.replace(/…$/u, '')) >= tel(schoonKop(c.kop)), `${c.kop} (${max}) → ${k}`)
    }
  }
  assert.equal(veilig('Het kabinet valt over stikstof. Premier Schoof denkt van niet', 'Het kabinet valt over stikstof.'), false)
  assert.equal(veilig('Prime minister resigns after crisis talks: ‘Prime minister has not resigned at all’', 'Prime minister resigns after crisis talks'), false)
})
