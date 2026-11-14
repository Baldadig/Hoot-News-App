import { test } from 'node:test'
import assert from 'node:assert/strict'
import { desksOf, deskOfStory } from '../netlify/lib/desks.mjs'
import { countriesIn } from '../shared/article-signals.mjs'
import { labelFor } from '../src/lib/label.js'

// Dubbelcheck 14 november, A6: de rubriek boven een plek klopt. De plek wint van een binnenlands onderwerp, een musicus
// in de kop is cultuur, en een Amerikaanse staat of stad of het VK is een buitenlandse plek. Een stuk van een Vlaamse
// bron blijft Buitenland (herstelkeuring). De koppen zijn de voorbeelden uit OORDEEL.md; de regels gelden voor elk zulk stuk.
const desks = (it) => [...desksOf(it)]

test('A6: een Amerikaanse staat en het VK zijn een land', () => {
  assert.deepEqual(countriesIn('Aanvaring vrachtschip met cruiseschip op Mississippi'), ['us'])
  assert.deepEqual(countriesIn('Politie VK opent zaak naar David Walliams'), ['gb'])
  assert.deepEqual(countriesIn('Nieuwe wet in Pennsylvania en Illinois'), ['us'])
  // Tegenval: een voornaam of een land met dezelfde naam is geen staat.
  assert.deepEqual(countriesIn('Virginia Woolf herlezen'), [])
  assert.deepEqual(countriesIn('Arizona zocht al naar 42 miljard'), [], 'Arizona is ook de Belgische regeringscoalitie')
  assert.ok(!countriesIn('Georgia kiest een nieuw parlement').includes('us'))
})

test('A6: een buitenlands verhaal uit een Nederlandse bron is geen Binnenland', () => {
  // Een Vlaamse bron zonder bronland als bewijs: het onderwerp moet het zeggen, ook in de bezitsvorm ("Trumps Amerika").
  assert.deepEqual(desks({ source: 'demorgen', title: 'VS-correspondent Mari Meyer over Trumps Amerika: ‘Steeds meer mensen beseffen dat de democratie op het spel staat’', url: 'https://www.demorgen.be/nieuws/x' }), ['vs'])
  assert.deepEqual(desks({ source: 'nos', title: 'Aanvaring vrachtschip met cruiseschip op Mississippi' }), ['vs'])
  assert.deepEqual(desks({ source: 'nos', title: 'Politie VK opent zaak naar David Walliams' }), ['buitenland'])
  assert.deepEqual(desks({ source: 'demorgen', title: '▶ 32 gewonden nadat riviercruiseschip kapseist na aanvaring met tanker: ‘Mirakel op de Mississippi’', url: 'https://www.demorgen.be/nieuws/x' }), ['vs'])
  assert.equal(deskOfStory([
    { source: 'nos', title: 'Aanvaring vrachtschip met cruiseschip op Mississippi' },
    { source: 'nu', title: 'Tientallen gewonden bij aanvaring op Mississippi' },
    { source: 'demorgen', title: 'Mirakel op de Mississippi', url: 'https://www.demorgen.be/nieuws/x' },
  ]), 'vs')
})

test('A6: een musicus is cultuur, geen Buitenland, ook als de intro een ander land noemt', () => {
  assert.deepEqual(desks({ source: 'nu', title: 'Voormalig Doe Maar-drummer Jan Pijnenburg (70) onverwachts overleden', summary: 'Pijnenburg overleed in zijn huis in Spanje.' }), [])
  assert.deepEqual(desks({ source: 'nos', title: 'Zangeres van bekende popgroep stopt ermee' }), [])
  // Tegenval: een misdaad met een land in de kop blijft nieuws (de bestaande uitzondering in ownKind).
  assert.ok(desks({ source: 'nos', title: 'Rapper doodgeschoten in Frankrijk' }).includes('buitenland'))
})

test('A6: een stuk van een Vlaamse bron blijft Buitenland, ook zonder bekende Belgische plek (herstelkeuring)', () => {
  // De herstelkeuring vond 130 van de 477 Vlaamse stukken die geen Buitenland meer waren: Belgisch binnenlands nieuws
  // ontsnapte zo aan het plafond voor buitenland. Of Belgisch nieuws voor de Vlaamse lezer Buitenland heet, beslist Alex.
  assert.deepEqual(desks({ source: 'vrt', title: 'Vier everzwijnen aangereden op 1 dag in Geel: politie waarschuwt voor overstekend wild', summary: 'Op de Zuiderring (R14) in Geel zijn gisteren 4 everzwijnen aangereden.', url: 'https://vrtnws.be/p.VLN9mBP4V' }), ['buitenland'])
  assert.deepEqual(desks({ source: 'vrt', title: 'Kernkabinet zit sinds vanmiddag weer bijeen over de begroting', url: 'https://vrtnws.be/p.nwvwmBOBR' }), ['buitenland'])
  assert.deepEqual(desks({ source: 'vrt', title: 'Proces gestart tegen Liberty in Geraardsbergen: 191 mensen opgelicht met valse verzekeringen', url: 'https://vrtnws.be/p.3Bw05XZdP' }), ['buitenland'])
  assert.deepEqual(desks({ source: 'vrt', title: 'Brand in Antwerpse school, drie gewonden' }), ['buitenland'])
  assert.deepEqual(desks({ source: 'standaard', title: 'Staking legt treinverkeer plat', url: 'https://www.standaard.be/buitenland/x' }), ['buitenland'])
  assert.deepEqual(desks({ source: 'nieuwsblad', title: 'Lachen op een begrafenis is geen schande', url: 'https://www.nieuwsblad.be/binnenland/x' }), ['buitenland'])
  // Cultuur en sport van een Vlaamse bron hebben hun eigen soort, geen rubriek (ownKind).
  assert.deepEqual(desks({ source: 'sporza', title: 'Evenepoel wint de tijdrit in Tirreno', mainTopics: ['wielrennen'], url: 'https://sporza.be/nl/x' }), [])
  assert.deepEqual(desks({ source: 'standaard', title: 'Nieuwe roman van Lize Spit verschijnt in maart', url: 'https://www.standaard.be/cultuur/x' }), [])
})

test('A6: het label volgt de plek, niet het binnenlandse onderwerp (web; de app leest dezelfde fixture)', () => {
  const follows = ['misdaad', 'nederland', 'verkeer']
  const rwanda = labelFor({ topics: ['misdaad', 'afrika'], mainTopics: ['misdaad', 'afrika'], follows, desk: 'buitenland', deskLabel: 'Buitenland' })
  assert.equal(rwanda.kicker, 'Buitenland')
  const walliams = labelFor({ topics: ['misdaad'], mainTopics: ['misdaad'], follows, desk: 'buitenland', deskLabel: 'Buitenland' })
  assert.equal(walliams.kicker, 'Buitenland')
  const vs = labelFor({ topics: ['verkeer'], mainTopics: ['verkeer'], follows, desk: 'vs', deskLabel: 'VS' })
  assert.equal(vs.kicker, 'VS')
  const thuis = labelFor({ topics: ['misdaad'], mainTopics: ['misdaad'], follows, desk: 'binnenland', deskLabel: 'Binnenland' })
  assert.equal(thuis.kicker, 'Binnenland · Misdaad & recht')
})
