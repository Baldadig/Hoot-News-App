import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { voorproefje, VOORPROEF } from '../src/lib/selection-index.js'
import { vakByDomain } from '../shared/vak.mjs'

// Keuze r5-selectie-onderwerpen (5 november; review G13): de lege Selectie toont een voorproefje.
test('voorproefje: per domein het eerste onderwerp met stukken, hooguit drie, elk met zijn beste stuk', () => {
  const domains = vakByDomain()
  const fields = domains.flatMap((d) => d.fields).map((f, i) => ({ id: f.id, top: i % 2 ? [{ id: 'a' + i, title: 'Stuk ' + i }] : [] }))
  const p = voorproefje(domains, fields)
  assert.ok(p.length > 0 && p.length <= 3)
  assert.equal(new Set(p.map((x) => domains.find((d) => d.fields.some((f) => f.id === x.id)).id)).size, p.length, 'elk uit een ander domein')
  for (const x of p) assert.ok(x.label && x.item?.title)
  assert.deepEqual(voorproefje(domains, []), [])
  assert.match(VOORPROEF, /per onderwerp de beste stukken van de week/)
})

test('Vak.jsx: alleen bij niets gekozen, met echte kaarten onder "Kies onderwerpen"', () => {
  const s = readFileSync(new URL('../src/views/Vak.jsx', import.meta.url), 'utf8')
  assert.match(s, /const proef = chosen\.length \? \[\] : voorproefje\(vakByDomain\(\), digest\?\.fields \|\| \[\]\)/)
  assert.ok(s.indexOf("pickRow('Kies onderwerpen', 'Nog niets gekozen')") < s.indexOf('className="dproef"'))
  assert.match(s, />\s*Voorproefje\s*</)
})
