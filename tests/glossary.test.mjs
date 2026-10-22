import { test } from 'node:test'
import assert from 'node:assert/strict'
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
