import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cleanIntro, withCleanIntro, headlineTier, HALF_HEADLINE_LINES } from '../shared/edition-display.mjs'
import { leadCandidates } from '../netlify/lib/stories.mjs'
import { wholeSentences } from '../shared/zinnen.mjs'
import { heroFirst, numberRows } from '../src/lib/edition.js'
const fixture = JSON.parse(readFileSync(new URL('./fixtures/edition-display.json', import.meta.url)))
for (const c of fixture.intro) test(`gedeelde introruis: ${c.name}`, () => {
  assert.equal(cleanIntro(c.in, c.author), c.out)
  assert.equal(cleanIntro(c.out, c.author), c.out, 'idempotent')
})
test('koprollen en het budget voor halve kolommen komen uit één contract', () => {
  for (const c of fixture.headline) assert.equal(headlineTier('x'.repeat(c.length)), c.tier)
  assert.equal(HALF_HEADLINE_LINES, 4)
  assert.deepEqual(readFileSync(new URL('../shared/edition-display.json', import.meta.url)), readFileSync(new URL('../ios/Hoot/Resources/edition-display.json', import.meta.url)))
})
test('bronruis levert geen intro of kwaliteitsbonus op; posts behouden hun eigen tekst', () => {
  assert.equal(wholeSentences('Updated at 6:16 p.m.'), '')
  const post = { kind: 'post', summary: 'Updated at 6:16 p.m.' }
  assert.equal(withCleanIntro(post), post)
  const article = { kind: 'article', summary: 'Updated at 6:16 p.m.', text: 'By Reuters' }
  assert.equal(withCleanIntro(article).summary, '')
  assert.equal(withCleanIntro(article).text, '')
  const clean = { kind: 'article', summary: 'Een gewoon verhaal.' }
  assert.equal(withCleanIntro(clean), clean)
})
test('een passende kop is een kleine kwaliteitskeuze binnen een verhaal; voorkeursbron blijft leidend', () => {
  const now = Date.parse('2026-11-02T05:00:00Z')
  const long = { id: 'long', source: 'a', title: 'x'.repeat(146), summary: 'Een echte intro.', publishedAt: new Date(now).toISOString() }
  const short = { ...long, id: 'short', source: 'b', title: 'Een korte, duidelijke kop.' }
  assert.equal(leadCandidates([long, short], new Set(['a', 'b']), null, now, { role: 'front' })[0].id, 'short')
  assert.equal(leadCandidates([long, short], new Set(['a', 'b']), new Set(['a']), now, { role: 'front' })[0].id, 'long')
  const noise = { ...short, id: 'noise', summary: 'Updated at 6:16 p.m.' }
  assert.equal(leadCandidates([noise, short], new Set(['b']), null, now)[0].id, 'short')
})
test('een Nederlandse opening wordt nooit door een buitenlandse foto vervangen', () => {
  const rows = [{ key: 'nl', desk: 'binnenland', item: { id: 'nl', image: null } }, { key: 'int', desk: 'buitenland', item: { id: 'int', image: 'goed.jpg' } }]
  assert.deepEqual(numberRows(heroFirst(rows, () => true)).map(r => [r.key, r.n]), [['nl', 1], ['int', 2]])
})
