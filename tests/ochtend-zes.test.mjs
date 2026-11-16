// De Ochtendeditie om 06:00 (besluit Alex, 16 november 2026), en om 06:00 ligt ze er:
// 1. het dagdeel: 05:59 is nog de avond, 06:00 de ochtend, zomer en winter;
// 2. vooraf: de ronde vlak vóór de ochtend legt de Ochtendeditie al vast onder `volgend`; vanaf 06:00 geven /api/feed,
//    /api/voorpagina en /api/edition die kern, ook als de ronde van de start nog loopt;
// 3. de CDN bewaart een kern nooit over een wissel heen, en een kern die achterloopt maar heel even;
// 4. na middernacht zegt de Avondeditie niet meer "morgenochtend".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SLOT_START, OCHTEND_VOORAF, ochtendVooraf, beforeOchtend, secondsToNextSlot } from '../shared/slot-times.mjs'
import { slotIdNow } from '../shared/tel.mjs'
import { editionSlot } from '../netlify/lib/stories.mjs'
import { kernVanNu, cacheTot, kernCdn, volgendKey, volgendGeldt, ACHTER_S } from '../netlify/lib/dagdeel-kern.mjs'
import { rondeVan } from '../netlify/functions/feed-refresh.mjs'
import { refresh } from '../netlify/lib/refresh.mjs'
import { serveFeed } from '../netlify/functions/feed.mjs'
import { voorpaginaCache } from '../netlify/functions/voorpagina.mjs'
import { writeDoc, KEYS } from '../netlify/lib/kv.mjs'
import { handle } from '../netlify/functions/edition.mjs'
import { upNext } from '../src/lib/edition.js'
import { SLOTS } from '../shared/slots.mjs'
import { lidDeps, lidPost, start, body } from './helpers/lid-nep.mjs'

// Winter (UTC+1) en zomer (UTC+2): de laatste seconde van de nacht en de start van de ochtend.
const WINTER = { voor: '2026-12-01T04:59:59Z', start: '2026-12-01T05:00:00Z', dag: '2026-12-01', gisteren: '2026-11-30' }
const ZOMER = { voor: '2026-07-01T03:59:59Z', start: '2026-07-01T04:00:00Z', dag: '2026-07-01', gisteren: '2026-06-30' }
const at = (iso, s = 0) => new Date(Date.parse(iso) + s * 1000)

// ---------- 1. het dagdeel ----------
test('de ochtend begint om 06:00 in Amsterdam: 05:59 is avond, 06:00 ochtend, zomer en winter', () => {
  assert.equal(SLOT_START.ochtend, 360)
  for (const t of [WINTER, ZOMER]) {
    assert.equal(editionSlot(new Date(t.voor)).id, `${t.gisteren}-avond`)
    assert.equal(editionSlot(new Date(t.start)).id, `${t.dag}-ochtend`)
    assert.equal(slotIdNow(new Date(t.voor)), `${t.gisteren}-avond`, 'de klok van de server (S2, tellingen)')
    assert.equal(slotIdNow(new Date(t.start)), `${t.dag}-ochtend`)
    assert.equal(beforeOchtend(new Date(t.voor)), true)
    assert.equal(beforeOchtend(new Date(t.start)), false)
  }
})

