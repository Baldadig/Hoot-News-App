// Selectie-review 14 november, punt 10: de bundel bevroor op maandag na de eerste ronde. Nu stelt elke ronde op maandag
// tot de middag hem opnieuw samen, en blijft wat al in de top stond op zijn plek (geen verspringen voor wie al las). In
// het weekend gaan de beelden van de komende bundel voor.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composeVak, isReading, recomposing, beforeNextBundle, nextBundleAt, topIds, VAK_SOURCES } from '../netlify/lib/vak.mjs'
import { refreshVak } from '../netlify/lib/vakRefresh.mjs'
import { kvSet, kvGet, readDoc, writeDoc, KEYS } from '../netlify/lib/kv.mjs'

const src = (id) => VAK_SOURCES.find((s) => s.id === 'vak:' + id)
const ams = (iso) => Date.parse(iso) // tijden hieronder in UTC; in november is Amsterdam UTC+1
let n = 0
const it = (source, title, publishedAt, more = {}) => ({ id: 'w' + n++, source: 'vak:' + source, sourceName: src(source).name, title, summary: '', url: 'https://example.org/w' + n, publishedAt, author: 'Iemand', ...more })

test('maandag tot de middag opnieuw samenstellen; in het weekend de komende bundel', () => {
  assert.equal(recomposing(ams('2026-11-16T06:05:00Z')), true, 'maandag 07:05')
  assert.equal(recomposing(ams('2026-11-16T10:05:00Z')), true, 'maandag 11:05')
  assert.equal(recomposing(ams('2026-11-16T11:05:00Z')), false, 'maandag 12:05')
  assert.equal(recomposing(ams('2026-11-16T05:30:00Z')), false, 'maandag 06:30: de bundel is er nog niet')
  assert.equal(recomposing(ams('2026-11-17T08:00:00Z')), false, 'dinsdag')
  assert.equal(beforeNextBundle(ams('2026-11-21T10:00:00Z')), true, 'zaterdag')
  assert.equal(beforeNextBundle(ams('2026-11-22T22:00:00Z')), true, 'zondag')
  assert.equal(beforeNextBundle(ams('2026-11-16T05:00:00Z')), true, 'maandag 06:00')
  assert.equal(beforeNextBundle(ams('2026-11-16T07:00:00Z')), false, 'maandag 08:00')
  assert.equal(beforeNextBundle(ams('2026-11-20T10:00:00Z')), false, 'vrijdag')
  assert.equal(new Date(nextBundleAt(ams('2026-11-21T10:00:00Z'))).toISOString(), '2026-11-23T06:01:00.000Z')
})

test('keep: wat al in de top stond blijft op zijn plek, met hetzelfde stuk vooraan; er komt alleen bij wat ontbrak', () => {
  const now = ams('2026-11-16T09:05:00Z')
  const at = '2026-11-12T09:00:00.000Z'
  const a = it('filmkrant', 'Een essay over stilte in de Europese cinema', at)
  const b = it('rogerebert', 'Why slow cinema matters now more than ever', at)
  const eerst = composeVak([a, b], { now })
  const film1 = eerst.fields.find((f) => f.id === 'film')
  assert.deepEqual(film1.top.map((e) => e.id), [a.id, b.id])
  // Een uur later: een groot verhaal met drie bronnen dat nu bovenaan zou komen, en een zwaardere bron bij het verhaal van a.
  const d1 = it('vpro-cinema', 'Wim Wenders maakt verrassend een film over de Afsluitdijk', at)
  const d2 = it('filmtotaal', 'Wim Wenders maakt een film over de Afsluitdijk, met Carice van Houten', at)
  const d3 = it('vk-films', 'Wim Wenders gaat een film over de Afsluitdijk maken', at)
  const a2 = it('indiewire', 'Een essay over stilte in de Europese cinema: waarom het werkt', at)
  const pool = [a, b, d1, d2, d3, a2]
  const zonder = composeVak(pool, { now }).fields.find((f) => f.id === 'film')
  assert.ok([d1.id, d2.id, d3.id].includes(zonder.top[0].id), 'zonder keep zou het grote verhaal bovenaan springen')
  const met = composeVak(pool, { now, keep: topIds(eerst) }).fields.find((f) => f.id === 'film')
  assert.equal(met.top[0].id, a.id, 'plek 1 blijft, met hetzelfde stuk vooraan in zijn groep')
  assert.equal(met.top[1].id, b.id, 'plek 2 blijft')
  assert.ok([d1.id, d2.id, d3.id].includes(met.top[2].id), 'plek 3 was leeg en komt erbij')
  assert.equal(met.top.length, 3)
})

