// De Stroom per bron: alles van de afgelopen 36 uur, hooguit 60, samengevoegd met wat we eerder zagen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recentOf, mergeSource, mergeStream, storeOf, STORE_KEY } from '../netlify/lib/stream.mjs'
import { STREAM_HOURS, STREAM_MAX, BLUESKY_HOURS, PER_SOURCE_LIMIT, SOURCES } from '../netlify/lib/sources.mjs'
import { loadSource } from '../netlify/lib/rss.mjs'
import { fetchAuthorPosts } from '../shared/bluesky.mjs'
import { kvGet, kvSet } from '../netlify/lib/kv.mjs'

const NOW = Date.parse('2026-10-31T18:00:00Z')
const H = 36e5
const at = (h) => new Date(NOW - h * H).toISOString()
const item = (n, h, more = {}) => ({ id: 'i' + n, source: 'nos', kind: 'article', title: 'Bericht nummer ' + n, url: 'https://nos.nl/' + n, publishedAt: at(h), ...more })

test('de grens: 36 uur en 60 berichten per bron, voor elke rubriek', () => {
  assert.equal(STREAM_HOURS, 36)
  assert.equal(STREAM_MAX, 60)
})

test('tijdgrens: wat ouder is dan 36 uur valt af, de rest staat nieuwste eerst', () => {
  const out = recentOf([item(1, 35.9), item(2, 36.1), item(3, 1), item(4, 50)], { now: NOW })
  assert.deepEqual(out.map((i) => i.id), ['i3', 'i1'])
})

test('maximum: hooguit 60 per bron, de nieuwste', () => {
  const many = Array.from({ length: 100 }, (_, n) => item(n, n * 0.2))
  const out = recentOf(many, { now: NOW })
  assert.equal(out.length, 60)
  assert.equal(out[0].id, 'i0')
  assert.equal(out.at(-1).id, 'i59')
})

test('een bericht in een andere taal telt niet mee voor de grens', () => {
  const list = [item(1, 1, { offLang: true }), ...Array.from({ length: 70 }, (_, n) => item(n + 10, 2 + n * 0.1))]
  const out = recentOf(list, { now: NOW })
  assert.equal(out.filter((i) => !i.offLang).length, 60)
  assert.ok(out.some((i) => i.offLang))
})

test('samenvoegen: wat de feed niet meer noemt blijft staan, tot 36 uur', () => {
  const stored = [item(1, 20), item(2, 30), item(3, 40)]
  const fresh = [item(4, 1), item(5, 2)]
  const out = mergeSource(fresh, stored, { now: NOW })
  assert.deepEqual(out.map((i) => i.id), ['i4', 'i5', 'i1', 'i2'])
})

test('ontdubbelen: zelfde link of zelfde kop één keer, het verse exemplaar wint', () => {
  const stored = [item(1, 3, { summary: 'oud', image: 'https://x/oud.jpg' }), item(2, 5)]
  const fresh = [item(1, 3, { summary: 'nieuw' }), item(9, 5, { title: 'Bericht nummer 2', url: 'https://nos.nl/anders' })]
  const out = mergeSource(fresh, stored, { now: NOW })
  assert.equal(out.length, 2)
  assert.equal(out.find((i) => i.id === 'i1').summary, 'nieuw')
  assert.ok(out.some((i) => i.id === 'i9'))
  assert.ok(!out.some((i) => i.id === 'i2'))
})

test('zonder publicatietijd telt wanneer de feed het bericht het laatst noemde', () => {
  const undated = { ...item(1, 0), publishedAt: null }
  const fresh = mergeSource([undated], [], { now: NOW })
  assert.equal(fresh.length, 1)
  assert.equal(fresh[0].seenAt, NOW)
  assert.equal(mergeSource([], fresh, { now: NOW + 30 * H }).length, 1)
  assert.equal(mergeSource([], fresh, { now: NOW + 37 * H }).length, 0)
})

test('een bron die nu niet laadt houdt zijn berichten; de opslag laat rondegebonden velden weg', () => {
  const groups = mergeStream([{ id: 'nos', ok: false, items: [] }, { id: 'nu', ok: true, items: [item(7, 1, { source: 'nu' })] }], { nos: [item(1, 10)] }, { now: NOW })
  assert.equal(groups[0].items.length, 1)
  assert.equal(groups[0].count, 1)
  assert.equal(groups[0].ok, false)
  groups[1].items[0].storyId = 's1'
  groups[1].items[0].firstSeenAt = at(0)
  const store = storeOf(groups)
  assert.deepEqual(Object.keys(store).sort(), ['nos', 'nu'])
  assert.equal(store.nu[0].storyId, undefined)
  assert.equal(store.nu[0].firstSeenAt, undefined)
  assert.equal(groups[1].items[0].storyId, 's1') // het bericht zelf blijft ongemoeid
})

