// Volgen 1.5, bouwplanstap 1.1: de voorraad. Schrijft vanaf de deploy van blok 1, ook met de vlag uit, zonder model.
// Samenvoegen is idempotent, een verhaal dat van id wisselt wordt gevolgd, alleen gewijzigde delen worden gelezen,
// nachtrust schrijft niets, Bluesky-berichten vallen weg, de noodrem werkt, en opruimen houdt veertien dagen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { voorraadRonde, voegSamen, stukVan, stukkenUit, voorraadDagen } from '../netlify/lib/volgzaak-voorraad.mjs'
import { volgzaakRonde } from '../netlify/lib/volgzaak-ronde.mjs'
import { opruimen } from '../netlify/lib/opruimen.mjs'
import { memIo, zetFeed } from './helpers/volgzaak-io.mjs'

const NOW = Date.parse('2026-11-20T10:00:00Z') // 11:00 in Amsterdam
const t = (uur) => new Date(NOW - uur * 36e5).toISOString()
const art = (id, source, title, extra = {}) => ({ id, kind: 'article', source, title, url: `https://example.org/${id}`, firstSeenAt: t(1), publishedAt: t(1), ...extra })

test('een stuk in de voorraad: tijd, bron, kop, link, verhaal, taal en twee vlaggen; geen intro, geen beeld', () => {
  const s = stukVan(art('a1', 'nos', 'Rockstar toont nieuwe trailer van GTA 6', { storyId: 's1', summary: 'intro', image: 'https://x/y.jpg' }))
  assert.deepEqual(s, [NOW - 36e5, 'nos', 'Rockstar toont nieuwe trailer van GTA 6', 'https://example.org/a1', 's1', 'nl', 0, 0])
  assert.ok(!JSON.stringify(s).includes('intro') && !JSON.stringify(s).includes('y.jpg'))
  assert.equal(stukVan({ id: 'b', kind: 'post', source: 'bsky', title: 'x', url: 'https://bsky.app/x', publishedAt: t(1) }), null, 'geen Bluesky-bericht')
  assert.equal(stukVan(art('c', 'nos', '')), null)
  assert.equal(stukVan({ ...art('d', 'nos', 'kop'), url: '' }), null)
  // Een aflevering krijgt de vlag (een aflevering is geen uitgever).
  assert.equal(stukVan(art('e', 'nos', 'Podcast: De Dag over GTA 6'))[6], 1)
})

test('samenvoegen is idempotent; de eerste tijd blijft en het verhaal volgt een nieuwe id', () => {
  const vandaag = '2026-11-20', gisteren = '2026-11-19'
  const s1 = { a1: [NOW - 36e5, 'nos', 'Kop', 'https://x/a1', 's1', 'nl', 0, 0] }
  const een = voegSamen({}, s1, { s1: { f: [], d: 'tech', l: null, n: 2, lead: 'a1' } }, { vandaag, gisteren })
  assert.deepEqual([...een.gewijzigd], [vandaag])
  const twee = voegSamen(een.docs, s1, { s1: { f: [], d: 'tech', l: null, n: 2, lead: 'a1' } }, { vandaag, gisteren })
  assert.equal(twee.gewijzigd.size, 0, 'dezelfde ronde nog eens verandert niets')
  assert.deepEqual(twee.docs, een.docs)
  // Hetzelfde stuk later gezien, nu bij verhaal s9 (het verhaal wisselde van id): eerste tijd blijft, verhaal wordt s9.
  const drie = voegSamen(een.docs, { a1: [NOW, 'nos', 'Kop', 'https://x/a1', 's9', 'nl', 0, 0] }, { s9: { f: ['s1'], d: 'tech', l: null, n: 3, lead: 'a1' } }, { vandaag, gisteren })
  assert.equal(drie.docs[vandaag].stukken.a1[0], NOW - 36e5)
  assert.equal(drie.docs[vandaag].stukken.a1[4], 's9')
  assert.deepEqual(drie.docs[vandaag].verhalen.s9.f, ['s1'])
  // Een stuk dat al gisteren in de voorraad stond, blijft in het document van gisteren.
  const g = voegSamen({ [gisteren]: { meta: { v: 1 }, stukken: { b1: [NOW - 20 * 36e5, 'nu', 'Oud', 'u', null, 'nl', 0, 0] }, verhalen: {} } }, { b1: [NOW - 20 * 36e5, 'nu', 'Oud bijgewerkt', 'u', 's2', 'nl', 0, 0] }, {}, { vandaag, gisteren })
  assert.equal(g.docs[gisteren].stukken.b1[2], 'Oud bijgewerkt')
  assert.ok(!('b1' in g.docs[vandaag].stukken))
  // Een stuk van eergisteren valt buiten bereik.
  const e = voegSamen({}, { c1: [NOW - 60 * 36e5, 'nu', 'Te oud', 'u', null, 'nl', 0, 0] }, {}, { vandaag, gisteren })
  assert.equal(Object.keys(e.docs[vandaag].stukken).length + Object.keys(e.docs[gisteren].stukken).length, 0)
})