// ---------- 2. vooraf vastleggen ----------
test('nachtrust tot de laatste minuten, dan vooraf, vanaf 06:00 gewoon', () => {
  assert.equal(OCHTEND_VOORAF, 20)
  const vers = (iso) => at(iso, -5 * 60).toISOString() // de gewone kern is vijf minuten oud
  // Winter: 05:30 nachtrust (kern vers), 05:40 en 05:50 vooraf, 06:00 gewoon.
  assert.equal(rondeVan(new Date('2026-12-01T04:30:00Z'), vers('2026-12-01T04:30:00Z')), 'nachtrust')
  assert.equal(rondeVan(new Date('2026-12-01T04:30:00Z'), '2026-12-01T03:55:00Z'), 'gewoon', 'kern ouder dan een half uur: wel een ronde')
  assert.equal(rondeVan(new Date('2026-12-01T04:39:59Z'), vers('2026-12-01T04:39:59Z')), 'nachtrust')
  assert.equal(rondeVan(new Date('2026-12-01T04:40:00Z'), vers('2026-12-01T04:40:00Z')), 'vooraf')
  assert.equal(rondeVan(new Date('2026-12-01T04:50:00Z'), vers('2026-12-01T04:50:00Z')), 'vooraf')
  assert.equal(rondeVan(new Date(WINTER.start), vers(WINTER.start)), 'gewoon')
  // Zomer.
  assert.equal(rondeVan(new Date('2026-07-01T03:50:00Z'), vers('2026-07-01T03:50:00Z')), 'vooraf')
  assert.equal(rondeVan(new Date(ZOMER.start), vers(ZOMER.start)), 'gewoon')
  // Overdag nooit vooraf of nachtrust.
  assert.equal(rondeVan(new Date('2026-12-01T10:50:00Z'), vers('2026-12-01T10:50:00Z')), 'gewoon')
  assert.equal(ochtendVooraf(new Date('2026-12-01T10:50:00Z')), null)
  // Het vooraf-dagdeel is de ochtend van dezelfde kalenderdag.
  assert.deepEqual(ochtendVooraf(new Date('2026-12-01T04:50:00Z')), { id: '2026-12-01-ochtend', slot: 'ochtend', date: '2026-12-01', next: '12:00' })
})

test('de vooraf-ronde schrijft kern, start en alles-in-één onder `volgend`, de rest gewoon; elk kerndocument draagt zijn dagdeel', async () => {
  const writes = new Map()
  const write = async (k, d) => void writes.set(k, d)
  const read = async () => null
  const slot = ochtendVooraf(new Date('2026-12-01T04:50:00Z'))
  let asked = null
  const build = async (args) => {
    asked = args
    return { parts: { nos: [{ id: 'a' }] }, items: [], archive: null, sources: [], stories: [], related: [], edition: { id: args.slot?.id || '2026-11-30-avond' }, meta: {} }
  }
  await refresh({ build, read, write, slot })
  assert.equal(asked.slot.id, '2026-12-01-ochtend', 'de Editie van de komende ochtend')
  for (const k of [KEYS.core, KEYS.start, KEYS.legacy]) {
    assert.ok(!writes.has(k), `${k}: de gewone kern blijft de avond`)
    assert.equal(writes.get(volgendKey(k))?.slot, '2026-12-01-ochtend', k)
  }
  for (const k of [KEYS.part('nos'), KEYS.related, KEYS.voorpagina]) assert.ok(writes.has(k), `${k} gewoon`)
  // Een gewone ronde: de gewone sleutels, met het dagdeel.
  writes.clear()
  await refresh({ build, read, write })
  assert.equal(asked.slot, undefined)
  assert.equal(writes.get(KEYS.start).slot, '2026-11-30-avond')
  assert.ok(![...writes.keys()].some((k) => k.endsWith('-volgend')))
})

