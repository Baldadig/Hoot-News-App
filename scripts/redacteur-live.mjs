// Reproduceert de algemene Editie en de beginnerseditie op een bewaarde live feed
// (tests/fixtures/live-feed-2026-11-04.json.gz, opgehaald van https://gethoot.app/api/feed op
// 4 november 2026, 01:50 UTC; de Editie daarin is de Avondeditie van 3 november).
//
//   node scripts/redacteur-live.mjs            tabellen in markdown
//   node scripts/redacteur-live.mjs --json     ruwe uitvoer
//
// Algemene Editie: zoals build.mjs (generalEdition: de persoonlijke Editie met een leeg profiel, Redacteur 3b,
// op alle berichten met de basisbronnen als eigen bronnen), op de berichten die er bij het samenstellen al waren (publishedAt ≤ builtAt). Ook het
// bundelen gaat zoals op de server (uitgebreide stand, met `keys`): de gewone stand liet op de
// verkiezingsnacht van 4 november de Nederlandse uitslagbundel uit elkaar vallen, wat de server niet doet. De feed
// bevat alleen de basisbronnen plus de stukken van verhalen (`related`): losse stukken van andere
// bronnen ontbreken, maar die doen in selectEdition niet mee. Beginnerseditie: zoals het web nu
// rekent (usePersonalEdition): de huidige feed, now = builtAt, de negen basisbronnen, geen keuzes.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { buildStories } from '../netlify/lib/stories.mjs'
import { generalEdition } from '../netlify/lib/build.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { composePersonal } from '../src/lib/personal.js'

export const LIVE_FILE = new URL('../tests/fixtures/live-feed-2026-11-04.json.gz', import.meta.url)
export const loadLive = () => JSON.parse(gunzipSync(readFileSync(LIVE_FILE)).toString('utf8'))

export function liveGeneral(feed = loadLive()) {
  const now = Date.parse(feed.edition.builtAt)
  const all = new Map([...feed.related, ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const articles = [...all.values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now)
  const stories = buildStories(articles, {}, { mainIds: MAIN_IDS, keys: true, extended: true })
  const entries = generalEdition({ stories, pool: articles, now, mainIds: MAIN_IDS })
  return { now, articles, stories, entries, byId: new Map(articles.map((i) => [i.id, i])) }
}

export const beginnerFollowed = (feed) => new Set(feed.sources.filter((s) => s.kind !== 'sociaal' && !s.optional).map((s) => s.id))

export function liveBeginner(feed = loadLive(), extra = {}) {
  const now = Date.parse(feed.edition.builtAt)
  return composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: beginnerFollowed(feed), interests: [], topics: [], now, builtAt: feed.edition.builtAt, previous: null, ...extra })
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (isMain) {
  const feed = loadLive()
  const g = liveGeneral(feed)
  const live = feed.edition.entries
  const itemOf = (id) => g.byId.get(id) || feed.edition.items.find((i) => i.id === id) || feed.items.find((i) => i.id === id)
  const row = (e, k) => {
    const it = itemOf(e.leadId || e.id)
    return `| ${String(k + 1).padStart(2, '0')} | ${e.desk ?? '—'} | ${it?.sourceName || '?'} | ${(it?.title || '?').slice(0, 90)} |`
  }
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ general: g.entries, live, beginner: liveBeginner(feed).entries }, null, 1))
  } else {
    console.log(`## Algemene Editie ${feed.edition.id} (gereproduceerd, now ${feed.edition.builtAt})\n| # | rubriek | bron | kop |\n|---|---|---|---|`)
    g.entries.forEach((e, k) => console.log(row(e, k)))
    const same = g.entries.map((e) => e.leadId || e.id).join() === live.filter((e) => e.desk !== 'bubbel').map((e) => e.leadId || e.id).join()
    console.log(`\nGelijk aan live (zonder bubbel): ${same}`)
    const b = liveBeginner(feed)
    console.log(`\n## Beginnerseditie (9 basisbronnen, geen keuzes)\n| # | rubriek | waarom | bron | kop |\n|---|---|---|---|---|`)
    const bi = new Map(b.items.map((i) => [i.id, i]))
    b.entries.forEach((e, k) => {
      const it = bi.get(e.leadId || e.id)
      console.log(`| ${e.desk === 'bubbel' ? '·' : String(k + 1).padStart(2, '0')} | ${e.desk ?? '—'} | ${e.why?.text} | ${it?.sourceName} | ${(it?.title || '').slice(0, 90)} |`)
    })
  }
}
