// Twee nieuwe onderwerpen (Alex, 13 november 2026): Crypto onder Economie, en Achterklap & showbizz onder Cultuur,
// dat alleen meedoet als je het zelf aantikt. Zie src/lib/topics.js (OPT_IN, ONDERWERPEN, withCrypto).
import test from 'node:test'
import assert from 'node:assert/strict'
import { INTERESTS, TOPICS, OPT_IN, baseTopics, resolveTopics, withCrypto, ONDERWERPEN, inInterest } from '../src/lib/topics.js'
import { keywordTopics, articleTopics } from '../netlify/lib/topics.mjs'
import { pickedFrom } from '../src/lib/welcome.js'
import { normalizePrefs } from '../src/lib/prefs.js'
import { withRemoteChoice, SYNCED_PREFS } from '../src/lib/sync.js'
import { serverRequest } from '../src/lib/editionSync.js'
import { profileOf, W_INHERITED } from '../shared/editor.mjs'
import { choiceOf } from '../netlify/functions/edition.mjs'

const OLD_ECONOMIE = ['economie', 'werk', 'bedrijven', 'energie', 'geld']
const by = Object.fromEntries(INTERESTS.map((i) => [i.id, i]))

test('de lijst: Crypto onder Economie, Achterklap & showbizz als laatste onder Cultuur', () => {
  assert.deepEqual(by.economie.topics, [...OLD_ECONOMIE, 'crypto'])
  assert.equal(by.cultuur.topics.at(-1), 'showbizz')
  assert.equal(TOPICS.find((t) => t.id === 'crypto').label, 'Crypto')
  assert.equal(TOPICS.find((t) => t.id === 'showbizz').label, 'Achterklap & showbizz')
  assert.deepEqual([...OPT_IN], ['showbizz'])
  assert.deepEqual(baseTopics(by.cultuur), ['muziek', 'film', 'boeken', 'kunst', 'media', 'games'])
})

test('trefwoorden: crypto en bitcoin zijn Crypto, niet meer Geld & sparen; cryptografie is geen Crypto', () => {
  assert.deepEqual(keywordTopics('Bitcoin zakt onder de 50.000 dollar'), ['crypto'])
  assert.ok(keywordTopics('Miljarden gestolen bij Binance na grootste cryptohack ooit').includes('crypto'))
  assert.ok(keywordTopics('Stablecoins rukken op bij Europese banken').includes('crypto'))
  assert.ok(!keywordTopics('Nieuwe cryptografie beschermt tegen quantumcomputers').includes('crypto'))
  assert.ok(!keywordTopics('Bitcoin zakt verder weg').includes('geld'))
  assert.ok(keywordTopics('Spaarrente gaat omlaag bij grote banken').includes('geld'))
})

test('showbizz: aan woorden in de kop of aan de rubriek in de link (NU.nl Achterklap, RTL Boulevard)', () => {
  assert.ok(keywordTopics('Realityster en influencer gaan uit elkaar').includes('showbizz'))
  assert.ok(articleTopics({ title: 'Tyra Banks is weer vrijgezel', url: 'https://www.nu.nl/achterklap/6414000/tyra-banks.html' }).topics.includes('showbizz'))
  assert.ok(articleTopics({ title: 'Tino Martin sluit plek niet uit', url: 'https://www.rtl.nl/boulevard/video/08bd/tino' }).topics.includes('showbizz'))
  // /entertainment/ en /muziek/ zijn ook film en muziek: geen showbizz op de link alleen.
  assert.ok(!articleTopics({ title: 'Nieuwe film van Nolan', url: 'https://www.telegraaf.nl/entertainment/123/nolan' }).topics.includes('showbizz'))
  assert.ok(!articleTopics({ title: 'Tino Martin in gesprek met De Toppers', url: 'https://www.nu.nl/muziek/6414944/tino.html' }).topics.includes('showbizz'))
})

test('Cultuur zonder keuze is zonder showbizz; aangetikt is het er wel', () => {
  assert.deepEqual(resolveTopics(['cultuur'], []), baseTopics(by.cultuur))
  assert.deepEqual(resolveTopics(['cultuur'], ['showbizz']), ['showbizz'])
  assert.deepEqual(resolveTopics(['cultuur'], [...by.cultuur.topics]), by.cultuur.topics)
  assert.deepEqual(pickedFrom(baseTopics(by.cultuur), ['cultuur'], INTERESTS), [])
  assert.deepEqual(pickedFrom(['film', 'showbizz'], ['cultuur'], INTERESTS), ['film', 'showbizz'])
  assert.deepEqual(pickedFrom(by.cultuur.topics, ['cultuur'], INTERESTS), by.cultuur.topics)
  // Economie zonder keuze: alle zes, met Crypto.
  assert.deepEqual(resolveTopics(['economie'], []), [...OLD_ECONOMIE, 'crypto'])
})

