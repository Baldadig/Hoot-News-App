import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kortKop, metKorteKoppen, KORT_MAX } from '../shared/kort-kop.mjs'

// tests/fixtures/kort-kop.json wordt ook door iOS gelezen (KortKopTests): dezelfde korte kop op beide.
const fx = JSON.parse(readFileSync(new URL('./fixtures/kort-kop.json', import.meta.url), 'utf8'))

test('korte kop: dezelfde uitkomst als de gedeelde gevallen', () => {
  assert.equal(fx.max, KORT_MAX)
  assert.ok(fx.gevallen.length >= 20)
  // `max` per geval: de kortere stappen van de widget (vergrendelscherm 36 en 40). `verwacht: null`: op die maat
  // is er geen veilige korte kop, want er zou een ontkenning wegvallen.
  for (const c of fx.gevallen) assert.equal(kortKop(c.kop, c.max ?? KORT_MAX), c.verwacht, `${c.kop} (${c.max ?? KORT_MAX})`)
})

test('korte kop: een ontkenning valt nooit weg uit de zin waarin wordt afgekapt', () => {
  const ontkenning = /(^|\s|\()(niet|geen|nooit|not|no|never)(\s|\)|$|[,.?!])/iu
  for (const c of fx.gevallen) {
    for (const max of [60, 56, 52, 48, 44, 40, 36, 32, 28, 24]) {
      const k = kortKop(c.kop, max)
      if (k === null) continue
      assert.ok(k.length <= max, k)
      // Wat overblijft is het begin van een zin uit de kop; stond daar een ontkenning in vóór het volgende
      // leesteken of bijzinswoord, dan staat die er nog.
      const body = k.replace(/…$/u, '')
      const i = schoonKop(c.kop).indexOf(body)
      if (i < 0) continue
      const rest = schoonKop(c.kop).slice(i + body.length)
      const zin = rest.split(/[,;:.?!]|\s[–—-]\s|\s(?:maar|als|dat|die|omdat|terwijl|but|as|that|while|because)\s/iu)[0]
      // (Eén woord dat langer is dan alles wordt midden afgekapt; daar staat nog geen zin.)
      if (body.includes(' ') && !/[,;:]$/u.test(body)) assert.ok(!ontkenning.test(zin), `${c.kop} (${max}) → ${k}`)
    }
  }
  // Ook bij een komma (stap 5) en tussen haakjes.
  assert.equal(kortKop('Tweede Kamer steunt het nieuwe belastingplan niet, coalitie in zwaar weer na lange nacht van onderhandelen'), 'Tweede Kamer steunt het nieuwe belastingplan niet…')
  assert.match(kortKop('Kabinet stemt (niet) in met plan voor nieuwe kerncentrales in Borssele en op de Maasvlakte'), /\(niet\)/u)
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
  assert.equal(kortKop('“Zelden geziene heksenjacht”: advocaten van ‘Slimste Mens’-kandidaat Bruine Mehdi ontkennen zedenfeiten'), 'Advocaten van ‘Slimste Mens’-kandidaat Bruine Mehdi…')
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
  assert.equal(kortKop('Sluiting dreigt voor verouderde laboratoria RIVM, maar verhuizen kan nog niet'), 'Sluiting dreigt voor verouderde laboratoria RIVM…')
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