test('de ronde leest alleen gewijzigde delen, schrijft per Nederlandse dag, en doet niets bij nachtrust', async () => {
  const io = memIo()
  const parts = { nos: [art('a1', 'nos', 'GTA 6 krijgt releasedatum', { storyId: 's1' })], nu: [art('a2', 'nu', 'Releasedatum GTA 6 bekend', { storyId: 's1' })], bsky: [{ id: 'p1', kind: 'post', source: 'bsky', title: 'x', url: 'https://bsky.app/p', publishedAt: t(1) }] }
  zetFeed(io, { parts, stories: [{ id: 's1', formerIds: [], desk: 'tech', publisherCount: 2, leadId: 'a1' }] })
  const r1 = await voorraadRonde({ now: NOW, lees: io.lees, leesArchief: io.leesArchief, schrijfArchief: io.schrijfArchief, env: {} })
  assert.equal(r1.stats.gelezen, 3)
  const doc = io.arch.get('volgzaak-voorraad:2026-11-20')
  assert.deepEqual(Object.keys(doc.stukken).sort(), ['a1', 'a2'], 'het Bluesky-bericht valt weg')
  assert.equal(doc.verhalen.s1.n, 2)
  assert.equal(doc.meta.builtAt, '2026-11-20T09:50:00.000Z')
  // Nachtrust: dezelfde feed, niets gelezen, niets geschreven.
  io.log.length = 0
  const r2 = await voorraadRonde({ now: NOW + 6e5, lees: io.lees, leesArchief: io.leesArchief, schrijfArchief: io.schrijfArchief, env: {} })
  assert.equal(r2.stats.nachtrust, true)
  assert.ok(!io.log.some(([op, k]) => op === 'lees' && k.startsWith('feed-part-')))
  assert.ok(!io.log.some(([op]) => op === 'schrijfArchief'))
  // Een nieuwe ronde waarin alleen nu veranderde: alleen dat deel wordt gelezen.
  const tags = JSON.parse(io.docs.get('feed-start-v1').body).meta.parts
  zetFeed(io, { parts: { ...parts, nu: [...parts.nu, art('a3', 'nu', 'Nog een stuk', {})] }, stories: [{ id: 's1', publisherCount: 2, leadId: 'a1' }], builtAt: '2026-11-20T10:00:00.000Z', tags: { ...tags, nu: 'nieuw' } })
  io.log.length = 0
  const r3 = await voorraadRonde({ now: NOW + 6e5, lees: io.lees, leesArchief: io.leesArchief, schrijfArchief: io.schrijfArchief, env: {} })
  assert.deepEqual(io.log.filter(([op, k]) => op === 'lees' && k.startsWith('feed-part-')).map(([, k]) => k), ['feed-part-nu'])
  assert.equal(r3.stats.gelezen, 1)
  assert.ok('a3' in io.arch.get('volgzaak-voorraad:2026-11-20').stukken)
  assert.ok('a1' in io.arch.get('volgzaak-voorraad:2026-11-20').stukken, 'wat er al stond blijft')
})

test('de noodrem HOOT_VOLGZAAK_VOORRAAD=uit zet alleen het schrijven stil', async () => {
  const io = memIo()
  zetFeed(io, { parts: { nos: [art('a1', 'nos', 'Kop')] } })
  const r = await voorraadRonde({ now: NOW, lees: io.lees, leesArchief: io.leesArchief, schrijfArchief: io.schrijfArchief, env: { HOOT_VOLGZAAK_VOORRAAD: 'uit' } })
  assert.equal(r.stats.uit, 'noodrem')
  assert.equal(io.log.length, 0)
})

