// Volgen 1.5, bouwplanstap 1.4b: de geplande volgzaak-ronde. Met de vlag uit alleen de voorraad; bij proef matching,
// wachtrij en momentopname maar geen feeddocument; bij aan ook het feeddocument (meeste volgers per verhaal). Een
// momentopname per dagdeel blijft vast binnen het dagdeel; de wachtrij zet de meeste volgers eerst; de opslag van luister
// wordt niet aangeraakt; een stille volgzaak kost geen oordelen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { volgzaakRonde, voegTreffersSamen, ordeWachtrij, feedVan, momentopname } from '../netlify/lib/volgzaak-ronde.mjs'
import { memIo, zetFeed } from './helpers/volgzaak-io.mjs'

const NOW = Date.parse('2026-11-20T10:00:00Z') // ochtend in Amsterdam
const iso = (ms) => new Date(ms).toISOString()
const art = (id, source, title, storyId, uur = 1) => ({ id, kind: 'article', source, title, url: `https://x/${id}`, firstSeenAt: iso(NOW - uur * 36e5), publishedAt: iso(NOW - uur * 36e5), storyId })
const GTA = { v: 1, slug: 'gta-6', label: 'GTA 6', regel: 'De nieuwe GTA', namen: { nl: ['GTA 6'], en: [] }, aliassen: ['GTA VI'], context: [], uit: [], algemeen: [], rubriek: 'cultuur', at: iso(NOW - 2 * 864e5), status: 'actief' }
const TATA = { ...GTA, slug: 'tata-steel', label: 'Tata Steel', namen: { nl: ['Tata Steel'], en: [] }, aliassen: [], rubriek: 'economie' }

function wereld({ volgersGta = 3, volgersTata = 1 } = {}) {
  const io = memIo({
    'volgzaak-def:gta-6': GTA,
    'volgzaak-def:tata-steel': TATA,
    'volgzaak-volgers:gta-6': volgersGta,
    'volgzaak-volgers:tata-steel': volgersTata,
    'volgzaak-lijst-v1': { 'gta-6': { label: 'GTA 6', status: 'actief', volgers: volgersGta }, 'tata-steel': { label: 'Tata Steel', status: 'actief', volgers: volgersTata } },
    'luister-oordeel-v7': { v: 1, o: {} },
    'luister-wachtrij-v1': { v: 1, vragen: [] },
  })
  zetFeed(io, {
    stories: [{ id: 's1', desk: 'cultuur', publisherCount: 2, leadId: 'a1' }, { id: 's2', desk: 'cultuur', publisherCount: 2, leadId: 'b1' }, { id: 's3', desk: 'economie', publisherCount: 2, leadId: 'c1' }],
    parts: {
      nos: [art('a1', 'nos', 'Releasedatum GTA 6 bekend', 's1'), art('c1', 'nos', 'Tata Steel moet uitstoot verminderen', 's3', 3)],
      tweakers: [art('a2', 'tweakers', 'Rockstar noemt datum voor GTA 6', 's1'), art('b1', 'tweakers', 'GTA VI krijgt pc-versie later', 's2', 2)],
      nu: [art('b2', 'nu', 'Pc-spelers moeten wachten', 's2', 2), art('c2', 'nu', 'Rechtszaak tegen fabriek in IJmuiden', 's3', 3)],
    },
  })
  return io
}

test('met de vlag uit: alleen de voorraad, geen index, geen treffers, geen wachtrij, geen feeddocument', async () => {
  const io = wereld()
  const { stats } = await volgzaakRonde({ now: NOW, env: {}, io })
  assert.equal(stats.stand, 'uit')
  assert.ok(io.log.every(([, k]) => k.startsWith('feed-') || k.startsWith('volgzaak-voorraad:')), JSON.stringify(io.log.filter(([, k]) => !k.startsWith('feed-') && !k.startsWith('volgzaak-voorraad:'))))
  assert.ok(io.arch.has('volgzaak-voorraad:2026-11-20'))
})

test('proef: treffers, wachtrij en momentopname, maar niets in de feed', async () => {
  const io = wereld()
  const { stats } = await volgzaakRonde({ now: NOW, env: { HOOT_VOLGZAKEN: 'proef' }, io })
  assert.equal(stats.volgzaken, 2)
  assert.ok(!io.kv.has('volgzaak-feed-v1'), 'geen feeddocument bij proef')
  const tr = io.kv.get('volgzaak-treffers:gta-6').s
  assert.equal(tr.s1[0], 'z')
  assert.equal(tr.s2[0], 't')
  assert.equal(io.kv.get('volgzaak-treffers:tata-steel').s.s3[0], 't')
  assert.ok(io.kv.has('volgzaak-stand:gta-6:2026-11-20-ochtend'))
  assert.equal(io.kv.get('volgzaak-lijst-v1')['gta-6'].stand, '2026-11-20-ochtend')
  assert.ok(io.kv.get('volgzaak-lijst-v1')['gta-6'].laatstNieuw)
  assert.equal(io.kv.get('volgzaak-proef-v1').slots['2026-11-20-ochtend'].perVolgzaak['gta-6'].z, 1)
  // De opslag van luister is niet aangeraakt.
  assert.ok(!io.log.some(([op, k]) => op !== 'get' && k.startsWith('luister-')))
  assert.ok(!io.log.some(([, k]) => k.startsWith('luister-')))
})

