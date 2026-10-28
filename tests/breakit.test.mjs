// Slooptest: de riskantste pure logica met vervelende invoer (leeg, enorm, dubbel, kapot,
// HTML in koppen, rare tijden, klokverschil). Wat hier faalde is gerepareerd; dit houdt het zo.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeRead, mergeSeen, mergeSaved } from '../src/lib/sync.js'
import { SyncEngine, forgetAccount, OWNER_KEY, BASE_KEY } from '../src/lib/syncEngine.js'
import { toText, clip, cleanUrl, preview, plausibleTime } from '../netlify/lib/text.mjs'
import { safeHttpUrl, safeIso } from '../shared/util.mjs'
import { mapPost } from '../shared/bluesky.mjs'
import { buildStories, selectEdition, relinkEdition, byRecency, editionSlot } from '../netlify/lib/stories.mjs'
import { matchTrending, cleanTerms, insertBubble } from '../netlify/lib/bubble.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { prunePositions } from '../src/lib/context.js'
import edition from '../netlify/functions/edition.mjs'

const NOW = Date.parse('2026-10-28T10:00:00Z')
const iso = (minsAgo) => new Date(NOW - minsAgo * 6e4).toISOString()
const art = (id, source, title, minsAgo = 10, extra = {}) => ({ id, source, sourceName: source.toUpperCase(), kind: 'article', title, summary: `${title}. Meer daarover.`, publishedAt: iso(minsAgo), url: `https://${source}.nl/${id}`, ...extra })
const elapsed = (fn) => {
  const t = performance.now()
  fn()
  return performance.now() - t
}

// ---------- Samenvoegen (sync.js) ----------

test('samenvoegen: kapotte waarden van de server (null, geen lijst) laten niets vastlopen', () => {
  assert.deepEqual(mergeRead(null, ['a']), ['a'])
  assert.deepEqual(mergeRead({ x: 1 }, 'abc'), [])
  assert.deepEqual(mergeSeen(null, { s: ['a'] }), { s: ['a'] })
  assert.deepEqual(mergeSeen(['oops'], 'x'), {})
  assert.deepEqual(mergeSaved(null, null), {})
})

test('samenvoegen: gelezen blijft binnen de grens, de nieuwste (lokale) blijven', () => {
  const remote = Array.from({ length: 1500 }, (_, i) => 'r' + i)
  const local = Array.from({ length: 1500 }, (_, i) => 'l' + i)
  const out = mergeRead(remote, local)
  assert.equal(out.length, 1500)
  assert.equal(out.at(-1), 'l1499')
  assert.ok(!out.includes('r0'))
})

test('samenvoegen: Bewaard slaat kapotte rijen over maar houdt onbekende soorten (van een nieuwere versie)', () => {
  const out = mergeSaved({ a: null, b: { kind: 'item', savedAt: 5, item: { id: 'b' } } }, { a: { kind: 'item', savedAt: 1, item: { id: 'a' } }, c: 'kapot', d: { kind: 'podcast', savedAt: 2 } })
  assert.deepEqual(Object.keys(out).sort(), ['a', 'b', 'd'])
  assert.equal(out.a.savedAt, 1) // de lokale null overschrijft niets
})

test('samenvoegen: klokverschil — een tijd in de toekomst wint, maar niets loopt vast', () => {
  const future = { kind: 'item', savedAt: 8.64e15, item: { id: 'x', title: 'van een toestel met een rare klok' } }
  const out = mergeSaved({ x: { kind: 'item', savedAt: NOW, item: { id: 'x' } } }, { x: future })
  assert.equal(out.x, future)
  assert.equal(mergeSaved({ x: { kind: 'item', savedAt: 'gisteren', item: {} } }, { x: { kind: 'item', savedAt: 1, item: {} } }).x.savedAt, 1)
})

