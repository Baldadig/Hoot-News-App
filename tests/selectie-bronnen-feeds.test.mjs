// Selectie-review 14 november, punt 4: bronnen op pauze. Vier kregen de feed die de uitgever zelf aanbiedt (gemeten vanaf
// de Mac met de gewone User-Agent van Hoot; niets omzeild). De bronnen die Netlify weigeren maar vanaf de Mac op hun eigen
// adres werken (Creative Review, Design Week, Marketing Week, MT/Sprout, The Architect's Newspaper, Skipr, Zorg+Welzijn,
// Nursing), houden hun adres: een ander adres van dezelfde site zou de weigering alleen ontwijken.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VAK_SOURCES } from '../netlify/lib/vak.mjs'

const url = (id) => VAK_SOURCES.find((s) => s.id === 'vak:' + id).urls[0]

test('de officiële feed in plaats van een doorverwijzing, cookie- of inlogpagina', () => {
  assert.equal(url('emerce'), 'https://www.emerce.nl/feed')
  assert.equal(url('techpulse'), 'https://techpulse.be/feed/')
  assert.equal(url('zorgvisie'), 'https://www.zorgvisie.nl/feed/')
  assert.equal(url('focus-film'), 'https://focus.knack.be/film/feed/')
  for (const id of ['creativereview', 'designweek', 'marketingweek', 'sprout', 'archpaper', 'skipr', 'zorgwelzijn', 'nursing']) assert.match(url(id), /^https:\/\//, id)
})
