import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { typeset } from '../shared/typeset.mjs'
import { titleKey } from '../shared/dedupe.mjs'
import { normTitle } from '../netlify/lib/text.mjs'
import { loadSource } from '../netlify/lib/rss.mjs'
import { buildStories } from '../netlify/lib/stories.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'
import { VAK_SOURCES } from '../netlify/lib/vak.mjs'
import { feedLang } from '../netlify/lib/vakBronnen.mjs'

// Eén typografische hand (T6 stap 2, D3). De gevallen staan in een fixture die iOS ook leest (I5),
// zodat de lezer-kop op het toestel net zo gezet wordt als de koppen van de server.
const fx = JSON.parse(readFileSync(new URL('./fixtures/typeset.json', import.meta.url), 'utf8'))

for (const c of fx.typeset) {
  test(`typeset: ${c.naam}`, () => {
    assert.equal(typeset(c.invoer, c.lang), c.verwacht)
    assert.equal(typeset(c.verwacht, c.lang), c.verwacht, 'twee keer zetten = één keer')
  })
}

test('typeset laat lege en niet-tekst-waarden staan', () => {
  assert.equal(typeset('', 'nl'), '')
  assert.equal(typeset(null, 'nl'), null)
  assert.equal(typeset(undefined, 'en'), undefined)
})

// Echte koppen en intro's: zetten is idempotent, en de sleutels waarop ontdubbeld en geclusterd
// wordt veranderen niet. Bundels uit de clustering-fixtures blijven precies dezelfde.
const LANG = new Map(SOURCES.map((s) => [s.id, s.lang]))
const days = ['2210', '2610', '2810', '2910', '3010'].map((d) => JSON.parse(readFileSync(new URL(`./fixtures/clustering-${d}.json`, import.meta.url), 'utf8')))
const snapshot = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/snapshot-2026-10-30-avond.json.gz', import.meta.url))).toString('utf8'))
const snapItems = Array.isArray(snapshot) ? snapshot : snapshot.items || []
const set = (it) => ({ ...it, title: typeset(it.title, LANG.get(it.source)), summary: typeset(it.summary, LANG.get(it.source)), text: typeset(it.text, LANG.get(it.source)) })

test('typeset op echte koppen: idempotent, normTitle en titleKey ongewijzigd', () => {
  const all = [...days.flat(), ...snapItems].filter((it) => typeof it.title === 'string')
  assert.ok(all.length > 500, 'genoeg echte koppen')
  for (const it of all) {
    const lang = LANG.get(it.source)
    const once = typeset(it.title, lang)
    assert.equal(typeset(once, lang), once, it.title)
    assert.equal(normTitle(once), normTitle(it.title), it.title)
    assert.equal(titleKey(once), titleKey(it.title), it.title)
  }
})

test('typeset verandert de bundels niet', () => {
  for (const items of days) {
    const ids = (list) => buildStories(list).map((s) => [...s.itemIds].sort().join(',')).sort()
    assert.deepEqual(ids(items.map(set)), ids(items))
  }
})

test('loadSource zet kop en intro in de taal van de bron', async () => {
  const FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title>
<item><title>Christa Pike: 'Ik heb constant pijn'</title><link>https://example.org/a?x=1-2</link><description>Patrick Stewart (1940-2026) zei het al...</description></item>
</channel></rss>`
  const origFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(FEED, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    const nl = await loadSource({ id: 'test', name: 'Test', cat: 'nieuws', lang: 'nl', urls: ['https://example.org/feed'] }, Promise.resolve({}))
    assert.equal(nl.items[0].title, 'Christa Pike: ‘Ik heb constant pijn’')
    assert.equal(nl.items[0].summary, 'Patrick Stewart (1940–2026) zei het al…')
    assert.equal(nl.items[0].url, 'https://example.org/a?x=1-2')
    const de = await loadSource({ id: 'test', name: 'Test', cat: 'nieuws', lang: 'de', urls: ['https://example.org/feed'] }, Promise.resolve({}))
    assert.equal(de.items[0].title, "Christa Pike: 'Ik heb constant pijn'")
  } finally {
    globalThis.fetch = origFetch
  }
})

// De drie secties zijn gelijk: ook de Selectie krijgt gezette koppen. typeset() laat alles zonder
// nl of en letterlijk, dus elke bron van Editie, Stroom en Selectie moet een van die twee hebben.
test('bronnen hebben een hoofdtaal; Verfassungsblog blijft bewust meertalig', () => {
  const zonder = [...SOURCES, ...VAK_SOURCES].filter((s) => !['nl', 'en'].includes(s.lang)).map((s) => s.id)
  assert.deepEqual(zonder, ['vak:verfassungsblog'])
  assert.equal(feedLang('https://www.tijd.be/rss/nieuws.xml'), 'nl')
  assert.equal(feedLang('https://www.gemeente.nu/feed/'), 'nl')
  assert.equal(feedLang('https://www.prdaily.com/feed/'), 'en')
})

test('loadSource zet ook de koppen van een vakbron (Selectie)', async () => {
  const FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>Vak</title>
<item><title>Lars Postmus (Draft Digital): 'Emotie werkt ook op performance'</title><link>https://example.org/v</link><description>Google's AI-modus...</description></item>
</channel></rss>`
  const origFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(FEED, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    const nl = VAK_SOURCES.find((s) => s.id === 'vak:logeion')
    const en = VAK_SOURCES.find((s) => s.id === 'vak:prdaily')
    for (const src of [nl, en]) {
      const r = await loadSource(src, Promise.resolve({}))
      assert.equal(r.items[0].title, 'Lars Postmus (Draft Digital): ‘Emotie werkt ook op performance’', src.id)
      assert.equal(r.items[0].summary, 'Google’s AI-modus…', src.id)
    }
  } finally {
    globalThis.fetch = origFetch
  }
})