// Een ronde van vak-refresh met nep-feeds: elke feed is leeg, elk artikel heeft een deelbeeld.
async function withFetch(fn) {
  const orig = globalThis.fetch
  const tried = []
  globalThis.fetch = async (url) => {
    const u = String(url)
    if (u.startsWith('https://example.org/')) {
      tried.push(u)
      return new Response(`<html><head><meta property="og:image" content="https://img.example.org/${u.split('/').pop()}.jpg"></head><body></body></html>`, { status: 200, headers: { 'content-type': 'text/html' } })
    }
    return new Response('<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>', { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  }
  try {
    return await fn(tried)
  } finally {
    globalThis.fetch = orig
  }
}

test('vak-refresh: op maandagochtend elk uur opnieuw, de top blijft staan; na de middag niet meer', async () => {
  await withFetch(async () => {
    await kvSet(KEYS.vakSince, '2026-10-01T00:00:00.000Z')
    await kvSet(KEYS.vakHealth, {})
    await writeDoc(KEYS.vak, { body: '{}', builtAt: '2026-11-09T06:05:00.000Z', etag: 'oud', week: '2026-W45', preview: false })
    const at = '2026-11-12T09:00:00.000Z'
    const a = it('filmkrant', 'Een essay over stilte in de Europese cinema', at, { image: 'https://img.example.org/a.jpg' })
    const b = it('rogerebert', 'Why slow cinema matters now more than ever', at, { image: 'https://img.example.org/b.jpg' })
    await kvSet(KEYS.vakPool, [a, b])
    const eerste = await refreshVak({ now: ams('2026-11-16T06:05:00Z') })
    assert.equal(eerste.week, '2026-W46')
    const top1 = JSON.parse(eerste.body).fields.find((f) => f.id === 'film').top.map((e) => e.id)
    assert.deepEqual([...top1].sort(), [a.id, b.id].sort())
    // Een bron die het eerste uur faalde, levert alsnog drie stukken over één verhaal.
    const d = ['vpro-cinema', 'filmtotaal', 'vk-films'].map((s) => it(s, 'Wim Wenders maakt een film over de Afsluitdijk met Carice van Houten', at, { image: 'https://img.example.org/d.jpg' }))
    await kvSet(KEYS.vakPool, [a, b, ...d])
    const tweede = await refreshVak({ now: ams('2026-11-16T07:05:00Z') })
    const top2 = JSON.parse(tweede.body).fields.find((f) => f.id === 'film').top.map((e) => e.id)
    assert.deepEqual(top2.slice(0, 2), top1, 'wat al in de top stond, staat er nog op dezelfde plek')
    assert.equal(top2.length, 3)
    assert.notEqual(tweede.etag, eerste.etag)
    // Niets nieuws: dan blijft de bundel precies staan (zelfde etag).
    const derde = await refreshVak({ now: ams('2026-11-16T08:05:00Z') })
    assert.equal(derde.etag, tweede.etag)
    // Na de middag bevriest hij weer.
    await kvSet(KEYS.vakPool, [a, b, ...d, it('indiewire', 'A late review that would have made the top', at, { image: 'https://img.example.org/e.jpg' })])
    const middag = await refreshVak({ now: ams('2026-11-16T11:05:00Z') })
    assert.equal(middag.etag, tweede.etag)
    assert.equal((await readDoc(KEYS.vak)).etag, tweede.etag)
  })
})

test('vak-refresh: in het weekend krijgen de stukken van de komende bundel eerst een beeld', async () => {
  await withFetch(async (tried) => {
    await kvSet(KEYS.vakSince, '2026-10-01T00:00:00.000Z')
    await kvSet(KEYS.vakHealth, {})
    // De bundel die uit is (week 46, 16 november): 40 stukken zonder beeld in vijf onderwerpen.
    const oud = []
    const fields = [['filmkrant', 'rogerebert'], ['tzum', 'lithub'], ['mistermotley', 'hyperallergic'], ['culy', 'eater'], ['columbus', 'guardian-travel']]
    for (const [x, y] of fields) for (let k = 0; k < 8; k++) oud.push(it(k % 2 ? y : x, `Een los stuk nummer ${k} over ${x} zonder overlap ${k * 7}`, '2026-11-12T09:00:00.000Z', { image: null }))
    // De komende bundel (week 47): vijf nieuwe stukken, ook zonder beeld.
    const nieuw = fields.map(([x], k) => it(x, `Een nieuw stuk voor de komende week over ${x} ${k}`, '2026-11-19T09:00:00.000Z', { image: null }))
    // Het zijn gewone leesstukken (keuring 14 november: "nummer 0" in een zin is geen verzamelstuk).
    for (const x of [...oud, ...nieuw]) assert.ok(isReading(x), 'leesstuk: ' + x.title)
    await kvSet(KEYS.vakPool, [...oud, ...nieuw])
    const doc = await refreshVak({ now: ams('2026-11-21T10:05:00Z') }) // zaterdag
    assert.equal(doc.week, '2026-W46')
    const pool = await kvGet(KEYS.vakPool)
    for (const x of nieuw) assert.ok(pool.find((p) => p.id === x.id).image, 'beeld voor de komende bundel: ' + x.title)
    assert.ok(tried.length <= 30)
  })
})
