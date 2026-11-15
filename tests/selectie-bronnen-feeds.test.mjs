// Selectie-review 14 november, punt 4: bronnen op pauze. Vier kregen de feed die de uitgever zelf aanbiedt (gemeten vanaf
// de Mac met de gewone User-Agent van Hoot; niets omzeild). De bronnen die Netlify weigeren maar vanaf de Mac op hun eigen
// adres werken (Creative Review, Design Week, Marketing Week, MT/Sprout, The Architect's Newspaper, Skipr, Zorg+Welzijn,
// Nursing), houden hun adres: een ander adres van dezelfde site zou de weigering alleen ontwijken.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VAK_SOURCES, isReading } from '../netlify/lib/vak.mjs'
import { ARCHIVED_SOURCES } from '../netlify/lib/vakBronnen.mjs'

const url = (id) => VAK_SOURCES.find((s) => s.id === 'vak:' + id).urls[0]

test('de officiële feed in plaats van een doorverwijzing, cookie- of inlogpagina', () => {
  assert.equal(url('emerce'), 'https://www.emerce.nl/feed')
  assert.equal(url('techpulse'), 'https://techpulse.be/feed/')
  assert.equal(url('zorgvisie'), 'https://www.zorgvisie.nl/feed/')
  assert.equal(url('focus-film'), 'https://focus.knack.be/film/feed/')
})

// 15 november: die acht weigeren de server nog steeds (Cloudflare-check of HTTP 403). Niet omzeild: vervangen door een
// gelijkwaardige vakbron met een open feed, of zonder vervanger naar het archief (BESLUITEN-15NOV.md).
test('bronnen die de server weigeren staan in het archief, de vervangers doen mee', () => {
  const weg = ['creativereview', 'designweek', 'marketingweek', 'sprout', 'archpaper', 'skipr', 'zorgwelzijn', 'nursing']
  for (const id of weg) {
    assert.ok(!VAK_SOURCES.some((s) => s.id === 'vak:' + id), id + ' doet niet meer mee')
    assert.ok(ARCHIVED_SOURCES.some((s) => s.id === 'vak:' + id), id + ' staat in het archief')
  }
  for (const id of ['itsnicethat', 'printmag', 'marketingdive', 'architectmag', 'icthealth']) assert.match(url(id), /^https:\/\//, id)
  assert.equal(VAK_SOURCES.find((s) => s.id === 'vak:icthealth').lang, 'nl')
  assert.deepEqual(VAK_SOURCES.find((s) => s.id === 'vak:itsnicethat').fields, ['design', 'merk'])
})

// Keuring 15 november: alleen een bron die "sponsored content" uitsluitend in de link zet (It's Nice That) krijgt die
// toets, en alleen op dat woordpaar in de slug. Gewone slugs met "state-sponsored", "nike-sponsored" of "advertorial"
// blijven leesvoer, bij elke bron.
const iint = VAK_SOURCES.find((s) => s.id === 'vak:itsnicethat')
test('gesponsord in de slug van It\'s Nice That telt niet als leesvoer', () => {
  assert.equal(iint.sponsoredSlug, true)
  assert.equal(isReading({ title: 'Vucko’s motion identity for Etsy', url: 'https://www.itsnicethat.com/articles/vucko-etsy-motion-graphic-design-sponsored-content-121126' }, iint), false)
  assert.equal(isReading({ title: 'Vucko’s motion identity for Etsy', url: 'https://www.itsnicethat.com/articles/vucko-etsy-motion-graphic-design-121126' }, iint), true)
})

test('state-sponsored en andere gewone slugs blijven leesvoer', () => {
  const verge = VAK_SOURCES.find((s) => s.id === 'vak:theverge') || null
  const gewoon = [
    ['Hackers targeted design tools', 'https://www.wired.com/story/state-sponsored-hackers-target-designers/'],
    ['X', 'https://www.theverge.com/2026/11/1/nike-sponsored-athletes-speak-out'],
    ['X', 'https://www.theverge.com/2026/11/1/state-sponsored-hackers-target-design-firms'],
    ['X', 'https://www.theverge.com/2026/11/1/advertorial-rules-tightened-by-regulator'],
    ['X', 'https://www.example.test/2026/11/1/nation-state-sponsored-attack'],
  ]
  for (const [title, u] of gewoon) {
    assert.equal(isReading({ title, url: u }), true, u)
    assert.equal(isReading({ title, url: u }, verge), true, u)
  }
  // Ook bij It's Nice That: "state-sponsored" is geen "sponsored content".
  assert.equal(isReading({ title: 'Posters against censorship', url: 'https://www.itsnicethat.com/articles/state-sponsored-censorship-posters-121126' }, iint), true)
})