test('de wachtrij: meeste volgers eerst, met de koppen van het hele verhaal als gegevens', async () => {
  const io = wereld({ volgersGta: 1, volgersTata: 9 })
  await volgzaakRonde({ now: NOW, env: { HOOT_VOLGZAKEN: 'aan' }, io })
  const rij = io.kv.get('volgzaak-wachtrij-v1')
  assert.deepEqual(rij.vragen.map((v) => `${v.slug}|${v.key}`), ['tata-steel|s3', 'gta-6|s2'])
  assert.match(rij.vragen[0].prompt, /Gevolgd: Tata Steel/)
  assert.match(rij.vragen[0].prompt, /Rechtszaak tegen fabriek in IJmuiden/, 'ook het stuk zonder de naam')
  assert.equal(rij.vragen[0].volgers, 9)
})

test('ordeWachtrij: volgers, dan wie vandaag het minst beoordeeld is, dan uitgevers, dan nieuwste', () => {
  const v = (slug, key, volgers, pubs, laatst) => ({ slug, key, volgers, pubs, laatst })
  const rij = ordeWachtrij([v('a', 'x', 1, 1, 5), v('b', 'y', 5, 1, 1), v('c', 'z', 5, 1, 9), v('b', 'w', 5, 3, 0), v('b', 'u', 5, 3, 7)], { vandaag: { b: 0, c: 4 } })
  assert.deepEqual(rij.map((x) => `${x.slug}${x.key}`), ['bu', 'bw', 'by', 'cz', 'ax'])
})

test('aan: het feeddocument met zekere treffers uit de laatste 36 uur, per verhaal de volgzaak met de meeste volgers', async () => {
  const io = wereld()
  // Een tweede volgzaak die hetzelfde verhaal zeker raakt, met meer volgers.
  io.kv.set('volgzaak-def:rockstar', { ...GTA, slug: 'rockstar', label: 'Rockstar', namen: { nl: ['Rockstar', 'GTA 6'], en: [] }, aliassen: [] })
  io.kv.set('volgzaak-volgers:rockstar', 8)
  io.kv.get('volgzaak-lijst-v1').rockstar = { label: 'Rockstar', status: 'actief', volgers: 8 }
  const { stats } = await volgzaakRonde({ now: NOW, env: { HOOT_VOLGZAKEN: 'aan' }, io })
  const feed = io.kv.get('volgzaak-feed-v1')
  assert.deepEqual(feed.s, { s1: { slug: 'rockstar', label: 'Rockstar' } })
  assert.equal(stats.inFeed, 1)
  // Twijfel (s2, s3) komt niet in de feed; een los stuk ook nooit.
  assert.deepEqual(feedVan([{ slug: 'x', label: 'X', volgers: 1, treffers: { s: { 'los:a': ['z', 2, NOW, NOW], s9: ['z', 2, NOW - 40 * 36e5, NOW], s8: ['j', 1, NOW, NOW], s7: ['n', 1, NOW, NOW] } } }], { now: NOW }).s, { s8: { slug: 'x', label: 'X' } })
})

test('aan: een volgzaak zonder volgers wordt niet bijgewerkt; met de vlag aan wel bij proef', async () => {
  const io = wereld({ volgersGta: 0, volgersTata: 0 })
  const { stats } = await volgzaakRonde({ now: NOW, env: { HOOT_VOLGZAKEN: 'aan' }, io })
  assert.equal(stats.volgzaken, 0)
  assert.deepEqual(io.kv.get('volgzaak-feed-v1').s, {})
})

test('de momentopname is vast binnen een dagdeel en wordt pas in het volgende dagdeel opnieuw geschreven', async () => {
  const io = wereld()
  const env = { HOOT_VOLGZAKEN: 'aan' }
  await volgzaakRonde({ now: NOW, env, io })
  const eerst = io.kv.get('volgzaak-stand:gta-6:2026-11-20-ochtend')
  // Later in hetzelfde dagdeel komt er een zeker verhaal bij: de momentopname blijft gelijk.
  zetFeed(io, { stories: [{ id: 's4', desk: 'cultuur', publisherCount: 2, leadId: 'd1' }], parts: { nos: [art('d1', 'nos', 'GTA 6 trailer breekt record', 's4', 0)], nu: [art('d2', 'nu', 'Record voor trailer GTA 6', 's4', 0)] }, builtAt: '2026-11-20T10:20:00.000Z', tags: { nos: 'n2', nu: 'u2' } })
  await volgzaakRonde({ now: NOW + 20 * 6e4, env, io })
  assert.deepEqual(io.kv.get('volgzaak-stand:gta-6:2026-11-20-ochtend'), eerst)
  assert.equal(io.kv.get('volgzaak-treffers:gta-6').s.s4[0], 'z', 'de treffers lopen wel door')
  // In de middag een nieuwe momentopname, met het nieuwe verhaal.
  const middag = Date.parse('2026-11-20T12:30:00Z')
  await volgzaakRonde({ now: middag, env, io })
  const nieuw = io.kv.get('volgzaak-stand:gta-6:2026-11-20-middag')
  assert.ok(nieuw.verhalen.some((v) => v.verhaal === 's4'))
  assert.ok(!eerst.verhalen.some((v) => v.verhaal === 's4'))
})

