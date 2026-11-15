// Volgen 1.5, bouwplanstap 1.4c: het veld `volgzaak { slug, label }` op verhalen in de feed, alleen met HOOT_VOLGZAKEN=aan.
// Met de vlag uit (of op proef) leest de feed-ronde niets en verandert de feed geen byte; de golden-toetsen van de server
// (edition-server-golden, feed) blijven gelijk.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { volgzakenStand, voorraadAan, volgzaakUitKV, metVolgzaak, geldigeSlug } from '../netlify/lib/volgzaak-basis.mjs'

test('de vlag: alleen proef en aan, al het andere is uit; de noodrem van de voorraad', () => {
  assert.equal(volgzakenStand({}), 'uit')
  assert.equal(volgzakenStand({ HOOT_VOLGZAKEN: 'uit' }), 'uit')
  assert.equal(volgzakenStand({ HOOT_VOLGZAKEN: 'ja' }), 'uit')
  assert.equal(volgzakenStand({ HOOT_VOLGZAKEN: ' Aan ' }), 'aan')
  assert.equal(volgzakenStand({ HOOT_VOLGZAKEN: 'proef' }), 'proef')
  assert.equal(voorraadAan({}), true)
  assert.equal(voorraadAan({ HOOT_VOLGZAAK_VOORRAAD: 'uit' }), false)
  assert.equal(geldigeSlug('gta-6'), true)
  for (const s of ['', 'a', '-gta', 'gta-', 'GTA', 'gta 6', '../x', 'x'.repeat(41)]) assert.equal(geldigeSlug(s), false, s)
})

test('met de vlag uit of op proef wordt het feeddocument niet eens gelezen', async () => {
  let gelezen = 0
  const get = async () => (gelezen++, { s: { s1: { slug: 'gta-6', label: 'GTA 6' } } })
  assert.equal(await volgzaakUitKV({ stand: 'uit', get }), null)
  assert.equal(await volgzaakUitKV({ stand: 'proef', get }), null)
  assert.equal(gelezen, 0)
  const m = await volgzaakUitKV({ stand: 'aan', get })
  assert.deepEqual([...m], [['s1', { slug: 'gta-6', label: 'GTA 6' }]])
  // Te traag of kapot: geen veld, nooit een fout.
  assert.equal(await volgzaakUitKV({ stand: 'aan', get: () => new Promise(() => {}), budget: 20 }), null)
  assert.equal(await volgzaakUitKV({ stand: 'aan', get: async () => { throw new Error('x') } }), null)
  // Een ongeldige regel valt weg.
  const m2 = await volgzaakUitKV({ stand: 'aan', get: async () => ({ s: { a: { slug: '../x', label: 'X' }, b: { slug: 'ok-1', label: '' }, c: { slug: 'ok-2', label: 'OK' } } }) })
  assert.deepEqual([...m2.keys()], ['c'])
})

test('metVolgzaak: alleen het bedoelde verhaal krijgt het veld, ook via een oude id; zonder map dezelfde lijst', () => {
  const stories = [{ id: 's1', formerIds: [] }, { id: 's2', formerIds: ['oud'] }, { id: 's3' }]
  assert.equal(metVolgzaak(stories, null), stories)
  assert.equal(metVolgzaak(stories, new Map()), stories)
  const uit = metVolgzaak(stories, new Map([['s1', { slug: 'gta-6', label: 'GTA 6' }], ['oud', { slug: 'formatie', label: 'Formatie' }]]))
  assert.deepEqual(uit.map((s) => s.volgzaak || null), [{ slug: 'gta-6', label: 'GTA 6' }, { slug: 'formatie', label: 'Formatie' }, null])
  assert.equal(uit[2], stories[2], 'een verhaal zonder treffer blijft hetzelfde object')
  assert.ok(!('volgzaak' in stories[0]), 'de invoer wordt niet veranderd')
})

test('build.mjs leest het document alleen bij aan, vroeg gestart en aan het eind afgewacht, zonder schrijfactie', () => {
  const src = readFileSync(new URL('../netlify/lib/build.mjs', import.meta.url), 'utf8')
  assert.match(src, /const volgzaakP = volgzakenStand\(\) === 'aan' \? volgzaakUitKV\(\{ get: kvGet, budget: 1500 \}\) : Promise\.resolve\(null\)/)
  assert.match(src, /const volgzaken = await volgzaakP\n/)
  assert.match(src, /stories: metVerschillen\(metVolgzaak\(\[\.\.\.stories, .*\], volgzaken\), blokken\),/)
  assert.equal((src.match(/volgzaak/gi) || []).filter(Boolean).length > 0, true)
  assert.doesNotMatch(src, /VK\.feed|volgzaak-feed-v1/, 'de feed-ronde schrijft niets van volgzaken')
})