test('opslag die geen object is, wordt genegeerd', () => {
  const groups = mergeStream([{ id: 'nos', ok: true, items: [item(1, 1)] }], 'kapot', { now: NOW })
  assert.equal(groups[0].items.length, 1)
})

// ---- Ophalen: de Stroom vraagt de hele feed, de vakbronnen houden hun grens ----
const rss = (n) => `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>${Array.from({ length: n }, (_, k) => `<item><title>Kop ${k} over iets anders</title><link>https://nos.nl/artikel/${k}</link><pubDate>${new Date(Date.now() - k * 6e4).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`
async function withFetch(handler, fn) {
  const real = globalThis.fetch
  globalThis.fetch = handler
  try {
    return await fn()
  } finally {
    globalThis.fetch = real
  }
}

test('loadSource: de Stroom krijgt de hele feed (Infinity), standaard blijft de grens van de vakbronnen', async () => {
  const src = SOURCES.find((s) => s.id === 'nos')
  await withFetch(async () => new Response(rss(80)), async () => {
    assert.equal((await loadSource(src, Promise.resolve({}), { limit: Infinity })).items.length, 80)
    assert.equal((await loadSource(src, Promise.resolve({}))).items.length, PER_SOURCE_LIMIT)
  })
})

// ---- Bluesky: dezelfde 36 uur ----
test('Bluesky: dezelfde 36 uur als de Stroom', async () => {
  assert.equal(BLUESKY_HOURS, STREAM_HOURS)
  const post = (rkey, h) => ({ post: { uri: 'at://did:plc:x/app.bsky.feed.post/' + rkey, indexedAt: at(h), author: { handle: 'a.bsky.social', displayName: 'A' }, record: { text: 'Post ' + rkey, createdAt: at(h) } } })
  const feed = { feed: [post('a', 1), post('b', 35), post('c', 37), post('d', 47)] }
  const got = await withFetch(async () => Response.json(feed), () => fetchAuthorPosts('a.bsky.social', { now: NOW }))
  assert.deepEqual(got.map((p) => p.url.split('/').at(-1)), ['a', 'b'])
})

// ---- De hele opbouw: twee rondes, de tweede feed noemt het oude bericht niet meer ----
test('buildFeed bewaart berichten die uit de feed verdwijnen en laat ze na 36 uur los', async () => {
  const { buildFeed } = await import('../netlify/lib/build.mjs')
  const t0 = Date.now()
  const feedAt = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>NOS</title>${items.map(([k, h]) => `<item><title>${k}</title><link>https://nos.nl/artikel/${encodeURIComponent(k)}</link><pubDate>${new Date(t0 - h * H).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`
  let current = ''
  const handler = async (input) => {
    const url = typeof input === 'string' ? input : input.url
    return /feeds\.nos\.nl\/nosnieuwsalgemeen/.test(url) ? new Response(current) : new Response('', { status: 404 })
  }
  await kvSet(STORE_KEY, null)
  await withFetch(handler, async () => {
    current = feedAt([['Kabinet presenteert plannen voor woningbouw', 2], ['Storm trekt over het noorden van het land', 30]])
    const first = await buildFeed({ now: t0 })
    assert.equal(first.parts.nos.length, 2)
    current = feedAt([['Treinverkeer rond Utrecht ligt plat', 0.5]])
    const second = await buildFeed({ now: t0 + 60 * 6e4 })
    assert.deepEqual(second.parts.nos.map((i) => i.title), ['Treinverkeer rond Utrecht ligt plat', 'Kabinet presenteert plannen voor woningbouw', 'Storm trekt over het noorden van het land'])
    assert.ok(second.parts.nos.every((i) => !('seenAt' in i)), 'interne velden gaan niet naar de app')
    const stored = await kvGet(STORE_KEY)
    assert.equal(stored.nos.length, 3)
    // Zeven uur later is de storm 37 uur oud: weg uit de Stroom (en de verhalen).
    const third = await buildFeed({ now: t0 + 7 * H })
    assert.deepEqual(third.parts.nos.map((i) => i.title), ['Treinverkeer rond Utrecht ligt plat', 'Kabinet presenteert plannen voor woningbouw'])
    assert.ok(third.items.every((i) => t0 + 7 * H - Date.parse(i.publishedAt) <= STREAM_HOURS * H))
  })
})
