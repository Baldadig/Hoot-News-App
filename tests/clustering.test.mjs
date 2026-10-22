import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildStories } from '../netlify/lib/stories.mjs'

// Echte berichten van 22-10 waar het bundelen te los was (review L9).
const items = JSON.parse(readFileSync(new URL('./fixtures/clustering-2210.json', import.meta.url), 'utf8'))
const stories = buildStories(items)
const byTitle = (re) => items.find((i) => re.test(i.title)).id
const storyOf = (re) => stories.find((s) => s.itemIds.includes(byTitle(re)))?.id || null
const together = (a, b) => storyOf(a) !== null && storyOf(a) === storyOf(b)

test('Trump-rally (Volkskrant) en Macron over rellen in Frankrijk zijn twee verhalen', () => {
  assert.ok(together(/op de vuist/, /Klappen uitgedeeld tijdens rally/))
  assert.ok(together(/op de vuist/, /Rally Trump meermaals/))
  assert.ok(!together(/op de vuist/, /Macron accuses/))
  // "Donald" en "Benjamin" zijn voornamen van leiders, geen eigen namen die een verhaal dragen.
  assert.ok(!together(/Macron accuses/, /Israeli elections/))
})

test('de haai in Zuid-Korea is geen verhaal over Noord-Korea', () => {
  assert.ok(together(/Haai die uitgroeide/, /Haai die na maand/))
  assert.ok(!together(/Haai die uitgroeide/, /propaganda-luidsprekers/))
  assert.ok(!together(/Haai die uitgroeide/, /Kim Jong-un gaat shoppen/))
  // Wat wél bij elkaar hoort, blijft bij elkaar.
  assert.ok(together(/propaganda-luidsprekers/, /Spanning Korea/))
})
