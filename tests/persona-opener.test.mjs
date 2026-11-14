// Persona's 14 november, tweede keuring: een video of podcast is nooit plek 01. Eén regel (opensEdition in
// shared/aflevering.mjs) samen met die van main dat een podcast nooit de kop van een plek is (audioEpisode); een video
// mag de kop van een verhaal zijn, maar opent de Editie niet. openWithNews past hem toe, voor de algemene en de
// persoonlijke Editie. Op de feeds opende de persoonlijke Editie zes keer met een video (Al Jazeera, RTL).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal } from '../src/lib/personal.js'
import { openWithNews } from '../netlify/lib/stories.mjs'
import { opensEdition } from '../shared/aflevering.mjs'
import { resolveTopics } from '../src/lib/topics.js'

test('opensEdition: video, podcast en luisterlabel openen niet; gewoon nieuws wel', () => {
  assert.ok(!opensEdition({ title: 'Trump in interview', url: 'https://www.rtl.nl/nieuws/video/123/trump' }))
  assert.ok(!opensEdition({ title: 'Seven flights targeted', url: 'https://www.aljazeera.com/video/newsfeed/2026/11/4/x' }))
  assert.ok(!opensEdition({ title: 'Podcast: De Dag', url: 'https://nos.nl/l/1' }))
  assert.ok(!opensEdition({ title: 'Een gesprek', url: 'https://x.nl/a', mediaType: 'audio/mpeg', summary: 'Een eigen intro van genoeg woorden hier.' }))
  assert.ok(opensEdition({ title: 'Kabinet valt over stikstof', url: 'https://nos.nl/artikel/1' }))
  assert.ok(opensEdition(undefined))
})

test('openWithNews: een video-kop wordt het nieuwsstuk van hetzelfde verhaal; alleen video schuift door', () => {
  const items = new Map([
    ['v1', { id: 'v1', title: 'Republicans fuming', url: 'https://www.aljazeera.com/video/x/1' }],
    ['n1', { id: 'n1', title: 'Democrat flips Texas Senate seat', url: 'https://nos.nl/artikel/1' }],
    ['v2', { id: 'v2', title: 'Kijk: de storm', url: 'https://www.rtl.nl/nieuws/video/2' }],
    ['n2', { id: 'n2', title: 'Storm raast over het land', url: 'https://nos.nl/artikel/2' }],
  ])
  const itemsOf = (e) => (e.itemIds || [e.id]).map((x) => items.get(x))
  const pick = (xs) => xs[0]
  const a = openWithNews([{ kind: 'story', id: 's1', leadId: 'v1', itemIds: ['v1', 'n1'] }], { itemsOf, pick })
  assert.equal(a[0].leadId, 'n1')
  const b = openWithNews([{ kind: 'item', id: 'v2' }, { kind: 'item', id: 'n2' }], { itemsOf, pick })
  assert.equal(b[0].id, 'n2')
  // Alleen afleveringen: dan zoals voorheen.
  const c = openWithNews([{ kind: 'item', id: 'v2' }], { itemsOf, pick })
  assert.equal(c[0].id, 'v2')
})

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const readers = [
  ...P.map((p) => ({ id: p.id, followed: p.followed, interests: p.welkom.interests, topics: p.prefs.topics || [] })),
  { id: 'us-pol-wereld', followed: ['nyt', 'politico', 'guardian', 'bbc', 'atlantic'], interests: ['politiek', 'wereld'] },
  { id: 'us-pol-only', followed: ['nyt', 'politico', 'atlantic', 'guardian'], interests: ['politiek'] },
]
for (const f of ['live-feed-2026-11-04-midterms', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend', 'feed-2026-11-05-ochtend']) {
  test(`${f}: plek 01 is nooit een video of podcast`, () => {
    const feed = load(f)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    for (const r of readers) {
      const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(r.followed), interests: r.interests, topics: r.topics ?? resolveTopics(r.interests, []), now: Date.parse(feed.edition.builtAt), builtAt: feed.edition.builtAt })
      if (!ed?.entries.length) continue
      const head = byId.get(ed.entries[0].leadId || ed.entries[0].id)
      assert.ok(opensEdition(head), `${r.id}: ${head?.source} "${head?.title}"`)
    }
  })
}
