// Persona's 14 november, punt 3 (keuze van Alex: groot nieuws gaat voor): plek 01 is groot nieuws of het sterkste stuk
// uit een gekozen interesse, niet vanzelf Binnenland. Wie Binnenland koos, opende elke Editie met het eerste binnenlandse
// stuk, ook een regionaal stuk met één bron boven een wereldwijde storing met 27 bronnen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal } from '../src/lib/personal.js'
import { majorNews } from '../shared/edition-policy.mjs'

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const READERS = [
  { id: 'binnenland-wereld', followed: ['nos', 'nu', 'nrc', 'volkskrant'], interests: ['binnenland', 'wereld'], topics: [] },
  { id: 'binnenland', followed: ['nos', 'nu', 'nrc', 'volkskrant'], interests: ['binnenland'], topics: [] },
  { id: 'binnenland-politiek', followed: ['nos', 'nrc', 'volkskrant', 'parool'], interests: ['binnenland', 'politiek'], topics: [] },
  ...P.map((p) => ({ id: p.id, followed: p.followed, interests: p.welkom.interests, topics: p.prefs.topics || [] })),
]
const FEEDS = ['feed-2026-11-05-ochtend', 'live-feed-2026-11-07', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend']

for (const f of FEEDS) {
  test(`${f}: plek 01 is groot nieuws als er groot nieuws in de Editie staat, of anders een gekozen interesse`, () => {
    const feed = JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
    const now = Date.parse(feed.edition.builtAt)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const storyById = new Map(feed.stories.map((s) => [s.id, s]))
    const FOREIGN = new Set(['buitenland', 'vs', 'middenoosten', 'oekraine'])
    for (const r of READERS) {
      // Zonder Wereld opent buitenlands nieuws niet (31 oktober); dan telt alleen ander groot nieuws.
      const big = (e) => (r.interests.includes('wereld') || !FOREIGN.has(e.desk)) && majorNews(storyById.get(e.id) || e, e.itemIds.map((x) => byId.get(x)).filter(Boolean))
      const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(r.followed), interests: r.interests, topics: r.topics, now, builtAt: feed.edition.builtAt })
      const places = ed.entries.filter((e) => e.desk !== 'bubbel' && e.desk !== 'breed')
      if (places.length < 2) continue
      const first = ed.entries[0]
      const anyBig = (e) => majorNews(storyById.get(e.id) || e, e.itemIds.map((x) => byId.get(x)).filter(Boolean))
      if (anyBig(first)) continue
      if (places.some(big)) {
        // Groot nieuws gaat voor; alleen een kuriositeit of bekend persoon mag uit de top 3 zakken (curiosaDown), dan staat
        // het grote nieuws in elk geval in de top 3.
        assert.ok(ed.entries.slice(0, 3).some(big), `${r.id}: plek 01 "${byId.get(first.leadId || first.id)?.title}" is geen groot nieuws`)
      } else if (r.interests.length && places.some((e) => e._parts?.interest)) {
        assert.ok(first._parts?.interest || first._front || ed.entries.slice(0, 3).some((e) => e._parts?.interest), `${r.id}: plek 01 zonder gekozen interesse`)
      }
    }
  })
}

test('wie Binnenland koos, opent niet vanzelf met Binnenland als er groter nieuws is', () => {
  const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live-feed-2026-11-11-ochtend.json.gz', import.meta.url))).toString('utf8'))
  const now = Date.parse(feed.edition.builtAt)
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const storyById = new Map(feed.stories.map((s) => [s.id, s]))
  const henk = READERS.find((r) => r.id === 'binnenland-wereld')
  const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(henk.followed), interests: henk.interests, topics: henk.topics, now, builtAt: feed.edition.builtAt })
  const first = ed.entries[0]
  assert.ok(majorNews(storyById.get(first.id) || first, first.itemIds.map((x) => byId.get(x)).filter(Boolean)), 'plek 01 is groot nieuws')
  assert.ok(ed.entries.slice(1).some((e) => e.desk === 'binnenland'), 'Binnenland staat er wel, lager')
})
