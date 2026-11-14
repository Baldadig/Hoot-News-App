// Persona's 14 november, tweede keuring (punt 10): buiten je bronnen alleen gratis. Wat de bubbel al eiste, geldt voor elke
// kop van een bron die je niet volgt: de basis uit de algemene Editie, de aanvulling, Waar iedereen over schrijft. Jan, die
// alleen gratis wil en niets koos, kreeg vijf betaalde plekken (de Volkskrant, NRC, Het Parool, het ND). Een betaalde bron
// die je volgt, blijft.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal } from '../src/lib/personal.js'

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const FEEDS = ['feed-2026-11-05-ochtend', 'live-feed-2026-11-04', 'live-feed-2026-11-07', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend', 'live-feed-2026-11-04-midterms']

for (const f of FEEDS) {
  test(`${f}: geen betaalde kop van een bron die je niet volgt, bij geen enkele persona`, () => {
    const feed = load(f)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const paid = new Set(feed.sources.filter((s) => s.paid).map((s) => s.id))
    for (const p of P) {
      const followed = new Set(p.followed)
      const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed, interests: p.welkom.interests, topics: p.prefs.topics || [], now: Date.parse(feed.edition.builtAt), builtAt: feed.edition.builtAt })
      if (!ed) continue
      for (const e of ed.entries) {
        const head = byId.get(e.leadId || e.id)
        if (head && !followed.has(head.source)) assert.ok(!paid.has(head.source), `${p.id}: ${head.source} "${head.title}"`)
      }
    }
  })
}

test('een betaalde bron die je volgt, blijft de kop', () => {
  const feed = load('live-feed-2026-11-07')
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const maarten = P.find((p) => p.id === 'maarten')
  const followed = new Set(maarten.followed)
  const paid = new Set(feed.sources.filter((s) => s.paid).map((s) => s.id))
  const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed, interests: maarten.welkom.interests, topics: maarten.prefs.topics, now: Date.parse(feed.edition.builtAt), builtAt: feed.edition.builtAt })
  assert.ok(ed.entries.some((e) => paid.has(byId.get(e.leadId || e.id)?.source)), 'Maarten volgt NRC, de Volkskrant en de NYT en krijgt die als kop')
})
