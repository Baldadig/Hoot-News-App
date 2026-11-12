import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TERMS, termsIn } from '../src/lib/glossary.js'

test('begrippen worden gevonden, ook in andere vormen; hooguit twee', () => {
  assert.deepEqual(termsIn('De informateur en de formateur spreken met de partijen').map((t) => t.term), ['informateur', 'formateur'])
  assert.deepEqual(termsIn('Kamer dient moties van wantrouwen in').map((t) => t.term), ['motie van wantrouwen'])
  assert.deepEqual(termsIn('Raad van State, Hoge Raad en hoger beroep', 2).length, 2)
})

test('gewone woorden die erop lijken, tellen niet', () => {
  for (const s of ['Het bestand is beschadigd', 'De omgeving van het kamp', 'Informatie over de formatie', 'Cassette uit de jaren tachtig']) assert.deepEqual(termsIn(s), [], s)
})

test('elke uitleg is kort, heeft een Wikipedia-bron en een unieke term', () => {
  const seen = new Set()
  for (const t of TERMS) {
    assert.ok(!seen.has(t.term), t.term)
    seen.add(t.term)
    assert.ok(t.text.length <= 220, `${t.term} te lang`)
    assert.match(t.source, /^https:\/\/nl\.wikipedia\.org\//)
  }
})

// De lijst komt uit shared/glossary.json; de app leest een bytegelijke kopie (npm run build:core).
test('de lijst staat in shared/glossary.json en de app heeft dezelfde kopie', () => {
  const shared = readFileSync(new URL('../shared/glossary.json', import.meta.url))
  assert.deepEqual(readFileSync(new URL('../ios/Hoot/Resources/glossary.json', import.meta.url)), shared)
  const json = JSON.parse(shared)
  assert.equal(TERMS.length, json.terms.length)
  assert.equal(TERMS.length, 32)
  for (const [i, t] of json.terms.entries()) {
    assert.deepEqual(Object.keys(t), ['term', 'pattern', 'flags', 'text', 'source'])
    assert.match(t.flags, /^i?$/, `${t.term}: alleen de i-vlag, die kent de app ook`)
    assert.equal(TERMS[i].match.source, t.pattern)
    assert.equal(TERMS[i].text, t.text)
  }
})

// Gedeelde voorbeeldkoppen: de app toetst dezelfde gevallen (ios/HootTests/GlossaryTests.swift).
test('voorbeeldkoppen: dezelfde begrippen als de app', () => {
  const { cases } = JSON.parse(readFileSync(new URL('./fixtures/glossary-cases.json', import.meta.url)))
  assert.ok(cases.length > 200)
  for (const c of cases) assert.deepEqual(termsIn(c.text, c.max).map((t) => t.term), c.terms, c.text)
})
