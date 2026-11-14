// Persona's 14 november, punt 8 (keuze van Alex): de taal volgt de bronkeuze ook naar Engels toe. Een lezer die alleen
// Engelse bronnen volgt, kreeg in elke Editie Nederlandse plekken buiten zijn bronnen (Waar iedereen over schrijft, de
// aanvulling, Buiten je bubbel), ook als hetzelfde verhaal in het Engels bij zijn eigen BBC stond. Nu: geen Nederlands
// buiten je bronnen als je geen enkele Nederlandstalige bron volgt; is er in je taal niets, dan geen plek.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal, languageRule } from '../src/lib/personal.js'

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const FEEDS = ['feed-2026-11-05-ochtend', 'live-feed-2026-11-07', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend']

test('de taalregel: Nederlands is leesbaar zodra je één Nederlandstalige bron volgt', () => {
  const sources = [
    { id: 'bbc', cat: 'int', lang: 'en' },
    { id: 'theverge', cat: 'tech', lang: 'en' },
    { id: 'nos', cat: 'nl', lang: 'nl' },
    { id: 'vrt', cat: 'vl', lang: 'nl' },
  ]
  const nos = { id: 'n', source: 'nos', title: 'Kabinet valt' }
  const vrt = { id: 'v', source: 'vrt', title: 'Vlaamse regering valt' }
  const english = languageRule({ followed: new Set(['bbc', 'theverge']), sources })
  assert.equal(english.readable(nos), false, 'alleen Engelse bronnen: geen Nederlands buiten je bronnen')
  assert.equal(english.readable(vrt), false, 'ook geen Vlaams')
  assert.equal(english.readable({ id: 'b', source: 'bbc', title: 'Government falls' }), true, 'je eigen bron')
  const both = languageRule({ followed: new Set(['bbc', 'nos']), sources })
  assert.equal(both.readable(vrt), true, 'één Nederlandstalige bron: Nederlands is leesbaar')
  const none = languageRule({ followed: new Set(), sources })
  assert.equal(none.readable(nos), true, 'zonder bronnen met een taal: zoals altijd')
})

for (const f of FEEDS) {
  test(`${f}: wie alleen Engelse bronnen volgt, krijgt buiten zijn bronnen geen Nederlands`, () => {
    const feed = load(f)
    const now = Date.parse(feed.edition.builtAt)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const lang = new Map(feed.sources.map((s) => [s.id, s.lang]))
    const priya = P.find((p) => p.id === 'priya')
    const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(priya.followed), interests: priya.welkom.interests, topics: priya.prefs.topics || [], now, builtAt: feed.edition.builtAt })
    for (const e of ed?.entries || []) {
      const head = byId.get(e.leadId || e.id)
      if (!head || priya.followed.includes(head.source)) continue
      assert.notEqual(head.lang || lang.get(head.source), 'nl', `${e.desk}: "${head.title}" (${head.source})`)
    }
    // Wie naast Engelse bronnen één Nederlandstalige bron volgt, leest Nederlands zoals altijd: dezelfde Editie als zonder
    // de nieuwe regel voor die lezer.
    const mixed = { ...priya, followed: [...priya.followed, 'nos'] }
    const a = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(mixed.followed), interests: mixed.welkom.interests, topics: mixed.prefs.topics || [], now, builtAt: feed.edition.builtAt })
    assert.ok(a?.entries.some((e) => (byId.get(e.leadId || e.id)?.lang || lang.get(byId.get(e.leadId || e.id)?.source)) === 'nl'), 'met NOS komt er Nederlands in')
  })
}