test('treffers samenvoegen: zeker wint, een bewaard oordeel blijft bij twijfel, ook na een nieuwe id; oud valt weg', () => {
  const m = (oordeel, extra = {}) => ({ oordeel, pubs: 1, laatst: NOW, eerst: NOW - 1, kop: 'K', bron: 'nos', url: 'u', desk: null, stukken: [], f: [], ...extra })
  const cur = { s: { a: ['j', 1, NOW - 5, NOW - 9], b: ['n', 1, NOW - 5, NOW - 9], oud: ['z', 3, NOW - 22 * 864e5, NOW - 23 * 864e5] } }
  const { doc, nieuwZeker } = voegTreffersSamen(cur, new Map([['a', m('t')], ['b', m('z', { pubs: 2 })], ['c', m('t', { f: ['a'] })], ['d', m('z')]]), { now: NOW })
  assert.equal(doc.s.a[0], 'j')
  assert.equal(doc.s.b[0], 'z')
  assert.equal(doc.s.c[0], 'j', 'het oordeel van de oude id geldt')
  assert.equal(doc.s.d[0], 'z')
  assert.ok(!('oud' in doc.s))
  assert.equal(nieuwZeker, 3)
  assert.equal(doc.s.a[3], NOW - 9, 'de eerste tijd blijft')
})

test('stil: drie weken geen nieuw zeker verhaal geeft status stil, en een stille volgzaak komt niet in de wachtrij', async () => {
  const io = wereld({ volgersGta: 2, volgersTata: 2 })
  io.kv.set('volgzaak-def:tata-steel', { ...TATA, at: iso(NOW - 30 * 864e5) })
  await volgzaakRonde({ now: NOW, env: { HOOT_VOLGZAKEN: 'aan' }, io })
  assert.equal(io.kv.get('volgzaak-lijst-v1')['tata-steel'].status, 'stil')
  assert.equal(io.kv.get('volgzaak-lijst-v1')['gta-6'].status, 'actief')
  assert.ok(!io.kv.get('volgzaak-wachtrij-v1').vragen.some((v) => v.slug === 'tata-steel'))
})

test('momentopname: alleen zeker en ja, nieuwste eerst, met betaalbron en rubriek', () => {
  const s = momentopname(GTA, { s: { a: ['z', 2, NOW - 10, 0, 'Kop A', 'nrc', 'u', 'cultuur'], b: ['t', 1, NOW, 0, 'Kop B', 'nos', 'u', null], c: ['j', 1, NOW - 5, 0, 'Kop C', 'nos', 'u', null] } }, { slot: '2026-11-20-ochtend', now: NOW })
  assert.deepEqual(s.verhalen.map((v) => v.verhaal), ['c', 'a'])
  assert.equal(s.verhalen[1].betaald, true)
  assert.equal(s.verhalen[1].rubriek, 'cultuur')
})

test('de ronde laat een volgzaak die vandaag vol zit uit de wachtrij, en legt een bewaard oordeel over twijfel', async () => {
  const io = wereld({ volgersGta: 9, volgersTata: 1 })
  io.kv.set('volgzaak-dag-usd:2026-11-20', { dag: '2026-11-20', usd: 1, per: { 'gta-6': 12 } })
  io.kv.set('volgzaak-oordeel:tata-steel', { v: 1, o: {}, p: {} })
  await volgzaakRonde({ now: NOW, env: { HOOT_VOLGZAKEN: 'aan' }, io })
  assert.deepEqual(io.kv.get('volgzaak-wachtrij-v1').vragen.map((v) => `${v.slug}|${v.key}`), ['tata-steel|s3'])
  // Een oordeel dat de treffers niet haalde, komt er de volgende ronde alsnog in.
  io.kv.set('volgzaak-oordeel:tata-steel', { v: 1, o: { s3: ['j', NOW, 'nep'] } })
  await volgzaakRonde({ now: NOW + 6e5, env: { HOOT_VOLGZAKEN: 'aan' }, io })
  assert.equal(io.kv.get('volgzaak-treffers:tata-steel').s.s3[0], 'j')
  assert.deepEqual(io.kv.get('volgzaak-wachtrij-v1').vragen, [])
})