test('kernVanNu: vóór 06:00 de avond, vanaf 06:00 de vooraf vastgelegde ochtend, nooit een Editie van de toekomst', async () => {
  const avond = { body: 'avond', etag: 'a', slot: '2026-11-30-avond' }
  const ochtend = { body: 'ochtend', etag: 'o', slot: '2026-12-01-ochtend' }
  let reads = 0
  const next = async () => (reads++, ochtend)
  assert.equal(await kernVanNu(avond, next, new Date(WINTER.voor)), avond)
  assert.equal(reads, 0, 'vóór de wissel wordt `volgend` niet eens gelezen')
  assert.equal(await kernVanNu(avond, next, new Date(WINTER.start)), ochtend)
  assert.equal(await kernVanNu(avond, next, at(WINTER.start, 90)), ochtend)
  // De gewone ronde schreef de ochtend al: die gaat voor.
  assert.equal(await kernVanNu({ ...ochtend, etag: 'o2' }, next, at(WINTER.start, 90)).then((d) => d.etag), 'o2')
  // Geen of een oude `volgend`: de kern zoals hij is.
  assert.equal(await kernVanNu(avond, async () => null, new Date(WINTER.start)), avond)
  assert.equal(await kernVanNu(avond, async () => ({ body: 'x', slot: '2026-11-30-avond' }), new Date(WINTER.start)), avond)
  assert.equal(await kernVanNu(avond, async () => { throw new Error('blobs') }, new Date(WINTER.start)), avond)
  // Een kern zonder dagdeel (van vóór deze code) blijft staan.
  assert.deepEqual(await kernVanNu({ body: 'oud' }, next, new Date(WINTER.start)), { body: 'oud' })
  // Nooit later dan de klok: een ochtend van morgen telt niet.
  assert.equal(volgendGeldt('2026-11-30-avond', '2026-12-02-ochtend', new Date(WINTER.start)), false)
  assert.equal(volgendGeldt('2026-11-30-avond', '2026-12-01-ochtend', new Date(WINTER.voor)), false)
})

// ---------- 2 en 3. /api/feed rond de wissel ----------
test('/api/feed?deel=start: 05:59 de avond, 06:00:00 de ochtend (vooraf vastgelegd), met de juiste cache', async () => {
  const fresh = new Date(WINTER.start).toISOString()
  await writeDoc(KEYS.core, { body: '{"edition":{"id":"2026-11-30-avond"}}', builtAt: fresh, etag: 'kern-a', slot: '2026-11-30-avond' })
  await writeDoc(KEYS.start, { body: '{"edition":{"id":"2026-11-30-avond"}}', builtAt: fresh, etag: 'start-a', slot: '2026-11-30-avond' })
  await writeDoc(KEYS.legacy, { body: '{"edition":{"id":"2026-11-30-avond"},"items":[]}', builtAt: fresh, etag: 'leg-a', slot: '2026-11-30-avond' })
  await writeDoc(volgendKey(KEYS.start), { body: '{"edition":{"id":"2026-12-01-ochtend"}}', builtAt: fresh, etag: 'start-o', slot: '2026-12-01-ochtend' })
  await writeDoc(volgendKey(KEYS.core), { body: '{"edition":{"id":"2026-12-01-ochtend"}}', builtAt: fresh, etag: 'kern-o', slot: '2026-12-01-ochtend' })
  await writeDoc(volgendKey(KEYS.legacy), { body: '{"edition":{"id":"2026-12-01-ochtend"},"items":[]}', builtAt: fresh, etag: 'leg-o', slot: '2026-12-01-ochtend' })
  const get = (q, now, h = {}) => serveFeed(new Request(`http://x/api/feed${q}`, { headers: h }), {}, now)

  // 05:59:30: de avond, en de CDN bewaart haar hooguit tot 06:00:00.
  const voor = await get('?deel=start', at(WINTER.voor, -29))
  assert.equal(voor.headers.get('etag'), '"start-a"')
  assert.equal(voor.headers.get('netlify-cdn-cache-control'), 'public, durable, s-maxage=30')
  assert.equal(voor.headers.get('cache-control'), 'public, max-age=0, must-revalidate')
  // 05:50: een minuut vers, de rest oud-maar-bruikbaar, samen tot de wissel.
  assert.equal((await get('?deel=start', new Date('2026-12-01T04:50:00Z'))).headers.get('netlify-cdn-cache-control'), 'public, durable, s-maxage=60, stale-while-revalidate=540')
  // 06:00:00: de ochtend, ook voor kern en alles-in-één; een toestel met de avond krijgt geen 304.
  for (const [q, tag] of [['?deel=start', 'start-o'], ['?deel=kern', 'kern-o'], ['', 'leg-o']]) {
    const r = await get(q, new Date(WINTER.start), { 'If-None-Match': `"${tag.replace('-o', '-a')}"` })
    assert.equal(r.status, 200, q)
    assert.equal(r.headers.get('etag'), `"${tag}"`, q)
    assert.match(await r.text(), /2026-12-01-ochtend/, q)
  }
  // De ochtend loopt niet achter: gewoon tot de middag te bewaren.
  assert.equal((await get('?deel=start', at(WINTER.start, 30))).headers.get('netlify-cdn-cache-control'), 'public, durable, s-maxage=60, stale-while-revalidate=600')
  // Een deel per bron en de verhalen houden hun eigen cache.
  await writeDoc(KEYS.part('nos'), { body: '{"items":[]}', builtAt: fresh, etag: 'p1' })
  assert.match((await get('?bron=nos&v=p1', new Date(WINTER.start))).headers.get('cache-control'), /immutable/)
})