test('samenvoegen: geziene verhalen van twee toestellen tellen allebei, en het blijft begrensd', () => {
  assert.deepEqual(mergeSeen({ s1: ['a', 'b'] }, { s1: ['b', 'c'], s2: ['d'] }), { s1: ['a', 'b', 'c'], s2: ['d'] })
  const many = (p) => Object.fromEntries(Array.from({ length: 300 }, (_, i) => [p + i, [p + i]]))
  const out = mergeSeen(many('a'), many('b'))
  assert.equal(Object.keys(out).length, 300)
  assert.ok('b299' in out) // de nieuwste (lokale) blijven
})

// ---------- De synchronisatiemotor: uitloggen terwijl er nog iets onderweg is ----------

const storage = () => {
  const m = new Map()
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
const deferred = () => {
  let resolve
  const p = new Promise((r) => (resolve = r))
  return { p, resolve }
}
const empty = { prefs: { layout: 'krant' }, read: [], seen: {}, saved: {} }

test('uitloggen terwijl het ophalen nog loopt: het late antwoord zet de accountgegevens niet terug', async () => {
  const ls = storage()
  let local = structuredClone(empty)
  const gate = deferred()
  const api = {
    pull: async () => (await gate.p, { prefs: { muted: ['nos'] }, read: ['geheim'], seen: {}, saved: { x: { kind: 'item', savedAt: 1, item: { id: 'x' } } } }),
    pushState: async () => assert.fail('mag niet meer schrijven'),
    upsertSaved: async () => assert.fail('mag niet meer schrijven'),
    deleteSaved: async () => assert.fail('mag niet meer schrijven'),
  }
  const timers = []
  const e = new SyncEngine({ uid: 'A', api, storage: ls, getLocal: () => local, setLocal: (n) => (local = n), schedule: (fn) => timers.push(fn), cancel: () => {} })
  const started = e.start()
  // Uitloggen (zoals useCloudSync.forget): motor stoppen, gegevens van het toestel.
  e.stop()
  forgetAccount(ls, (n) => (local = n), local.prefs)
  gate.resolve()
  await started
  assert.deepEqual(local.read, [])
  assert.deepEqual(local.saved, {})
  assert.equal(local.prefs.muted, undefined)
  assert.equal(ls.getItem(OWNER_KEY), 'anon')
  assert.equal(ls.getItem(BASE_KEY), null)
  assert.equal(timers.length, 0)
})

test('uitloggen terwijl het schrijven loopt: geen basis terug in de opslag en geen nieuwe poging', async () => {
  const ls = storage()
  let local = { ...structuredClone(empty), read: ['a'] }
  const gate = deferred()
  const db = { prefs: {}, read: [], seen: {}, saved: {} }
  let pushes = 0
  const api = {
    pull: async () => structuredClone(db),
    pushState: async () => {
      pushes++
      await gate.p
      throw new Error('netwerk weg')
    },
    upsertSaved: async () => {},
    deleteSaved: async () => {},
  }
  const timers = []
  const e = new SyncEngine({ uid: 'A', api, storage: ls, getLocal: () => local, setLocal: (n) => (local = n), schedule: (fn) => timers.push(fn), cancel: () => {} })
  const started = e.start()
  await new Promise((r) => setTimeout(r, 0))
  e.stop()
  forgetAccount(ls, (n) => (local = n), local.prefs)
  gate.resolve()
  await started
  assert.equal(pushes, 1)
  assert.equal(ls.getItem(BASE_KEY), null)
  assert.equal(timers.length, 0) // de mislukte schrijfactie plant geen nieuwe poging na het uitloggen
  assert.notEqual(e.status, 'error')
})

// ---------- Tekst en adressen ----------

test('tekst: script, style en tags eruit; dubbel gecodeerde entiteiten worden leesbaar', () => {
  assert.equal(toText('<p>Hoi<script>alert(1)</script> daar<STYLE>p{color:red}</STYLE>!</p>'), 'Hoi daar!')
  assert.equal(toText('Rock &amp;#8217;n&amp;nbsp;roll'), 'Rock ’n roll')
  assert.equal(toText('a&#0;b&#99999999;c&#x110000;d'), 'abcd') // geen NUL, geen ongeldig teken
  assert.equal(toText(null), '')
  assert.equal(toText(42), '42')
})

test('tekst: kwaadaardige of kapotte HTML kost geen kwadratische tijd', () => {
  for (const s of ['<'.repeat(60000), '<a '.repeat(30000), '<script'.repeat(20000), '<style>'.repeat(20000), '<p>x</p><script>y</script>'.repeat(20000)]) {
    assert.ok(elapsed(() => toText(s)) < 400, s.slice(0, 12))
  }
  assert.ok(elapsed(() => preview('woord '.repeat(200000))) < 400)
})

test('tekst: inkorten breekt geen emoji doormidden', () => {
  assert.equal(clip('😀😀😀', 2), '…')
  assert.equal(clip('ab😀cd', 4), 'ab…')
  assert.equal(clip('kort', 10), 'kort')
  assert.ok(!/[\uD800-\uDBFF]$/.test(clip('x😀'.repeat(50), 30).slice(0, -1)))
})

test('adressen: alleen http(s), wat de feed ook stuurt', () => {
  for (const bad of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', 'https://', '//evil.example', '', null, 42, {}]) assert.equal(safeHttpUrl(bad), null, String(bad))
  assert.equal(safeHttpUrl(' https://nos.nl/a '), 'https://nos.nl/a')
  assert.equal(cleanUrl('javascript:alert(1)'), '')
  assert.equal(cleanUrl('data:text/html,hoi'), '')
  assert.equal(cleanUrl('https://x.nl/a?utm_source=y&id=2#top'), 'https://x.nl/a?id=2')
})

test('tijden: onzin wordt null, de toekomst wordt teruggerekend of nu', () => {
  assert.equal(safeIso('geen datum'), null)
  assert.equal(safeIso(1e20), null)
  assert.equal(plausibleTime('onzin', NOW), null)
  assert.equal(plausibleTime('9999-01-01T00:00:00Z', NOW), new Date(NOW).toISOString())
})

test('Bluesky: een post met rare velden wordt een bericht zonder gevaarlijke links', () => {
  const p = mapPost({ uri: 'at://did/app.bsky.feed.post/abc', author: { handle: 'x.bsky.social', avatar: 'javascript:alert(1)' }, record: { text: 12345, createdAt: 'gisteren' }, embed: { $type: 'app.bsky.embed.external#view', external: { uri: 'javascript:alert(1)', thumb: 'data:image/png;base64,AA', title: '  ' } } })
  assert.equal(p.summary, '')
  assert.equal(p.avatar, null)
  assert.equal(p.image, null)
  assert.match(p.url, /^https:\/\/bsky\.app\//)
  assert.equal(p.publishedAt, null)
  assert.equal(mapPost(null), null)
  assert.equal(mapPost({ record: {} }), null)
})

// ---------- Verhalen en editie ----------

test('verhalen: lege, kale en dubbele invoer loopt niet vast', () => {
  assert.deepEqual(buildStories([]), [])
  assert.deepEqual(buildStories([{ id: 'a', source: 'x' }, { id: 'b', source: 'y', title: null, publishedAt: 'onzin' }]), [])
  const dup = art('a', 'nos', 'Kabinet Schoof valt na ruzie over asielwet')
  const stories = buildStories([dup, { ...dup }, art('b', 'nrc', 'Kabinet Schoof valt na ruzie over asielwet in Den Haag', 20)])
  assert.equal(stories.length, 1)
  assert.deepEqual(new Set(stories[0].itemIds), new Set(['a', 'b']))
})

test('verhalen: HTML en unicode in koppen zijn gewone tekst', () => {
  const s = buildStories([art('a', 'nos', '<script>alert(1)</script> Kabinet Schoof valt over asielwet'), art('b', 'nrc', '<img src=x onerror=alert(1)> Kabinet Schoof valt over asielwet', 15)])
  assert.equal(s.length, 1)
  assert.deepEqual(s[0].sourceNames, ['NOS', 'NRC'])
  const uni = buildStories([art('c', 'nos', 'Zelensky: Oekraïne krijgt “nieuwe” steun 🇺🇦 van Brussel'), art('d', 'nrc', 'Zelensky: Oekraïne krijgt nieuwe steun van Brussel', 30)])
  assert.equal(uni.length, 1)
})

test('verhalen: een onleesbare tijd raakt de sortering niet in de war', () => {
  const list = [art('a', 'nos', 'x', 30), { ...art('b', 'nrc', 'y'), publishedAt: 'onzin' }, art('c', 'nyt', 'z', 5), { ...art('d', 'nu', 'w'), publishedAt: null }]
  const sorted = [...list].sort(byRecency).map((a) => a.id)
  assert.deepEqual(sorted.slice(0, 2), ['c', 'a'])
  assert.ok(list.every((a) => list.every((b) => !Number.isNaN(byRecency(a, b)))))
})

test('verhalen: honderden berichten over hetzelfde blijven snel', () => {
  const same = Array.from({ length: 400 }, (_, i) => art('d' + i, 's' + (i % 20), 'Kabinet Schoof valt over asielwet, Wilders boos', i))
  let stories
  assert.ok(elapsed(() => (stories = buildStories(same))) < 2000)
  assert.ok(stories.length >= 1)
})

test('editie: verhalen zonder berichten, zonder tijd of zonder ruimte geven gewoon minder', () => {
  assert.deepEqual(selectEdition([{ id: 's1', itemIds: ['weg'], latestAt: iso(1), sourceCount: 3 }], [], { now: NOW }), [])
  assert.deepEqual(selectEdition([{ id: 's1', itemIds: ['a'] }], [art('a', 'nos', 'Iets', 1)], { now: NOW, size: 0 }), [])
  const out = selectEdition([], Array.from({ length: 50 }, (_, i) => art('i' + i, 'nos', 'Bericht nummer ' + i + ' over iets heel anders ' + 'abcdefghijklmnopqrstuvwxyz'[i % 26].repeat(5), i)), { now: NOW, mainIds: new Set(['nos']) })
  assert.ok(out.length <= 10)
  assert.equal(new Set(out.map((e) => e.id)).size, out.length) // geen dubbele plekken
})

test('editie: herkoppelen met een verhaal zonder itemIds loopt niet vast', () => {
  const out = relinkEdition([{ kind: 'story', id: 's', leadId: 'a' }], { stories: [{ id: 's2', itemIds: ['a'] }, { id: 's' }] })
  assert.equal(out[0].id, 's2')
})

test('editie: dagdeel klopt rond de wisseling van zomer- naar wintertijd', () => {
  assert.equal(editionSlot(new Date('2026-10-25T04:59:00Z')).id, '2026-10-24-avond') // 05:59 wintertijd: nog gisteravond
  assert.equal(editionSlot(new Date('2026-10-25T05:00:00Z')).id, '2026-10-25-ochtend')
  assert.equal(editionSlot(new Date('2026-03-29T03:59:00Z')).id, '2026-03-28-avond') // 05:59 zomertijd
})

// ---------- Buiten je bubbel ----------

test('bubbel: geen signalen, kapotte signalen en onleesbare tijden', () => {
  assert.deepEqual(matchTrending(null, []), [])
  assert.deepEqual(cleanTerms([null, { term: 42, via: 'google' }, { term: { a: 1 } }]).map((t) => t.words), [])
  const picks = matchTrending([{ term: 'Kabinet Schoof', via: 'google' }], [{ ...art('a', 'nos', 'Kabinet Schoof valt'), publishedAt: 'onzin' }, art('b', 'nrc', 'Kabinet Schoof valt', 30)], { now: NOW })
  assert.equal(picks[0].id, 'b') // met een geldige tijd gaat voor
})

test('bubbel: invoegen in een lege of volle editie zonder rubrieken', () => {
  assert.deepEqual(insertBubble([], { id: 'x', terms: [] }).map((e) => e.id), ['x'])
  const full = Array.from({ length: 10 }, (_, i) => ({ kind: 'item', id: 'e' + i, desk: 'binnenland' }))
  const out = insertBubble(full, { id: 'x', terms: [] })
  assert.equal(out.length, 10)
  assert.equal(out[5].id, 'x')
  assert.equal(insertBubble(full, null), full)
})

// ---------- Jouw editie ----------

test('jouw editie: zonder algemene editie niets, met kale gegevens geen crash', () => {
  assert.equal(composePersonal({ global: null }), null)
  assert.equal(composePersonal({ global: { entries: [] } }), null)
  const global = { id: 'e', entries: [{ kind: 'item', id: 'g1' }, { kind: 'item', id: 'b1', desk: 'bubbel' }], items: [art('g1', 'nyt', 'Iets anders', 5), art('b1', 'nos', 'Bubbel', 5)], bubble: [{ id: 'b1' }], wide: [{ storyId: 's1' }, null] }
  const mine = composePersonal({ global, items: [{ id: 'q', source: 'nos' }], followed: new Set(['nos']), interests: ['sport'], now: NOW })
  assert.ok(mine.entries.length >= 1)
  assert.equal(new Set(mine.entries.map((e) => e.leadId || e.id)).size, mine.entries.length)
})

// ---------- Leesposities ----------

test('leesposities: verlopen en kapotte sleutels worden opgeruimd, verse en andere blijven', () => {
  const m = new Map([
    ['hoot:pos-editie:2025-01-01-ochtend', JSON.stringify({ id: 'a', at: NOW - 30 * 864e5 })],
    ['hoot:pos-stroom:nos,nrc', JSON.stringify({ id: 'b', at: NOW - 60e3 })],
    ['hoot:pos-kapot', '{niet json'],
    ['hoot:prefs', JSON.stringify({ at: 0 })],
  ])
  const ls = { get length() { return m.size }, key: (i) => [...m.keys()][i] ?? null, getItem: (k) => m.get(k) ?? null, removeItem: (k) => m.delete(k) }
  assert.equal(prunePositions(ls, 12 * 36e5, NOW), 2)
  assert.deepEqual([...m.keys()].sort(), ['hoot:pos-stroom:nos,nrc', 'hoot:prefs'])
})

// ---------- /api/edition: invoer controleren vóór er iets gebeurt ----------

test('/api/edition: geen object, geen JSON, te groot of verkeerde methode is een nette fout', async () => {
  const post = (body) => edition(new Request('http://x/api/edition', { method: 'POST', body }))
  for (const body of ['null', '[]', '"tekst"', '42', 'geen json']) assert.equal((await post(body)).status, 400, body)
  assert.equal((await post('{"a":"' + 'x'.repeat(70000) + '"}')).status, 413)
  assert.equal((await edition(new Request('http://x/api/edition'))).status, 405)
})

// Bluesky-accounts gaan mee met je account; bij de eerste keer samenvoegen blijven die van het toestel erbij.
test('social: samenvoegen bij eerste keer, daarna gaat het account voor', async () => {
  const { SyncEngine } = await import('../src/lib/syncEngine.js')
  const mem = new Map()
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
  let local = { prefs: { social: [{ handle: 'a.bsky.social', name: 'A' }] }, read: [], seen: {}, saved: {} }
  const remote = { prefs: { social: [{ handle: 'b.bsky.social', name: 'B' }] }, read: [], seen: {}, saved: {} }
  const api = { pull: async () => remote, pushState: async () => {}, upsertSaved: async () => {}, deleteSaved: async () => {} }
  const e = new SyncEngine({ uid: 'u1', api, storage, getLocal: () => local, setLocal: (n) => (local = n), schedule: () => 0, cancel: () => {} })
  await e.start()
  assert.deepEqual(local.prefs.social.map((a) => a.handle).sort(), ['a.bsky.social', 'b.bsky.social'])
  remote.prefs.social = [{ handle: 'b.bsky.social', name: 'B' }]
  await e.pull()
  assert.deepEqual(local.prefs.social.map((a) => a.handle), ['b.bsky.social'])
})