test('de Redacteur: showbizz telt alleen als je het aantikte', () => {
  const alles = profileOf({ interests: ['cultuur'], topics: baseTopics(by.cultuur) })
  assert.equal(alles.topicP.showbizz ?? 0, 0)
  assert.equal(alles.topicP.film, W_INHERITED)
  const leeg = profileOf({ interests: ['cultuur'], topics: [] })
  assert.equal(leeg.topicP.showbizz ?? 0, 0)
  const erbij = profileOf({ interests: ['cultuur'], topics: by.cultuur.topics })
  assert.ok(erbij.topicP.showbizz > 0)
  assert.equal(erbij.topicP.film, W_INHERITED)
  const alleen = profileOf({ interests: ['cultuur'], topics: ['showbizz'] })
  assert.equal(alleen.topicP.showbizz, 1)
  assert.equal(alleen.topicP.film ?? 0, 0)
})

test('Crypto erbij voor wie Economie helemaal volgde; een scherpe of nieuwe keuze blijft', () => {
  assert.deepEqual(withCrypto(['economie'], OLD_ECONOMIE), [...OLD_ECONOMIE, 'crypto'])
  assert.deepEqual(withCrypto(['economie', 'sport'], [...OLD_ECONOMIE, 'voetbal']), [...OLD_ECONOMIE, 'crypto', 'voetbal'])
  assert.deepEqual(withCrypto(['economie'], ['werk', 'geld']), ['werk', 'geld'])
  assert.deepEqual(withCrypto(['tech'], OLD_ECONOMIE), OLD_ECONOMIE)
  // Web: één keer bij het lezen, daarna draagt de keuze de versie en blijft Crypto uit als je het uitzette.
  const p = normalizePrefs({ interests: ['economie'], topics: OLD_ECONOMIE, rubrieken: 2 })
  assert.deepEqual(p.topics, [...OLD_ECONOMIE, 'crypto'])
  assert.equal(p.onderwerpen, ONDERWERPEN)
  const bewust = normalizePrefs({ interests: ['economie'], topics: OLD_ECONOMIE, rubrieken: 2, onderwerpen: ONDERWERPEN })
  assert.deepEqual(bewust.topics, OLD_ECONOMIE)
})

test('sync en server: de versie gaat mee; app 1.3 vraagt zonder en krijgt Crypto bij Economie-alles', () => {
  assert.ok(SYNCED_PREFS.includes('onderwerpen'))
  assert.equal(withRemoteChoice({ onderwerpen: 2 }, { topics: OLD_ECONOMIE, rubrieken: 2 }).onderwerpen, undefined)
  assert.equal(withRemoteChoice({}, { topics: OLD_ECONOMIE, rubrieken: 2, onderwerpen: 2 }).onderwerpen, 2)
  assert.equal(serverRequest({ interests: ['economie'], topics: OLD_ECONOMIE }).onderwerpen, ONDERWERPEN)
  const app = choiceOf({ interests: ['economie'], topics: OLD_ECONOMIE, rubrieken: 2 })
  assert.deepEqual(app.topics, [...OLD_ECONOMIE, 'crypto'])
  assert.deepEqual(app.asked.topics, OLD_ECONOMIE)
  const web = choiceOf({ interests: ['economie'], topics: OLD_ECONOMIE, rubrieken: 2, onderwerpen: ONDERWERPEN })
  assert.deepEqual(web.topics, OLD_ECONOMIE)
})

test('de rubriek Cultuur in de Stroom: een bericht dat alleen showbizz is hoort er niet bij, met film wel', () => {
  assert.ok(!inInterest({ topics: ['showbizz'] }, 'cultuur', { cat: 'nl' }))
  assert.ok(inInterest({ topics: ['showbizz', 'film'] }, 'cultuur', { cat: 'nl' }))
  assert.ok(inInterest({ topics: ['crypto'] }, 'economie', { cat: 'nl' }))
})