test('met de vlag uit schrijft de ronde alleen de voorraad: geen index, geen model, geen netwerk', async () => {
  const io = memIo()
  zetFeed(io, { parts: { nos: [art('a1', 'nos', 'GTA 6 krijgt releasedatum', { storyId: 's1' })] } })
  const fetchWas = globalThis.fetch
  globalThis.fetch = () => { throw new Error('geen netwerk in de ronde') }
  try {
    for (const env of [{}, { HOOT_VOLGZAKEN: 'nee' }, { HOOT_VOLGZAKEN: 'uit' }]) {
      io.log.length = 0
      io.arch.clear()
      const { stats } = await volgzaakRonde({ now: NOW, env, io })
      assert.equal(stats.stand, 'uit')
      assert.deepEqual([...new Set(io.log.map(([op]) => op))].sort(), ['lees', 'leesArchief', 'schrijfArchief'], JSON.stringify(env))
      assert.ok(io.log.every(([, k]) => k.startsWith('feed-') || k.startsWith('volgzaak-voorraad:')))
    }
  } finally {
    globalThis.fetch = fetchWas
  }
  for (const f of ['volgzaak-voorraad.mjs', 'volgzaak-ronde.mjs', 'volgzaak-match.mjs', 'volgzaak-basis.mjs']) assert.doesNotMatch(readFileSync(new URL(`../netlify/lib/${f}`, import.meta.url), 'utf8'), /@anthropic-ai\/sdk/, f)
  assert.doesNotMatch(readFileSync(new URL('../netlify/functions/volgzaak-ronde.mjs', import.meta.url), 'utf8'), /anthropic/i)
})

test('de stukken uit de voorraad als lijst; de dagen van de voorraad', () => {
  const docs = { a: { meta: { dag: '2026-11-19' }, stukken: { x: [2, 'nos', 'K', 'u', 's1', 'nl', 0, 1] }, verhalen: { s1: { n: 2 } } }, b: { meta: { dag: '2026-11-20' }, stukken: { x: [5, 'nos', 'K2', 'u', 's2', 'nl', 0, 1] }, verhalen: {} } }
  const { stukken, verhalen } = stukkenUit(docs)
  assert.equal(stukken.length, 1)
  assert.equal(stukken[0].t, 2, 'de eerste tijd wint')
  assert.equal(stukken[0].haags, true)
  assert.equal(verhalen.s1.n, 2)
  const dagen = voorraadDagen(NOW)
  assert.equal(dagen.length, 15)
  assert.equal(dagen[0], '2026-11-20')
  assert.equal(dagen[14], '2026-11-06')
})

test('opruimen: de voorraad veertien dagen plus vandaag, momentopnamen vijf dagdelen terug, tellers vandaag en gisteren; de rest van volgzaak blijft', async () => {
  const now = Date.parse('2026-11-20T13:00:00Z') // middag
  const weg = ['volgzaak-voorraad:2026-11-05', 'volgzaak-voorraad:2026-10-01', 'volgzaak-stand:gta-6:2026-11-18-middag', 'volgzaak-dag-usd:2026-11-12', 'volgzaak-quota-user-1-2026-11-18', 'volgzaak-quota-all-2026-11-18', 'volgzaak-tik-user-1-2026-11-17']
  const houd = ['volgzaak-voorraad:2026-11-06', 'volgzaak-voorraad:2026-11-20', 'volgzaak-stand:gta-6:2026-11-18-avond', 'volgzaak-stand:gta-6:2026-11-20-middag', 'volgzaak-dag-usd:2026-11-13', 'volgzaak-quota-user-1-2026-11-19', 'volgzaak-tik-user-1-2026-11-20']
  const nooit = ['volgzaak-def:gta-6', 'volgzaak-lijst-v1', 'volgzaak-alias:abc', 'volgzaak-volgers:gta-6', 'volgzaak-treffers:gta-6', 'volgzaak-oordeel:gta-6', 'volgzaak-wachtrij-v1', 'volgzaak-feed-v1', 'volgzaak-proef-v1']
  const s = new Set([...weg, ...houd, ...nooit])
  const r = await opruimen({ now, list: async (p) => [...s].filter((k) => k.startsWith(p)), remove: async (k) => s.delete(k), log: { log() {}, error() {} } })
  for (const k of weg) assert.ok(!s.has(k), k)
  for (const k of [...houd, ...nooit]) assert.ok(s.has(k), k)
  assert.equal(r.verwijderd, weg.length)
})