test('/api/feed: is de ochtend er nog niet (geen vooraf), dan de avond, maar hooguit tien seconden in de CDN', async () => {
  const fresh = new Date(WINTER.start).toISOString()
  await writeDoc(KEYS.core, { body: '{}', builtAt: fresh, etag: 'kern-a', slot: '2026-11-30-avond' })
  await writeDoc(KEYS.start, { body: '{"edition":{"id":"2026-11-30-avond"}}', builtAt: fresh, etag: 'start-a', slot: '2026-11-30-avond' })
  await writeDoc(volgendKey(KEYS.start), { body: '{"edition":{"id":"2026-11-30-avond"}}', builtAt: fresh, etag: 'start-oud', slot: '2026-11-30-avond' })
  const r = await serveFeed(new Request('http://x/api/feed?deel=start'), {}, at(WINTER.start, 30))
  assert.equal(r.headers.get('etag'), '"start-a"')
  assert.equal(r.headers.get('netlify-cdn-cache-control'), `public, durable, s-maxage=${ACHTER_S}`)
})

test('cache tot de wissel: ook rond de middag, de avond en middernacht, zomer en winter', () => {
  const doc = (slot) => ({ slot })
  // Tot 12:00 (winter 11:00Z) en 17:00 (16:00Z).
  assert.equal(cacheTot(doc('2026-12-01-ochtend'), new Date('2026-12-01T10:59:30Z')), 30)
  assert.equal(kernCdn(doc('2026-12-01-ochtend'), new Date('2026-12-01T10:59:30Z')), 'public, durable, s-maxage=30')
  assert.equal(cacheTot(doc('2026-12-01-middag'), new Date('2026-12-01T15:55:00Z')), 300)
  // Na de start van de middag, met de ochtendkern nog in handen: achter.
  assert.equal(cacheTot(doc('2026-12-01-ochtend'), new Date('2026-12-01T11:00:05Z')), ACHTER_S)
  // Om middernacht verandert er niets (de avond loopt door tot de ochtend).
  assert.equal(secondsToNextSlot(new Date('2026-11-30T23:00:00Z')), 6 * 3600)
  assert.equal(cacheTot(doc('2026-11-30-avond'), new Date('2026-11-30T23:00:00Z')), 6 * 3600)
  // Zomer: 05:59 is 03:59Z.
  assert.equal(secondsToNextSlot(new Date('2026-07-01T03:59:00Z')), 60)
  assert.equal(secondsToNextSlot(new Date('2026-07-01T03:59:59.500Z')), 0.5)
  // De voorpagina: ver van een wissel precies de oude cache, vlak voor een wissel korter.
  assert.equal(voorpaginaCache(doc('2026-12-01-middag'), new Date('2026-12-01T13:00:00Z')), 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600')
  assert.equal(voorpaginaCache(doc('2026-11-30-avond'), new Date('2026-12-01T04:50:00Z')), 'public, max-age=300, s-maxage=600')
  assert.equal(voorpaginaCache(doc('2026-11-30-avond'), new Date(WINTER.start)), `public, max-age=${ACHTER_S}, s-maxage=${ACHTER_S}`)
})

// ---------- 2. /api/edition rond de wissel ----------
const AVOND_ID = start.edition.id // '2026-10-30-avond'
const OCHTEND = { ...start, edition: { ...start.edition, id: '2026-10-31-ochtend', slot: 'ochtend', date: '2026-10-31', builtAt: '2026-10-31T04:50:20.000Z', version: 'test:2026-10-31-ochtend' } }
const klok = (iso) => () => Date.parse(iso)

test('/api/edition om 06:00:30, de ronde van de start loopt nog: als lid en zonder account de Ochtendeditie', async () => {
  assert.equal(AVOND_ID, '2026-10-30-avond')
  // 31 oktober is wintertijd: 06:00:30 is 05:00:30Z.
  const d = lidDeps()
  const lid = await handle(lidPost(), { ...d.deps, now: klok('2026-10-31T05:00:30Z'), nextStart: async () => OCHTEND, freshStart: async () => assert.fail('de vooraf vastgelegde kern is er: niet opnieuw lezen') })
  assert.equal(lid.status, 200)
  assert.equal((await lid.json()).edition.id, '2026-10-31-ochtend')
  const anon = new Request('http://hoot.test/api/edition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const res = await handle(anon, { ...lidDeps().deps, now: klok('2026-10-31T05:00:30Z'), nextStart: async () => OCHTEND })
  assert.equal(res.status, 200)
  assert.equal((await res.json()).edition.id, '2026-10-31-ochtend')
})

test('/api/edition om 05:59: nog de Avondeditie, `volgend` wordt niet gelezen', async () => {
  const d = lidDeps()
  const res = await handle(lidPost(), { ...d.deps, now: klok('2026-10-31T04:59:00Z'), nextStart: async () => assert.fail('nog geen wissel'), freshStart: async () => assert.fail('nog geen wissel') })
  assert.equal((await res.json()).edition.id, AVOND_ID)
})

test('/api/edition: zonder vooraf vastgelegde ochtend werkt S2 zoals eerst (lid: de kern opnieuw lezen)', async () => {
  const d = lidDeps()
  let fresh = 0
  const res = await handle(lidPost(), { ...d.deps, now: klok('2026-10-31T05:00:30Z'), nextStart: async () => null, freshStart: async () => (fresh++, OCHTEND) })
  assert.equal(fresh, 1)
  assert.equal((await res.json()).edition.id, '2026-10-31-ochtend')
})

// ---------- 4. de tekst na middernacht ----------
test('de Avondeditie zegt voor middernacht "morgenochtend", daarna "De Ochtendeditie komt zo."; geen kloktijd', () => {
  // 30 november, Avondeditie. 23:59 Amsterdam is 22:59Z; 00:01 is 23:01Z.
  assert.equal(upNext('avond', '2026-11-30', new Date('2026-11-30T22:59:00Z')), ' De volgende staat morgenochtend klaar.')
  assert.equal(upNext('avond', '2026-11-30', new Date('2026-11-30T23:01:00Z')), ' De Ochtendeditie komt zo.')
  assert.equal(upNext('avond', '2026-11-30', new Date(WINTER.voor)), ' De Ochtendeditie komt zo.')
  // Zomer: 00:01 is 22:01Z.
  assert.equal(upNext('avond', '2026-06-30', new Date('2026-06-30T21:59:00Z')), ' De volgende staat morgenochtend klaar.')
  assert.equal(upNext('avond', '2026-06-30', new Date('2026-06-30T22:01:00Z')), ' De Ochtendeditie komt zo.')
  // De andere dagdelen en zonder datum: zoals altijd.
  assert.equal(upNext('ochtend', '2026-11-30', new Date('2026-12-01T10:00:00Z')), ' De volgende staat in de middag klaar.')
  assert.equal(upNext('avond'), ' De volgende staat morgenochtend klaar.')
  assert.equal(SLOTS.avond.naMiddernacht, 'De Ochtendeditie komt zo.')
  for (const s of Object.values(SLOTS)) for (const v of Object.values(s)) assert.doesNotMatch(v, /\d/, 'geen kloktijd in de woorden van een dagdeel')
})
